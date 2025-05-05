
import type { UserSettings } from '@/types/settings'; // Import UserSettings if needed for API calls
import { fetchWeatherApi } from 'openmeteo';

/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Location {
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

/**
 * Represents possible weather conditions relevant to solar generation.
 */
export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'unknown';


/**
 * Represents weather forecast data, including cloud cover.
 * Adjusted for Open-Meteo response.
 */
export interface WeatherForecast {
  /**
   * The date of the forecast (YYYY-MM-DD).
   */
  date: string;
  /**
   * The average cloud cover percentage (0-100) for the day.
   */
  cloudCover: number; // From cloud_cover_mean or calculated from hourly
  /**
   * Simple weather condition classification based on API data.
   */
  weatherCondition?: WeatherCondition; // From weather_code
  /**
   * Maximum temperature for the day (optional).
   */
  tempMax?: number;
  /**
   * Minimum temperature for the day (optional).
   */
  tempMin?: number;
  /**
   * Sunrise time as an ISO 8601 string (optional).
   */
  sunrise?: string;
  /**
   * Sunset time as an ISO 8601 string (optional).
   */
  sunset?: string;
   // Store raw hourly data for more detailed calculations if needed
   hourly?: {
       time: Date[];
       cloudCover: number[];
       weatherCode: number[];
       // Add other hourly vars if solar calc needs them
   }
}


// Use Open-Meteo API endpoint
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';


/**
 * Classifies Open-Meteo WMO weather codes into simpler categories.
 * Ref: https://open-meteo.com/en/docs#weathervariables
 * @param code WMO Weather interpretation code.
 * @returns WeatherCondition enum value.
 */
const classifyWeatherCondition = (code: number): WeatherCondition => {
  if (code === 0) return 'sunny'; // Clear sky
  if (code >= 1 && code <= 3) return 'cloudy'; // Mainly clear, partly cloudy, overcast - treat as cloudy for simplicity
  if (code >= 45 && code <= 48) return 'cloudy'; // Fog and depositing rime fog
  if (code >= 51 && code <= 57) return 'rainy'; // Drizzle (light, moderate, dense intensity), Freezing Drizzle
  if (code >= 61 && code <= 67) return 'rainy'; // Rain (slight, moderate, heavy intensity), Freezing Rain
  if (code >= 71 && code <= 77) return 'snowy'; // Snow fall (slight, moderate, heavy intensity), Snow grains
  if (code >= 80 && code <= 82) return 'rainy'; // Rain showers (slight, moderate, violent)
  if (code >= 85 && code <= 86) return 'snowy'; // Snow showers (slight, heavy)
  if (code === 95) return 'stormy'; // Thunderstorm: Slight or moderate
  if (code >= 96 && code <= 99) return 'stormy'; // Thunderstorm with slight/heavy hail
  return 'unknown';
};

/**
 * Calculates the average of a number array.
 */
const calculateAverage = (arr: number[] | Float32Array | null | undefined): number => {
    if (!arr || arr.length === 0) return 0;
    const sum = Array.from(arr).reduce((acc, val) => acc + (val || 0), 0); // Handle potential null/undefined values in array
    return sum / arr.length;
}


/**
 * Asynchronously retrieves weather forecast data for a given location using Open-Meteo SDK.
 *
 * @param location The location for which to retrieve weather data.
 * @param days The number of days to forecast (default is 7). Open-Meteo allows up to 16.
 * @param source The identifier for the desired weather source API (e.g., 'open-meteo'). Only 'open-meteo' is implemented.
 * @returns A promise that resolves to an array of WeatherForecast objects.
 * @throws Throws an error if the API call fails, returns invalid data, or the source is not 'open-meteo'.
 */
export async function getWeatherForecast(
  location: Location,
  days: number = 7,
  source: string = 'open-meteo' // Default to Open-Meteo
): Promise<WeatherForecast[]> {

   // --- Source Validation ---
   if (source !== 'open-meteo') {
     console.warn(`Weather source "${source}" selected, but only 'open-meteo' is used for data fetching.`);
   }

  // Ensure requested days don't exceed reasonable limits (Open-Meteo allows up to 16)
  const requestDays = Math.max(1, Math.min(days, 16)); // Ensure at least 1 day, max 16

   const params = {
     latitude: location.lat,
     longitude: location.lng,
     daily: [
       "weather_code", // WMO code for daily condition (index 0)
       "temperature_2m_max", // (index 1)
       "temperature_2m_min", // (index 2)
       "sunrise", // Daily sunrise ISO string (index 3)
       "sunset",  // Daily sunset ISO string (index 4)
       "cloud_cover_mean", // Daily average cloud cover % (index 5)
     ],
     hourly: [
         "cloud_cover", // Hourly cloud cover % (index 0)
         "weather_code", // Hourly weather code (index 1)
         // Add "direct_normal_irradiance" or similar if solar calc needs it directly
     ],
     timezone: "auto", // Automatically determine timezone
     forecast_days: requestDays,
   };

  try {
    const responses = await fetchWeatherApi(WEATHER_API_URL, params);
    const response = responses[0]; // Process the first location

    const utcOffsetSeconds = response.utcOffsetSeconds();

    // Check if daily and hourly data exist before accessing methods
    const dailyData = response.daily();
    const hourlyData = response.hourly();

    if (!dailyData) {
        throw new Error("API response did not contain daily forecast data.");
    }
    if (!hourlyData) {
        throw new Error("API response did not contain hourly forecast data.");
    }


    // --- Data Extraction ---
    // Get time range and interval directly from the daily/hourly objects
    const dailyTime = dailyData.time();
    const dailyTimeEnd = dailyData.timeEnd();
    const dailyInterval = dailyData.interval();
    if (dailyTime === undefined || dailyTimeEnd === undefined || dailyInterval === undefined) {
        throw new Error("Could not get time information from daily data (time/timeEnd/interval).");
    }

    const hourlyTime = hourlyData.time();
    const hourlyTimeEnd = hourlyData.timeEnd();
    const hourlyInterval = hourlyData.interval();
     if (hourlyTime === undefined || hourlyTimeEnd === undefined || hourlyInterval === undefined) {
        throw new Error("Could not get time information from hourly data (time/timeEnd/interval).");
    }


    // Access variables using their correct indices based on the `params` order
    const dailyWeatherCode = dailyData.variables(0)?.valuesArray();
    const dailyTempMax = dailyData.variables(1)?.valuesArray();
    const dailyTempMin = dailyData.variables(2)?.valuesArray();
    const dailySunriseVar = dailyData.variables(3); // sunrise uses valuesInt64
    const dailySunsetVar = dailyData.variables(4);   // sunset uses valuesInt64
    const dailyCloudCoverMean = dailyData.variables(5)?.valuesArray(); // Mean cloud cover

    const hourlyCloudCover = hourlyData.variables(0)?.valuesArray();
    const hourlyWeatherCode = hourlyData.variables(1)?.valuesArray();


    // --- Validate Extracted Data ---
    if (!dailyWeatherCode || !dailyTempMax || !dailyTempMin || !dailySunriseVar || !dailySunsetVar || !dailyCloudCoverMean || !hourlyCloudCover || !hourlyWeatherCode) {
        console.error("Failed to extract one or more weather variables:", {
            dailyWeatherCode: !!dailyWeatherCode, dailyTempMax: !!dailyTempMax, dailyTempMin: !!dailyTempMin,
            dailySunriseVar: !!dailySunriseVar, dailySunsetVar: !!dailySunsetVar, dailyCloudCoverMean: !!dailyCloudCoverMean,
            hourlyCloudCover: !!hourlyCloudCover, hourlyWeatherCode: !!hourlyWeatherCode
        });
         throw new Error("Failed to extract one or more required weather variables from the API response.");
    }

    const forecasts: WeatherForecast[] = [];
    const numDays = (Number(dailyTimeEnd) - Number(dailyTime)) / dailyInterval;

    for (let i = 0; i < numDays; i++) {
      const dayTimestamp = Number(dailyTime) + i * dailyInterval;
      const date = new Date((dayTimestamp + utcOffsetSeconds) * 1000);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

      // Extract sunrise/sunset (they are Int64) - ensure valuesInt64(i) is not null
      const sunriseVal = dailySunriseVar.valuesInt64(i);
      const sunsetVal = dailySunsetVar.valuesInt64(i);
       if (sunriseVal === null || sunsetVal === null) {
         console.warn(`Missing sunrise/sunset value for day index ${i}. Skipping day.`);
         continue; // Skip this day if essential data is missing
       }
      const sunriseTimestamp = Number(sunriseVal) + utcOffsetSeconds;
      const sunsetTimestamp = Number(sunsetVal) + utcOffsetSeconds;
      const sunriseISO = new Date(sunriseTimestamp * 1000).toISOString();
      const sunsetISO = new Date(sunsetTimestamp * 1000).toISOString();

      // Find corresponding hourly data for this day
       const dayStartSeconds = dayTimestamp;
       const dayEndSeconds = dayTimestamp + dailyInterval; // Use daily interval (usually 24*3600)

       let dayHourlyIndices: number[] = [];
       const numHourlySteps = (Number(hourlyTimeEnd) - Number(hourlyTime)) / hourlyInterval;
       for (let h = 0; h < numHourlySteps; h++) {
            const hourlyTimestamp = Number(hourlyTime) + h * hourlyInterval;
            // Check if the *start* of the hourly interval falls within the daily interval
            if (hourlyTimestamp >= dayStartSeconds && hourlyTimestamp < dayEndSeconds) {
                dayHourlyIndices.push(h);
            }
       }

        // Ensure we have hourly data
        if (dayHourlyIndices.length === 0) {
             console.warn(`No hourly data found for date ${dateString}. Skipping day.`);
             continue; // Skip if no hourly data found for the day
        }

        // Extract hourly data for the specific day
        // Need to handle potential null values from valuesArray if API response is sparse
        const dayHourlyCloud: number[] = [];
        const dayHourlyWeatherCode: number[] = [];
        const dayHourlyTimes: Date[] = [];

        for (const index of dayHourlyIndices) {
            const cloudVal = hourlyCloudCover[index];
            const codeVal = hourlyWeatherCode[index];
            const timeVal = Number(hourlyTime) + index * hourlyInterval + utcOffsetSeconds;

            if (cloudVal !== null && cloudVal !== undefined && codeVal !== null && codeVal !== undefined && timeVal !== null && timeVal !== undefined) {
                dayHourlyCloud.push(cloudVal);
                dayHourlyWeatherCode.push(codeVal);
                dayHourlyTimes.push(new Date(timeVal * 1000));
            } else {
                 console.warn(`Missing hourly data point at index ${index} for date ${dateString}.`);
                 // Optionally skip the hour or use fallback values
            }
        }

        if(dayHourlyTimes.length === 0) {
            console.warn(`No valid hourly data points could be extracted for date ${dateString}. Skipping day.`);
            continue;
        }


       // Use daily mean cloud cover directly if available and valid, otherwise average hourly
       const cloudCoverMeanVal = dailyCloudCoverMean?.[i];
       const cloudCover = (cloudCoverMeanVal !== undefined && cloudCoverMeanVal !== null && !isNaN(cloudCoverMeanVal))
            ? Math.round(cloudCoverMeanVal)
            : Math.round(calculateAverage(dayHourlyCloud));

      forecasts.push({
        date: dateString,
        cloudCover: cloudCover,
        weatherCondition: classifyWeatherCondition(dailyWeatherCode[i]),
        tempMax: dailyTempMax[i],
        tempMin: dailyTempMin[i],
        sunrise: sunriseISO,
        sunset: sunsetISO,
        // Include hourly data if needed by other parts of the app
         hourly: {
             time: dayHourlyTimes,
             cloudCover: dayHourlyCloud,
             weatherCode: dayHourlyWeatherCode,
         }
      });
    }

    if (forecasts.length === 0) {
         throw new Error(`Could not extract any valid forecast days from ${source} API response.`);
    }

    return forecasts;

  } catch (error) {
    console.error(`Error fetching or processing weather data from ${source}:`, error);
    if (error instanceof Error) {
        // Make error message more specific if possible
        const message = error.message.includes(`(${source})`) ? error.message : `Weather service (${source}) failed: ${error.message}`;
        throw new Error(message);
    } else {
        throw new Error(`An unknown error occurred while fetching weather data from ${source}.`);
    }
  }
}
