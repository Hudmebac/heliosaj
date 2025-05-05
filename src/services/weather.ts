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
export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "unknown";


/**
 * Represents weather forecast data.
 * Adjusted for Open-Meteo response.
 */
export interface WeatherForecast {
  /**
   * The date of the forecast (YYYY-MM-DD).
   */
  date: string;
    /**
     * Simple weather condition classification based on API data.
     */
    weatherCondition: WeatherCondition;
    /**
     * Maximum temperature for the day (optional).
     */
    tempMax: number;
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
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";


/**
 * Classifies Open-Meteo WMO weather codes into simpler categories.
 * Ref: https://open-meteo.com/en/docs#weathervariables
 * @param code WMO Weather interpretation code.
 * @returns WeatherCondition enum value. 
 */
const classifyWeatherCondition = (code: number | null | undefined): WeatherCondition => {
    if (code === null || code === undefined) return "unknown";

    if (code === 0) return "sunny"; // Clear sky
    if (code >= 1 && code <= 3) return "cloudy"; // Mainly clear, partly cloudy, overcast - treat as cloudy for simplicity
    if (code >= 45 && code <= 48) return "cloudy"; // Fog and depositing rime fog
    if (code >= 51 && code <= 57) return "rainy"; // Drizzle (light, moderate, dense intensity), Freezing Drizzle
    if (code >= 61 && code <= 67) return "rainy"; // Rain (slight, moderate, heavy intensity), Freezing Rain
    if (code >= 71 && code <= 77) return "snowy"; // Snow fall (slight, moderate, heavy intensity), Snow grains
    if (code >= 80 && code <= 82) return "rainy"; // Rain showers (slight, moderate, violent)
    if (code >= 85 && code <= 86) return "snowy"; // Snow showers (slight, heavy)
    if (code === 95) return "stormy"; // Thunderstorm: Slight or moderate
    if (code >= 96 && code <= 99) return "stormy"; // Thunderstorm with slight/heavy hail
    return "unknown";
};

/**
 * Calculates the average of a number array.
 */
const calculateAverage = (arr: number[] | Float32Array | null | undefined): number => {
    if (!arr || arr.length === 0) return 0; 
    const sum = Array.from(arr).reduce((acc, val) => acc + (val || 0), 0);
    return sum / arr.length; 
};


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
    source: string = "open-meteo" // Default to Open-Meteo
): Promise<WeatherForecast[]> {

    // --- Source Validation ---
    if (source !== "open-meteo") {
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
        // Serialize params for the URL
        const urlParams = new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                if (Array.isArray(value)) {
                    acc[key] = value.join(','); // Join array values with commas
                } else {
                    acc[key] = String(value); // Convert all values to string
                }
                return acc;
            }, {} as Record<string, string>)
        );

        const url = `${WEATHER_API_URL}?${urlParams.toString()}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        if (!data.daily || !data.hourly) {
          throw new Error("API response did not contain daily or hourly forecast data.");
        }

        const daily = data.daily;
        const hourly = data.hourly;
        const timezone = data.timezone;
        const forecasts: WeatherForecast[] = [];

        const numDays = daily.time.length;
        
        for (let i = 0; i < numDays; i++) {

      const date = new Date(daily.time[i]);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const sunriseISO = daily.sunrise?.[i];
      const sunsetISO = daily.sunset?.[i];

        
      const dayStartSeconds = (new Date(daily.time[i]).getTime()/1000); //timestamp
      const dayEndSeconds = (new Date(daily.time[i+1]|| daily.time[i]).getTime()/1000);//timestamp


       let dayHourlyIndices: number[] = [];
       for (let h = 0; h < hourly.time.length; h++) {
            const hourlyTimestamp = (new Date(hourly.time[h]).getTime()/1000)
            if (hourlyTimestamp >= dayStartSeconds && hourlyTimestamp < dayEndSeconds) {
                dayHourlyIndices.push(h);
            }
       }

      const dayHourlyCloud: number[] = [];
      const dayHourlyWeatherCode: number[] = [];
      const dayHourlyTimes: Date[] = [];
        for (const index of dayHourlyIndices) {
            dayHourlyCloud.push(hourly.cloud_cover[index]);
            dayHourlyWeatherCode.push(hourly.weather_code[index]);
            dayHourlyTimes.push(new Date(hourly.time[index]));

        }
       const cloudCover = daily.cloud_cover_mean?.[i] !== undefined ? Math.round(daily.cloud_cover_mean[i]):Math.round(calculateAverage(dayHourlyCloud));

      // Check array bounds before accessing
      if (i >= daily.weather_code.length ) {
           console.warn(`Data array length mismatch for day index ${i}. Skipping day.`);
           continue;
        }


        // Ensure we have hourly data
        if (dayHourlyIndices.length === 0) {
             console.warn(`No hourly data found for date ${dateString}. Skipping day.`);
             continue; // Skip if no hourly data found for the day
        }

        



        if(dayHourlyTimes.length === 0) {
            console.warn(`No valid hourly data points could be extracted for date ${dateString}. Skipping day.`);
            continue;
        }

      
       

      forecasts.push({
        date: dateString,
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

/**
 * Gets the weather forecast for the current day only.
 * @param location The location for the forecast.
 * @param source The weather source identifier.
 * @returns A promise resolving to the WeatherForecast for today, or null if unavailable.
 */

export async function getCurrentDayWeather( 
  location: Location,
  source: string = 'open-meteo'
): Promise<WeatherForecast | null> {
    try {
        // Fetch forecast for 1 day
        const forecastArray = await getWeatherForecast(location, 1, source);

        // Check if the array is valid and has at least one entry
        if (forecastArray && forecastArray.length > 0) {
             // Assuming the first entry is today's forecast
            const todayString = new Date().toISOString().split('T')[0];
            const todayForecast = forecastArray.find(f => f.date === todayString);
            return todayForecast || forecastArray[0]; // Return found today or the first day as fallback
        } else {
            console.warn(`getCurrentDayWeather: No forecast data returned for ${location.lat},${location.lng}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching current day weather:', error);
        return null;
    }
}
