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
 * Asynchronously retrieves weather forecast data for a given location.
 *
 * @param location The location for which to retrieve weather data.
 * @returns A promise that resolves to an array of WeatherForecast objects containing date and cloud cover information for today and tomorrow.
 * @throws Throws an error if the API call fails or returns invalid data.
 */
export async function getWeatherForecast(location: Location): Promise<WeatherForecast[]> {

  if (MOCK_WEATHER_API_ENABLED) {
    console.warn("Using MOCK weather data. Set NEXT_PUBLIC_WEATHER_API_KEY and NEXT_PUBLIC_MOCK_WEATHER_API=false to use real data.");
    return generateMockWeatherData(location);
  }

  if (!WEATHER_API_KEY) {
    throw new Error("Weather API key (NEXT_PUBLIC_WEATHER_API_KEY) is not configured.");
  }

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
    // Adapt this based *exactly* on the OpenWeatherMap One Call API 3.0 'daily' array structure
    if (!data.daily || !Array.isArray(data.daily)) {
        throw new Error("Invalid weather data format received from API.");
    }


    // We need today and tomorrow. The 'daily' array usually starts with today.
    const todayForecast = data.daily[0];
    const tomorrowForecast = data.daily[1];

    if (!todayForecast || !tomorrowForecast) {
         throw new Error("Could not extract today's or tomorrow's forecast from API response.");
    }


    const formatForecast = (dailyData: any): WeatherForecast => {
        if (!dailyData.dt || dailyData.clouds === undefined) {
            console.error("Missing required fields in daily forecast item:", dailyData);
            throw new Error("Invalid daily forecast item structure.");
        }
         const date = new Date(dailyData.dt * 1000).toISOString().split('T')[0]; // Convert timestamp to YYYY-MM-DD
         const cloudCover = Math.round(dailyData.clouds); // Cloudiness percentage

         return {
             date: date,
             cloudCover: cloudCover,
             // Add other fields if needed by calculations, e.g., dailyData.temp.day
         };
    };


    return [
        formatForecast(todayForecast),
        formatForecast(tomorrowForecast),
        // Add more days if needed by other features
    ];


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
function generateMockWeatherData(location: Location): WeatherForecast[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  // Simulate varying cloud cover based on location or just randomly
  const todayCloud = Math.floor(Math.random() * 80) + 10; // Random cloud cover 10-90%
  const tomorrowCloud = Math.floor(Math.random() * 80) + 10;

  return [
    {
      date: formatDate(today),
      cloudCover: todayCloud,
    },
    {
      date: formatDate(tomorrow),
      cloudCover: tomorrowCloud,
    },
    // Add more days if your calculation needs them
     {
      date: new Date(today.setDate(today.getDate() + 2)).toISOString().split('T')[0],
      cloudCover: Math.floor(Math.random() * 70) + 15,
    },
  ];
}
