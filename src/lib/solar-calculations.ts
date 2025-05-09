import type { UserSettings, ManualDayForecast, propertyDirectionOptions } from '@/types/settings';
import type { DailyWeather, ManualForecastCondition } from '@/types/weather'; // Import DailyWeather & ManualForecastCondition
import { mapWmoCodeToManualForecastCondition } from '@/types/weather'; // Ensure this is imported

export interface HourlyForecast {
  time: string; // HH:MM format
  estimatedGenerationWh: number;
}

export interface CalculatedForecast {
  date: string;
  weatherCondition: string; // User-friendly weather condition string
  dailyTotalGenerationKWh: number;
  hourlyForecast: HourlyForecast[];
  errorMessage: string | null;
  // Add fields from Open-Meteo that might be useful for display
  tempMax?: number;
  tempMin?: number;
  precipitationSum?: number;
  sunshineDurationHours?: number; // Actual sunshine duration used, if available
}

const BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER = 5; // Baseline for a perfect, long summer day before other factors

export function calculateSolarGeneration(
  dayForecastInput: ManualDayForecast | DailyWeather,
  settings: UserSettings
): CalculatedForecast {
  const hourlyForecast: HourlyForecast[] = [];

  try {
    if (!settings || typeof settings.totalKWp !== 'number' || settings.totalKWp <= 0) {
      return {
        date: dayForecastInput.date,
        weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || 'unknown',
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Total system power (kWp) not configured or invalid in settings.",
      };
    }
    
    const sunriseString = ('sunrise' in dayForecastInput && typeof dayForecastInput.sunrise === 'string') ? dayForecastInput.sunrise : undefined;
    const sunsetString = ('sunset' in dayForecastInput && typeof dayForecastInput.sunset === 'string') ? dayForecastInput.sunset : undefined;

    if (!sunriseString || !sunsetString) {
        return {
            date: dayForecastInput.date,
            weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || 'unknown',
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Sunrise or sunset time not set in forecast.",
        };
    }

    const [sunriseHour, sunriseMinute] = sunriseString.split(':').map(Number);
    const [sunsetHour, sunsetMinute] = sunsetString.split(':').map(Number);

    if (isNaN(sunriseHour) || isNaN(sunriseMinute) || isNaN(sunsetHour) || isNaN(sunsetMinute)) {
        return {
            date: dayForecastInput.date,
            weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || 'unknown',
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Invalid sunrise or sunset time format.",
        };
    }
    
    const sunriseTotalMinutes = sunriseHour * 60 + sunriseMinute;
    const sunsetTotalMinutes = sunsetHour * 60 + sunsetMinute;

    if (sunsetTotalMinutes <= sunriseTotalMinutes) {
      return {
        date: dayForecastInput.date,
        weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || 'unknown',
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Sunset time must be after sunrise time.",
      };
    }

    let daylightHours = (sunsetTotalMinutes - sunriseTotalMinutes) / 60;
    if (daylightHours <= 0) daylightHours = 0;

    const totalSystemKWp = settings.totalKWp;
    const systemEfficiency = settings.systemEfficiency ?? 0.85;
    
    const directionFactor = settings.propertyDirectionFactor ?? 
      (propertyDirectionOptions.find(opt => opt.value === settings.propertyDirection)?.factor) ?? 
      1.0;

    const currentDate = new Date(dayForecastInput.date + "T12:00:00Z"); 
    const currentMonth = currentDate.getUTCMonth(); 

    let monthlyFactor: number;
    if (settings.selectedWeatherSource === 'manual') {
        const userMonthlyFactors = settings.monthlyGenerationFactors && settings.monthlyGenerationFactors.length === 12 
            ? settings.monthlyGenerationFactors 
            : Array(12).fill(1.0); // Default to 1.0 if manual but not set
        monthlyFactor = userMonthlyFactors[currentMonth] ?? 1.0;
    } else {
        // For API sources like Open-Meteo, seasonal variations are part of the data (e.g. sunshine_duration)
        // So, the monthlyFactor here should be neutral (1.0) as not to double-count seasonality.
        monthlyFactor = 1.0;
    }

    let weatherAdjustmentFactor: number;
    let actualSunshineDurationHours: number | undefined = undefined;
    const outputWeatherConditionString = ('condition' in dayForecastInput)
        ? dayForecastInput.condition.replace(/_/g, ' ')
        : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';


    if (settings.selectedWeatherSource === 'open-meteo' && 'sunshine_duration' in dayForecastInput && typeof (dayForecastInput as DailyWeather).sunshine_duration === 'number') {
      actualSunshineDurationHours = (dayForecastInput as DailyWeather).sunshine_duration! / 3600; // API gives seconds
      weatherAdjustmentFactor = daylightHours > 0 ? Math.min(1, actualSunshineDurationHours / daylightHours) : 0;
      
      const apiCondition = mapWmoCodeToManualForecastCondition((dayForecastInput as DailyWeather).weather_code);
      if (apiCondition === 'rainy') weatherAdjustmentFactor *= 0.4; // Further reduce for rain
      else if (apiCondition === 'overcast') weatherAdjustmentFactor *= 0.6; // Further reduce for overcast
      else if (apiCondition === 'cloudy') weatherAdjustmentFactor *= 0.8; // Slightly reduce for general cloudy

    } else {
      const conditionFactors: Record<ManualForecastCondition, number> = {
        sunny: 1.0,
        partly_cloudy: 0.75,
        cloudy: 0.5,
        overcast: 0.25,
        rainy: 0.15,
      };
      let conditionKey: ManualForecastCondition;
      if ('condition' in dayForecastInput) { // ManualDayForecast
          conditionKey = dayForecastInput.condition;
      } else { // DailyWeather (but not using sunshine_duration path)
          conditionKey = mapWmoCodeToManualForecastCondition((dayForecastInput as DailyWeather).weather_code);
      }
      weatherAdjustmentFactor = conditionFactors[conditionKey] ?? 0.6;
    }
    
    const effectivePeakSunHours = BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER * monthlyFactor * weatherAdjustmentFactor;
    
    let dailyTotalGenerationKWh = totalSystemKWp * effectivePeakSunHours * directionFactor * systemEfficiency;
    dailyTotalGenerationKWh = Math.max(0, dailyTotalGenerationKWh);

    const peakHourSolarNoon = sunriseHour + daylightHours / 2;
    
    for (let hour = 0; hour < 24; hour++) {
      let estimatedGenerationWh = 0;
      if (hour >= Math.floor(sunriseHour) && hour < Math.ceil(sunsetHour) && daylightHours > 0) {
        const proximityToNoonFactor = 1 - Math.abs(hour + 0.5 - peakHourSolarNoon) / (daylightHours / 2);
        let hourlyGenerationFactor = Math.pow(Math.max(0, proximityToNoonFactor), 1.5); // Adjusted power for smoother curve

        const averageHourlyGenerationWh = (dailyTotalGenerationKWh * 1000) / daylightHours;
        estimatedGenerationWh = averageHourlyGenerationWh * hourlyGenerationFactor * (daylightHours / BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER); // A more dynamic scaling
        estimatedGenerationWh = Math.max(0, estimatedGenerationWh);
      }
      hourlyForecast.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        estimatedGenerationWh: parseFloat(estimatedGenerationWh.toFixed(3)),
      });
    }
    
    const currentHourlySumWh = hourlyForecast.reduce((sum, hf) => sum + hf.estimatedGenerationWh, 0);
    if (currentHourlySumWh > 0.001 && dailyTotalGenerationKWh > 0) { 
        const normalizationFactor = (dailyTotalGenerationKWh * 1000) / currentHourlySumWh;
        hourlyForecast.forEach(hf => {
            hf.estimatedGenerationWh = parseFloat((hf.estimatedGenerationWh * normalizationFactor).toFixed(3));
        });
    } else if (dailyTotalGenerationKWh <= 0.001) { 
         hourlyForecast.forEach(hf => {
            hf.estimatedGenerationWh = 0;
        });
    }

    return {
      date: dayForecastInput.date,
      weatherCondition: outputWeatherConditionString,
      dailyTotalGenerationKWh: parseFloat(dailyTotalGenerationKWh.toFixed(2)),
      hourlyForecast,
      errorMessage: null,
      tempMax: 'temperature_2m_max' in dayForecastInput ? (dayForecastInput as DailyWeather).temperature_2m_max : undefined,
      tempMin: 'temperature_2m_min' in dayForecastInput ? (dayForecastInput as DailyWeather).temperature_2m_min : undefined,
      precipitationSum: 'precipitation_sum' in dayForecastInput ? (dayForecastInput as DailyWeather).precipitation_sum : undefined,
      sunshineDurationHours: actualSunshineDurationHours,
    };

  } catch (error: any) {
    console.error("Error in calculateSolarGeneration:", error);
    return {
      date: dayForecastInput.date,
      weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || "unknown",
      dailyTotalGenerationKWh: 0,
      hourlyForecast: [],
      errorMessage: `Calculation error: ${error.message}`,
    };
  }
}
