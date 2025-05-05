
import type { UserSettings } from '@/types/settings'; // Import UserSettings if needed for API calls

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
  cloudCover: number; // From cloud_cover_mean
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
   // Add other relevant fields from the API if needed, e.g., sunrise/sunset times, hourly data.
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
 * Asynchronously retrieves weather forecast data for a given location using Open-Meteo.
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
     // Keep supporting other sources conceptually, but only fetch from open-meteo
     console.warn(`Weather source "${source}" selected, but only 'open-meteo' is used for data fetching.`);
     // Or throw: throw new Error(`Weather source "${source}" is not implemented for data fetching. Only 'open-meteo' is available.`);
   }

  // Ensure requested days don't exceed reasonable limits (Open-Meteo allows up to 16)
  const requestDays = Math.min(days, 16);

  // Define daily variables needed
  const dailyVariables = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'cloud_cover_mean',
    // Add 'sunrise', 'sunset', 'precipitation_sum' if needed later
  ];

  const url = `${WEATHER_API_URL}?latitude=${location.lat}&longitude=${location.lng}&daily=${dailyVariables.join(',')}&timezone=auto&forecast_days=${requestDays}`;

  try {
    const response = await fetch(url, { cache: 'no-store' }); // Avoid caching issues during dev/testing
    if (!response.ok) {
      // Log more details for debugging
      const errorBody = await response.json(); // Open-Meteo often returns JSON errors
      console.error(`Weather API Error ${response.status} (Source: ${source}): ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch weather data from ${source}: ${errorBody?.reason || response.statusText}`);
    }

    const data = await response.json();

    // --- Data Transformation (Crucial Step for Open-Meteo) ---
    if (!data.daily || !data.daily.time || !Array.isArray(data.daily.time)) {
        throw new Error(`Invalid weather data format received from ${source}. Missing daily time array.`);
    }

    const timeArray = data.daily.time as string[];
    const cloudCoverArray = data.daily.cloud_cover_mean as number[];
    const weatherCodeArray = data.daily.weather_code as number[];
    const tempMaxArray = data.daily.temperature_2m_max as number[];
    const tempMinArray = data.daily.temperature_2m_min as number[];

    if (
      !cloudCoverArray || timeArray.length !== cloudCoverArray.length ||
      !weatherCodeArray || timeArray.length !== weatherCodeArray.length ||
      !tempMaxArray || timeArray.length !== tempMaxArray.length ||
      !tempMinArray || timeArray.length !== tempMinArray.length
     ) {
        throw new Error(`Inconsistent array lengths in weather data from ${source}.`);
    }

    const forecasts: WeatherForecast[] = [];
    for (let i = 0; i < timeArray.length; i++) {
      // Skip if essential data is somehow null/undefined, though Open-Meteo usually provides it
      if (timeArray[i] == null || cloudCoverArray[i] == null || weatherCodeArray[i] == null) {
        console.warn(`Skipping forecast for index ${i} due to missing data from ${source}.`);
        continue;
      }
      forecasts.push({
        date: timeArray[i], // Already in YYYY-MM-DD format
        cloudCover: Math.round(cloudCoverArray[i]), // Average cloud cover %
        weatherCondition: classifyWeatherCondition(weatherCodeArray[i]),
        tempMax: tempMaxArray[i], // Max temp
        tempMin: tempMinArray[i], // Min temp
      });
    }


    if (forecasts.length === 0) {
         throw new Error(`Could not extract any valid forecast days from ${source} API response.`);
    }

    return forecasts;

  } catch (error) {
    console.error(`Error fetching or processing weather data from ${source}:`, error);
    // Re-throw or handle specific errors
    if (error instanceof Error) {
        // Append source info if not already present
        const message = error.message.includes(`(${source})`) ? error.message : `Weather service (${source}) failed: ${error.message}`;
        throw new Error(message);
    } else {
        throw new Error(`An unknown error occurred while fetching weather data from ${source}.`);
    }
  }
}
