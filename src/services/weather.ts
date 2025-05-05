
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


// IMPORTANT: Replace this with a real API call
const MOCK_WEATHER_API_ENABLED = process.env.NEXT_PUBLIC_MOCK_WEATHER_API === 'true' || !process.env.NEXT_PUBLIC_WEATHER_API_KEY;
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
 * @returns A promise that resolves to an array of WeatherForecast objects.
 * @throws Throws an error if the API call fails or returns invalid data.
 */
export async function getWeatherForecast(location: Location, days: number = 2): Promise<WeatherForecast[]> {

  if (MOCK_WEATHER_API_ENABLED) {
    console.warn("Using MOCK weather data. Set NEXT_PUBLIC_WEATHER_API_KEY and NEXT_PUBLIC_MOCK_WEATHER_API=false to use real data.");
    return generateMockWeatherData(location, days);
  }

  if (!WEATHER_API_KEY) {
    throw new Error("Weather API key (NEXT_PUBLIC_WEATHER_API_KEY) is not configured.");
  }

  // Ensure requested days don't exceed API limits (e.g., 8 for OneCall free tier)
   const requestDays = Math.min(days, 8);


  const url = `${WEATHER_API_URL}?lat=${location.lat}&lon=${location.lng}&exclude=current,minutely,hourly,alerts&appid=${WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Log more details for debugging
      const errorBody = await response.text();
      console.error(`Weather API Error ${response.status}: ${response.statusText}`, errorBody);
      throw new Error(`Failed to fetch weather data: ${response.statusText}`);
    }

    const data = await response.json();

    // --- Data Transformation (Crucial Step) ---
    if (!data.daily || !Array.isArray(data.daily)) {
        throw new Error("Invalid weather data format received from API.");
    }

     if (data.daily.length < requestDays) {
        console.warn(`API returned fewer days (${data.daily.length}) than requested (${requestDays}).`);
     }

    const formatForecast = (dailyData: any): WeatherForecast | null => {
        if (!dailyData.dt || dailyData.clouds === undefined || !dailyData.weather || !dailyData.weather[0]) {
            console.error("Missing required fields in daily forecast item:", dailyData);
            // Allow partial data if possible, or return null/throw error
            return null; // Or throw new Error("Invalid daily forecast item structure.");
        }
         const date = new Date(dailyData.dt * 1000).toISOString().split('T')[0]; // Convert timestamp to YYYY-MM-DD
         const cloudCover = Math.round(dailyData.clouds); // Cloudiness percentage
         const conditionId = dailyData.weather[0].id; // Get the weather condition ID


         return {
             date: date,
             cloudCover: cloudCover,
             weatherCondition: classifyWeatherCondition(conditionId),
             // Add other fields if needed by calculations, e.g., dailyData.temp.day
         };
    };

    // Map over the available daily data, up to the requested number of days
    const forecasts = data.daily
        .slice(0, requestDays) // Take only the requested number of days
        .map(formatForecast)
        .filter((forecast): forecast is WeatherForecast => forecast !== null); // Filter out any null results from bad data

    if (forecasts.length === 0) {
         throw new Error("Could not extract any valid forecast days from API response.");
    }

    return forecasts;


  } catch (error) {
    console.error("Error fetching or processing weather data:", error);
    // Re-throw or handle specific errors
    if (error instanceof Error) {
        throw new Error(`Weather service failed: ${error.message}`);
    } else {
        throw new Error("An unknown error occurred while fetching weather data.");
    }
  }
}


// Mock data generation function
function generateMockWeatherData(location: Location, days: number): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  const today = new Date();

  const mockConditions: WeatherCondition[] = ['sunny', 'cloudy', 'rainy', 'cloudy', 'sunny', 'stormy', 'snowy'];


  for (let i = 0; i < days; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const formatDate = (date: Date): string => date.toISOString().split('T')[0];

      const cloudCover = Math.floor(Math.random() * 90) + 5; // Random cloud cover 5-95%
       // Assign condition somewhat based on cloud cover or randomly
      let condition: WeatherCondition = 'unknown';
      if (cloudCover < 20) condition = 'sunny';
      else if (cloudCover < 70) condition = 'cloudy';
      else if (cloudCover < 90) condition = 'rainy';
      else condition = mockConditions[Math.floor(Math.random() * mockConditions.length)]; // More random for high cloud


      forecasts.push({
          date: formatDate(currentDate),
          cloudCover: cloudCover,
          weatherCondition: condition,
      });
  }

  return forecasts;
}
