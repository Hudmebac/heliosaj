import type { UserSettings, ManualDayForecast, ManualForecastCondition, propertyDirectionOptions } from '@/types/settings';
import type { DailyWeather } from '@/types/weather';
import { mapWmoCodeToManualForecastCondition } from '@/types/weather';

export interface HourlyForecast {
  time: string; // HH:MM format
  estimatedGenerationWh: number;
}

export interface CalculatedForecast {
  date: string;
  weatherCondition: string; 
  dailyTotalGenerationKWh: number;
  hourlyForecast: HourlyForecast[];
  errorMessage: string | null;
  tempMax?: number;
  tempMin?: number;
  precipitationSum?: number;
  sunshineDurationHours?: number; 
}

const BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER = 5; 

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
    
    // Safely access sunrise/sunset, accounting for different input types
    let sunriseString: string | undefined;
    let sunsetString: string | undefined;

    if ('condition' in dayForecastInput) { // ManualDayForecast
        sunriseString = dayForecastInput.sunrise;
        sunsetString = dayForecastInput.sunset;
    } else { // DailyWeather
        sunriseString = (dayForecastInput as DailyWeather).sunrise ? new Date((dayForecastInput as DailyWeather).sunrise!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined;
        sunsetString = (dayForecastInput as DailyWeather).sunset ? new Date((dayForecastInput as DailyWeather).sunset!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined;
    }


    if (!sunriseString || !sunsetString) {
        return {
            date: dayForecastInput.date,
            weatherCondition: ('condition' in dayForecastInput ? dayForecastInput.condition : (dayForecastInput as DailyWeather).weatherConditionString) || 'unknown',
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Sunrise or sunset time not available in forecast data.",
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
    
    // propertyDirectionFactor should be directly from settings if it exists, otherwise fallback to lookup.
    const directionFactor = settings.propertyDirectionFactor ?? 1.0;


    const currentDate = new Date(dayForecastInput.date + "T12:00:00Z"); 
    const currentMonth = currentDate.getUTCMonth(); 

    let effectivePeakSunHours: number;
    let actualSunshineDurationHours: number | undefined = undefined;
    const outputWeatherConditionString = ('condition' in dayForecastInput)
        ? dayForecastInput.condition.replace(/_/g, ' ')
        : ((dayForecastInput as DailyWeather).weatherConditionString || 'unknown');

    if (settings.selectedWeatherSource === 'open-meteo' && 'weather_code' in dayForecastInput && (dayForecastInput as DailyWeather).sunshine_duration !== undefined && (dayForecastInput as DailyWeather).sunshine_duration !== null) {
        actualSunshineDurationHours = (dayForecastInput as DailyWeather).sunshine_duration! / 3600; 
        
        let conditionRefinementFactor = 1.0;
        const apiCondition = mapWmoCodeToManualForecastCondition((dayForecastInput as DailyWeather).weather_code);
        
        if (apiCondition === 'rainy') conditionRefinementFactor = 0.4; 
        else if (apiCondition === 'overcast') conditionRefinementFactor = 0.6;
        else if (apiCondition === 'cloudy') conditionRefinementFactor = 0.8; // For cloudy days, sunshine_duration might still be non-zero but PV less effective.

        effectivePeakSunHours = actualSunshineDurationHours * conditionRefinementFactor;

    } else if (settings.selectedWeatherSource === 'manual' && 'condition' in dayForecastInput) {
        const userMonthlyFactors = settings.monthlyGenerationFactors && settings.monthlyGenerationFactors.length === 12 
            ? settings.monthlyGenerationFactors 
            : Array(12).fill(1.0);
        const currentMonthlyFactor = userMonthlyFactors[currentMonth] ?? 1.0;

        const conditionFactors: Record<ManualForecastCondition, number> = {
            sunny: 1.0,
            partly_cloudy: 0.75,
            cloudy: 0.5,
            overcast: 0.25,
            rainy: 0.15,
        };
        const manualWeatherFactor = conditionFactors[dayForecastInput.condition] ?? 0.6;

        effectivePeakSunHours = BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER * currentMonthlyFactor * manualWeatherFactor;
    } else {
        // Fallback for any other source or incomplete data
        const genericMonthlyFactors = Array(12).fill(1.0); // Neutral monthly effect
        const currentMonthlyFactor = genericMonthlyFactors[currentMonth];
        effectivePeakSunHours = BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER * currentMonthlyFactor * 0.5; // Assume 'cloudy' as a generic fallback
    }
    
    let dailyTotalGenerationKWh = totalSystemKWp * effectivePeakSunHours * directionFactor * systemEfficiency;
    dailyTotalGenerationKWh = Math.max(0, dailyTotalGenerationKWh);

    const peakHourSolarNoon = sunriseHour + daylightHours / 2;
    
    for (let hour = 0; hour < 24; hour++) {
      let estimatedGenerationWh = 0;
      if (hour >= Math.floor(sunriseHour) && hour < Math.ceil(sunsetHour) && daylightHours > 0) {
        const proximityToNoonFactor = 1 - Math.abs(hour + 0.5 - peakHourSolarNoon) / (daylightHours / 2);
        // Using a power of 1.5 for a slightly flatter peak than power 2, but still peaked.
        let hourlyGenerationFactor = Math.pow(Math.max(0, proximityToNoonFactor), 1.5); 

        // This scaling was problematic. Let's distribute dailyTotalGenerationKWh based on factors.
        // The sum of these factors needs to be calculated to normalize.
        // For now, this part will be done after the loop.
        estimatedGenerationWh = hourlyGenerationFactor; // Store the factor first
      }
      hourlyForecast.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        estimatedGenerationWh: estimatedGenerationWh, // Temporarily store factor
      });
    }
    
    const sumOfHourlyFactors = hourlyForecast.reduce((sum, hf) => sum + hf.estimatedGenerationWh, 0);

    if (sumOfHourlyFactors > 0.001 && dailyTotalGenerationKWh > 0) { 
        const totalGenerationWh = dailyTotalGenerationKWh * 1000;
        hourlyForecast.forEach(hf => {
            // Distribute total Wh based on each hour's factor proportion
            hf.estimatedGenerationWh = parseFloat(((hf.estimatedGenerationWh / sumOfHourlyFactors) * totalGenerationWh).toFixed(3));
        });
    } else { 
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
