import type { UserSettings, ManualDayForecast, propertyDirectionOptions } from '@/types/settings';

export interface HourlyForecast {
  time: string; // HH:MM format
  estimatedGenerationWh: number;
}

export interface CalculatedForecast {
  date: string;
  weatherCondition: string; // Now always a string, derived from ManualDayForecast['condition']
  dailyTotalGenerationKWh: number;
  hourlyForecast: HourlyForecast[];
  errorMessage: string | null;
}

const BASE_PEAK_SUN_HOURS = 4; // Assume a baseline of 4 peak sun hours for a "standard" good day before other factors.

export function calculateSolarGeneration(
  manualDayForecast: ManualDayForecast,
  settings: UserSettings
): CalculatedForecast {
  const hourlyForecast: HourlyForecast[] = [];

  try {
    if (!settings || typeof settings.totalKWp !== 'number' || settings.totalKWp <= 0) {
      return {
        date: manualDayForecast.date,
        weatherCondition: manualDayForecast.condition,
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Total system power (kWp) not configured or invalid in settings.",
      };
    }

    if (!manualDayForecast.sunrise || !manualDayForecast.sunset) {
        return {
            date: manualDayForecast.date,
            weatherCondition: manualDayForecast.condition,
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Sunrise or sunset time not set in manual forecast.",
        };
    }

    const [sunriseHour, sunriseMinute] = manualDayForecast.sunrise.split(':').map(Number);
    const [sunsetHour, sunsetMinute] = manualDayForecast.sunset.split(':').map(Number);

    if (isNaN(sunriseHour) || isNaN(sunriseMinute) || isNaN(sunsetHour) || isNaN(sunsetMinute)) {
        return {
            date: manualDayForecast.date,
            weatherCondition: manualDayForecast.condition,
            dailyTotalGenerationKWh: 0,
            hourlyForecast: [],
            errorMessage: "Invalid sunrise or sunset time format.",
        };
    }
    
    const sunriseTotalMinutes = sunriseHour * 60 + sunriseMinute;
    const sunsetTotalMinutes = sunsetHour * 60 + sunsetMinute;

    if (sunsetTotalMinutes <= sunriseTotalMinutes) {
      return {
        date: manualDayForecast.date,
        weatherCondition: manualDayForecast.condition,
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "Sunset time must be after sunrise time.",
      };
    }

    const daylightHours = (sunsetTotalMinutes - sunriseTotalMinutes) / 60;
    if (daylightHours <= 0) {
      return {
        date: manualDayForecast.date,
        weatherCondition: manualDayForecast.condition,
        dailyTotalGenerationKWh: 0,
        hourlyForecast: [],
        errorMessage: "No daylight hours based on sunrise/sunset times.",
      };
    }

    const totalSystemKWp = settings.totalKWp;
    const systemEfficiency = settings.systemEfficiency ?? 0.85;
    
    const directionFactor = settings.propertyDirectionFactor ?? 
      (propertyDirectionOptions.find(opt => opt.value === settings.propertyDirection)?.factor) ?? 
      1.0;

    const currentDate = new Date(manualDayForecast.date + "T00:00:00"); // Ensure date is parsed correctly
    const currentMonth = currentDate.getMonth(); // 0 for January, 11 for December

    const monthlyFactors = settings.monthlyGenerationFactors && settings.monthlyGenerationFactors.length === 12 
      ? settings.monthlyGenerationFactors 
      : [0.3, 0.4, 0.6, 0.8, 1.0, 1.1, 1.0, 0.9, 0.7, 0.5, 0.35, 0.25]; // Default factors
    const monthlyFactor = monthlyFactors[currentMonth] ?? 1.0;

    const weatherConditionFactors: Record<ManualDayForecast['condition'], number> = {
      sunny: 1.0,
      partly_cloudy: 0.7,
      cloudy: 0.4,
      overcast: 0.2,
      rainy: 0.1,
    };
    const weatherConditionFactor = weatherConditionFactors[manualDayForecast.condition] ?? 0.5;

    // Calculate daily total generation
    const effectivePeakSunHours = BASE_PEAK_SUN_HOURS * monthlyFactor;
    const dailyTotalGenerationKWh = totalSystemKWp * effectivePeakSunHours * directionFactor * systemEfficiency * weatherConditionFactor;

    // Distribute daily generation into hourly forecast (simple triangular distribution)
    const peakHourOffset = daylightHours / 2;
    const averageHourlyGenerationWh = (dailyTotalGenerationKWh * 1000) / daylightHours;


    for (let hour = 0; hour < 24; hour++) {
      let estimatedGenerationWh = 0;
      if (hour >= sunriseHour && hour < sunsetHour) { // Consider hours within daylight
        // Calculate how far the current hour is from the "solar noon" (middle of daylight period)
        // The factor is 1 at solar noon, and 0 at sunrise/sunset
        let generationFactorForHour = 1 - (Math.abs(hour + 0.5 - (sunriseHour + peakHourOffset)) / peakHourOffset);
        generationFactorForHour = Math.max(0, Math.min(1, generationFactorForHour)); // Clamp between 0 and 1

        // The sum of these factors over daylightHours isn't exactly daylightHours/2 for a discrete sum.
        // For a simple triangular distribution, the peak is twice the average.
        estimatedGenerationWh = averageHourlyGenerationWh * generationFactorForHour * 2;
        // This simple model might make the sum not exactly match dailyTotalGenerationKWh due to discretization.
        // A more complex distribution or normalization step would be needed for perfect match.
        // For now, this gives a reasonable shape.
      }
      hourlyForecast.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        estimatedGenerationWh: parseFloat(estimatedGenerationWh.toFixed(3)),
      });
    }
    
    // Normalize hourly forecast to sum up to dailyTotalGenerationKWh
    const currentHourlySumWh = hourlyForecast.reduce((sum, hf) => sum + hf.estimatedGenerationWh, 0);
    if (currentHourlySumWh > 0 && dailyTotalGenerationKWh > 0) {
        const normalizationFactor = (dailyTotalGenerationKWh * 1000) / currentHourlySumWh;
        hourlyForecast.forEach(hf => {
            hf.estimatedGenerationWh = parseFloat((hf.estimatedGenerationWh * normalizationFactor).toFixed(3));
        });
    } else if (dailyTotalGenerationKWh === 0) { // Ensure hourly is zero if daily is zero
         hourlyForecast.forEach(hf => {
            hf.estimatedGenerationWh = 0;
        });
    }


    return {
      date: manualDayForecast.date,
      weatherCondition: manualDayForecast.condition,
      dailyTotalGenerationKWh: parseFloat(dailyTotalGenerationKWh.toFixed(2)),
      hourlyForecast,
      errorMessage: null,
    };

  } catch (error: any) {
    console.error("Error in calculateSolarGeneration:", error);
    return {
      date: manualDayForecast.date,
      weatherCondition: manualDayForecast.condition || "unknown", // Fallback
      dailyTotalGenerationKWh: 0,
      hourlyForecast: [],
      errorMessage: `Calculation error: ${error.message}`,
    };
  }
}
