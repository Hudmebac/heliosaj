
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
 * This might need adjustment based on the actual API response.
 */
export interface WeatherForecast {
  /**
   * The date of the forecast (YYYY-MM-DD).
   */
  date: string;
  /**
   * The average cloud cover percentage (0-100) for the day.
   * Or potentially an array of hourly cloud cover values if the API provides it.
   */
  cloudCover: number;
  /**
   * Simple weather condition classification based on API data.
   */
  weatherCondition?: WeatherCondition;
  // Add other relevant fields from the API if needed, e.g., temperature, sunrise/sunset times, hourly data.
   // Example for potential hourly data:
   // hourly?: Array<{ time: string; cloudCover: number; temp: number; }>;
}


const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
// Example using OpenWeatherMap One Call API (adjust URL and params as needed)
const WEATHER_API_URL = 'https://api.openweathermap.org/data/3.0/onecall';


/**
 * Classifies OpenWeatherMap weather condition ID into simpler categories.
 * @param id OpenWeatherMap weather condition ID.
 * @returns WeatherCondition enum value.
 */
const classifyWeatherCondition = (id: number): WeatherCondition => {
  if (id >= 200 && id < 300) return 'stormy'; // Thunderstorm
  if (id >= 300 && id < 400) return 'rainy'; // Drizzle
  if (id >= 500 && id < 600) return 'rainy'; // Rain
  if (id >= 600 && id < 700) return 'snowy'; // Snow
  if (id >= 700 && id < 800) return 'cloudy'; // Atmosphere (mist, smoke, haze, etc.) - treat as cloudy for simplicity
  if (id === 800) return 'sunny'; // Clear
  if (id === 801 || id === 802) return 'sunny'; // Few clouds / Scattered clouds - still mostly sunny
  if (id === 803 || id === 804) return 'cloudy'; // Broken clouds / Overcast clouds
  return 'unknown';
};


/**
 * Asynchronously retrieves weather forecast data for a given location.
 *
 * @param location The location for which to retrieve weather data.
 * @param days The number of days to forecast (default is 2, for today and tomorrow). Max is usually 7 or 8 for OneCall API free tier.
 * @param source The identifier for the desired weather source API (e.g., 'openweathermap'). Defaults to 'openweathermap'.
 * @returns A promise that resolves to an array of WeatherForecast objects.
 * @throws Throws an error if the API call fails, returns invalid data, or the source is not implemented.
 */
export async function getWeatherForecast(
  location: Location,
  days: number = 2,
  source: string = 'openweathermap' // Default to OpenWeatherMap
): Promise<WeatherForecast[]> {

   // --- Source Validation ---
   // For now, only 'openweathermap' is implemented for actual fetching.
   if (source !== 'openweathermap') {
     throw new Error(`Weather source "${source}" is not implemented for data fetching yet. Only 'openweathermap' is available.`);
   }

   // --- Proceed with OpenWeatherMap logic ---
   if (!WEATHER_API_KEY) {
    throw new Error("Weather API key (NEXT_PUBLIC_WEATHER_API_KEY) is not configured for OpenWeatherMap.");
   }

  // Ensure requested days don't exceed API limits (e.g., 8 for OneCall free tier)
   const requestDays = Math.min(days, 8);

  const url = `${WEATHER_API_URL}?lat=${location.lat}&lon=${location.lng}&exclude=current,minutely,hourly,alerts&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Log more details for debugging
      const errorBody = await response.text();
      console.error(`Weather API Error ${response.status} (Source: ${source}): ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch weather data from ${source}: ${response.statusText}`);
    }

    const data = await response.json();

    // --- Data Transformation (Crucial Step) ---
    if (!data.daily || !Array.isArray(data.daily)) {
        throw new Error(`Invalid weather data format received from ${source}.`);
    }

     if (data.daily.length < requestDays) {
        console.warn(`API (${source}) returned fewer days (${data.daily.length}) than requested (${requestDays}).`);
     }

    const formatForecast = (dailyData: any): WeatherForecast | null => {
        if (!dailyData.dt || dailyData.clouds === undefined || !dailyData.weather || !dailyData.weather[0]) {
            console.error(`Missing required fields in daily forecast item from ${source}:`, dailyData);
            // Allow partial data if possible, or return null/throw error
            return null; // Or throw new Error("Invalid daily forecast item structure.");
        }
         const date = new Date(dailyData.dt * 1000).toISOString().split('T')[0]; // Convert timestamp to YYYY-MM-DD
         const cloudCover = Math.round(dailyData.clouds); // Cloudiness percentage
         const conditionId = dailyData.weather[0].id; // Get the weather condition ID

         return {
             date: date,
             cloudCover: cloudCover,
             weatherCondition: classifyWeatherCondition(conditionId), // Assuming OpenWeatherMap classification
             // Add other fields if needed by calculations, e.g., dailyData.temp.day
         };
    };

    // Map over the available daily data, up to the requested number of days
    const forecasts = data.daily
        .slice(0, requestDays) // Take only the requested number of days
        .map(formatForecast)
        .filter((forecast): forecast is WeatherForecast => forecast !== null); // Filter out any null results from bad data

    if (forecasts.length === 0) {
         throw new Error(`Could not extract any valid forecast days from ${source} API response.`);
    }

    return forecasts;

  } catch (error) {
    console.error(`Error fetching or processing weather data from ${source}:`, error);
    // Re-throw or handle specific errors
    if (error instanceof Error) {
        throw new Error(`Weather service (${source}) failed: ${error.message}`);
    } else {
        throw new Error(`An unknown error occurred while fetching weather data from ${source}.`);
    }
  }
}
