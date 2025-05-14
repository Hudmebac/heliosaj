
import type { UserSettings, ManualDayForecast, ManualForecastCondition } from '@/types/settings';
import type { DailyWeather } from '@/types/weather';
import { mapWmoCodeToManualForecastCondition } from '@/types/weather';
import { format, parseISO, isValid, parse } from 'date-fns';

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
      const conditionString = 'condition' in dayForecastInput
        ? dayForecastInput.condition
        : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';
      return {
        date: dayForecastInput.date,
        weatherCondition: conditionString.replace(/_/g, ' '),
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Total system power (kWp) not configured or invalid in settings.",
      };
    }

    let sunriseString: string | undefined;
    let sunsetString: string | undefined;
    let weatherConditionForCalc: ManualForecastCondition;
    let sunshineDurationForCalc: number | undefined = undefined;
    // let wmoCodeForCalc: number | undefined = undefined; // Not explicitly used after mapping
    let apiWeatherConditionString: string | undefined;

    if ('condition' in dayForecastInput) { // ManualDayForecast
        sunriseString = dayForecastInput.sunrise;
        sunsetString = dayForecastInput.sunset;
        weatherConditionForCalc = dayForecastInput.condition;
    } else { // DailyWeather from API
        const apiDayData = dayForecastInput as DailyWeather;
        // Ensure sunrise/sunset from API are valid ISO strings before formatting
        const tryFormatISO = (dateString: string | undefined, timeFormat: string = 'HH:mm') => {
          if (!dateString) return undefined;
          try {
            const parsedDate = parseISO(dateString);
            if (isValid(parsedDate)) {
              return format(parsedDate, timeFormat);
            }
            // Attempt to parse if it's just HH:mm already
            const parsedTime = parse(dateString, 'HH:mm', new Date());
            if(isValid(parsedTime)) return dateString;

          } catch (e) {
            console.warn(`Invalid date string for formatting: ${dateString}`, e);
          }
          return undefined;
        };

        sunriseString = tryFormatISO(apiDayData.sunrise);
        sunsetString = tryFormatISO(apiDayData.sunset);
        weatherConditionForCalc = mapWmoCodeToManualForecastCondition(apiDayData.weather_code);
        sunshineDurationForCalc = apiDayData.sunshine_duration !== undefined && apiDayData.sunshine_duration !== null ? apiDayData.sunshine_duration / 3600 : undefined;
        // wmoCodeForCalc = apiDayData.weather_code;
        apiWeatherConditionString = apiDayData.weatherConditionString;
    }


    if (!sunriseString || !sunsetString) {
        const conditionString = 'condition' in dayForecastInput
            ? dayForecastInput.condition
            : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';
        return {
            date: dayForecastInput.date,
            weatherCondition: conditionString.replace(/_/g, ' '),
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Sunrise or sunset time not available in forecast data.",
        };
    }

    const [sunriseHour, sunriseMinute] = sunriseString.split(':').map(Number);
    const [sunsetHour, sunsetMinute] = sunsetString.split(':').map(Number);

    if (isNaN(sunriseHour) || isNaN(sunriseMinute) || isNaN(sunsetHour) || isNaN(sunsetMinute)) {
         const conditionString = 'condition' in dayForecastInput
            ? dayForecastInput.condition
            : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';
        return {
            date: dayForecastInput.date,
            weatherCondition: conditionString.replace(/_/g, ' '),
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Invalid sunrise or sunset time format.",
        };
    }

    const sunriseTotalMinutes = sunriseHour * 60 + sunriseMinute;
    const sunsetTotalMinutes = sunsetHour * 60 + sunsetMinute;

    if (sunsetTotalMinutes <= sunriseTotalMinutes) {
      const conditionString = 'condition' in dayForecastInput
            ? dayForecastInput.condition
            : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';
      return {
        date: dayForecastInput.date,
        weatherCondition: conditionString.replace(/_/g, ' '),
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Sunset time must be after sunrise time.",
      };
    }

    let daylightHours = (sunsetTotalMinutes - sunriseTotalMinutes) / 60;
    if (daylightHours <= 0) daylightHours = 0;

    const totalSystemKWp = settings.totalKWp;
    const systemEfficiency = settings.systemEfficiency ?? 0.85;
    const directionFactor = settings.propertyDirectionFactor ?? 1.0;

    // Ensure date parsing is robust for getUTCMonth
    let currentMonth: number;
    try {
        // Assuming dayForecastInput.date is 'YYYY-MM-DD'
        const dateObj = parseISO(dayForecastInput.date + "T12:00:00Z"); // Add time and Z for UTC
        if (!isValid(dateObj)) {
            throw new Error("Invalid date string for month calculation");
        }
        currentMonth = dateObj.getUTCMonth();
    } catch (e) {
        console.error("Error parsing date for month calculation:", dayForecastInput.date, e);
        currentMonth = new Date().getUTCMonth(); // Fallback to current month
    }


    let effectivePeakSunHours: number;

    // Determine weather condition string for the output
    const outputWeatherConditionString = ('condition' in dayForecastInput)
        ? weatherConditionForCalc.replace(/_/g, ' ')
        : (apiWeatherConditionString || 'unknown');

    if (settings.selectedWeatherSource === 'open-meteo' && sunshineDurationForCalc !== undefined) {
        let conditionRefinementFactor = 1.0;
        if (weatherConditionForCalc === 'rainy') conditionRefinementFactor = 0.4;
        else if (weatherConditionForCalc === 'overcast') conditionRefinementFactor = 0.6;
        else if (weatherConditionForCalc === 'cloudy') conditionRefinementFactor = 0.8;
        effectivePeakSunHours = sunshineDurationForCalc * conditionRefinementFactor;
    } else { 
        const userMonthlyFactors = (settings.selectedWeatherSource === 'manual' && settings.monthlyGenerationFactors && settings.monthlyGenerationFactors.length === 12)
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
        const manualWeatherFactor = conditionFactors[weatherConditionForCalc] ?? 0.6;
        effectivePeakSunHours = BASE_PEAK_SUN_HOURS_PER_DAY_IDEAL_SUMMER * currentMonthlyFactor * manualWeatherFactor;
    }

    let dailyTotalGenerationKWh = totalSystemKWp * effectivePeakSunHours * directionFactor * systemEfficiency;
    dailyTotalGenerationKWh = Math.max(0, dailyTotalGenerationKWh);

    // If the source is Open-Meteo, divide the result by 2.5
    if (settings.selectedWeatherSource === 'open-meteo') {
        dailyTotalGenerationKWh = dailyTotalGenerationKWh / 2.5;
    }


    const peakHourSolarNoon = sunriseHour + daylightHours / 2;

    // Generate hourly forecasts only between sunrise and sunset
    const startHour = Math.floor(sunriseHour);
    const endHour = Math.ceil(sunsetHour);

    for (let hour = startHour; hour < endHour; hour++) {
      let estimatedGenerationWh = 0;
      const proximityToNoonFactor = 1 - Math.abs(hour + 0.5 - peakHourSolarNoon) / (daylightHours / 2);
      // Using Math.pow with 1.5 creates a more realistic bell curve than 2
      estimatedGenerationWh = Math.pow(Math.max(0, proximityToNoonFactor), 1.5);
      hourlyForecast.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        estimatedGenerationWh: estimatedGenerationWh, 
      });
    }

    const sumOfHourlyFactors = hourlyForecast.reduce((sum, hf) => sum + hf.estimatedGenerationWh, 0);

    if (sumOfHourlyFactors > 0.001 && dailyTotalGenerationKWh > 0) {
        const totalGenerationWh = dailyTotalGenerationKWh * 1000;
        hourlyForecast.forEach(hf => {
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
      sunshineDurationHours: sunshineDurationForCalc,
    };

  } catch (error: any) {
    console.error("Error in calculateSolarGeneration:", error);
    const conditionString = 'condition' in dayForecastInput
            ? dayForecastInput.condition
            : (dayForecastInput as DailyWeather).weatherConditionString || 'unknown';
    return {
      date: dayForecastInput.date,
      weatherCondition: conditionString.replace(/_/g, ' '),
      dailyTotalGenerationKWh: 0,
      hourlyForecast: [],
      errorMessage: `Calculation error: ${error.message}`,
    };
  }
}

