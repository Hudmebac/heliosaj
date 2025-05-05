
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
    tempMax?: number; // Make optional as API might not return it
    /**
     * Minimum temperature for the day (optional).
     */
    tempMin?: number; // Make optional
    /**
     * Sunrise time as an ISO 8601 string (optional).
     */
    sunrise?: string;
    /**
     * Sunset time as an ISO 8601 string (optional).
     */
    sunset?: string;
    /**
     * Average daily cloud cover percentage (optional).
     */
    cloudCover?: number; // Make optional
    // Store raw hourly data for more detailed calculations if needed
    hourly?: {
        time: Date[];
        cloudCover?: number[]; // Optional
        weatherCode?: number[]; // Optional
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
 * Calculates the average of a number array. Handles potential null/undefined values.
 */
const calculateAverage = (arr: number[] | Float32Array | null | undefined): number => {
    if (!arr || arr.length === 0) return 0;
    const validValues = Array.from(arr).filter(val => typeof val === 'number' && !isNaN(val));
    if (validValues.length === 0) return 0;
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return sum / validValues.length;
};


/**
 * Asynchronously retrieves weather forecast data for a given location using Open-Meteo API.
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
        // Note: The actual API call will still use Open-Meteo
    }

    // Ensure requested days don't exceed reasonable limits (Open-Meteo allows up to 16)
    const requestDays = Math.max(1, Math.min(days, 16));

    const params = {
        latitude: location.lat.toString(), // Ensure coordinates are strings for URLSearchParams
        longitude: location.lng.toString(),
        daily: [
            "weather_code",         // WMO code for daily condition
            "temperature_2m_max",   // Max temp
            "temperature_2m_min",   // Min temp
            "sunrise",              // Daily sunrise ISO string
            "sunset",               // Daily sunset ISO string
            "cloud_cover_mean",     // Daily average cloud cover %
        ].join(','), // Join daily params with comma
        hourly: [
            "cloud_cover",          // Hourly cloud cover %
            "weather_code",         // Hourly weather code
            // Add other needed hourly vars like "direct_normal_irradiance" maybe
        ].join(','), // Join hourly params with comma
        timezone: "auto",           // Automatically determine timezone
        forecast_days: requestDays.toString(), // Ensure days is a string
    };

    try {
        const urlParams = new URLSearchParams(params);
        const url = `${WEATHER_API_URL}?${urlParams.toString()}`;
        console.log("Fetching weather from:", url); // Log the URL for debugging

        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error Response: ${errorText}`);
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        // --- Basic Response Validation ---
        if (!data || typeof data !== 'object') {
            throw new Error("Invalid API response structure: Not an object.");
        }
        if (data.error) {
             throw new Error(`API returned an error: ${data.reason || 'Unknown reason'}`);
        }
        if (!data.daily || typeof data.daily !== 'object' || !Array.isArray(data.daily.time)) {
            throw new Error("API response missing or invalid 'daily' data structure.");
        }
        if (!data.hourly || typeof data.hourly !== 'object' || !Array.isArray(data.hourly.time)) {
            throw new Error("API response missing or invalid 'hourly' data structure.");
        }


        const dailyData = data.daily;
        const hourlyData = data.hourly;
        const forecasts: WeatherForecast[] = [];
        const numDays = dailyData.time.length;

        // Ensure required daily arrays exist and have the correct length
        const requiredDailyKeys = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset', 'cloud_cover_mean'];
        for (const key of requiredDailyKeys) {
            if (!Array.isArray(dailyData[key]) || dailyData[key].length !== numDays) {
                // Be more lenient for optional fields like cloud_cover_mean, sunrise, sunset
                if (key === 'cloud_cover_mean' || key === 'sunrise' || key === 'sunset') {
                    if (!dailyData[key]) dailyData[key] = Array(numDays).fill(null); // Fill with null if missing
                    else if (dailyData[key].length !== numDays) console.warn(`Length mismatch for optional daily field '${key}'. Proceeding cautiously.`);
                } else {
                    throw new Error(`API response missing or has incorrect length for daily field: '${key}'. Expected ${numDays}, got ${dailyData[key]?.length}`);
                }
            }
        }
        // Ensure required hourly arrays exist
         const requiredHourlyKeys = ['cloud_cover', 'weather_code'];
         for (const key of requiredHourlyKeys) {
             if (!Array.isArray(hourlyData[key])) {
                  // Be more lenient for optional fields
                 if (key === 'cloud_cover' || key === 'weather_code') {
                     if (!hourlyData[key]) hourlyData[key] = Array(hourlyData.time.length).fill(null); // Fill with null if missing
                     else console.warn(`Hourly field '${key}' is not an array. Proceeding cautiously.`);
                 } else {
                    throw new Error(`API response missing hourly field: '${key}'.`);
                 }
             }
         }


        // --- Data Extraction & Processing Loop ---
        for (let i = 0; i < numDays; i++) {
            const dateStr = dailyData.time[i]; // Should be YYYY-MM-DD string
            if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                console.warn(`Invalid date format encountered at index ${i}: ${dateStr}. Skipping day.`);
                continue;
            }

            const sunriseISO = dailyData.sunrise[i];
            const sunsetISO = dailyData.sunset[i];

            // Find hourly indices belonging to this day
            const dayStart = new Date(dateStr + "T00:00:00Z").getTime(); // Use Z for UTC start comparison
             // Calculate end time (start of next day or very end of current day)
            const dayEnd = i + 1 < numDays
                ? new Date(dailyData.time[i + 1] + "T00:00:00Z").getTime()
                : new Date(dateStr + "T23:59:59Z").getTime() + 1; // End of the day


             const dayHourlyIndices: number[] = [];
             const dayHourlyTimes: Date[] = [];
             const dayHourlyCloud: number[] = [];
             const dayHourlyWeatherCode: number[] = [];

             // Check if hourlyData.time exists and is an array before iterating
            if (Array.isArray(hourlyData.time)) {
                for (let h = 0; h < hourlyData.time.length; h++) {
                    const hourlyTimeStr = hourlyData.time[h]; // Should be ISO string like "2024-07-31T10:00"
                    try {
                         const hourlyTimestamp = new Date(hourlyTimeStr).getTime();
                         if (!isNaN(hourlyTimestamp) && hourlyTimestamp >= dayStart && hourlyTimestamp < dayEnd) {
                            dayHourlyIndices.push(h);
                            dayHourlyTimes.push(new Date(hourlyTimeStr)); // Store Date object
                            // Safely access hourly data, providing null if array doesn't exist or index is out of bounds
                            dayHourlyCloud.push(hourlyData.cloud_cover?.[h] ?? null);
                            dayHourlyWeatherCode.push(hourlyData.weather_code?.[h] ?? null);
                        }
                    } catch (e) {
                         console.warn(`Error parsing hourly time at index ${h}: ${hourlyTimeStr}`, e);
                    }
                }
            } else {
                 console.warn(`Hourly time data is missing or not an array for date ${dateStr}. Hourly details will be incomplete.`);
            }


            // Use daily average cloud cover if provided, otherwise calculate from hourly or default
            let dailyCloudCover: number | undefined;
            if (dailyData.cloud_cover_mean[i] !== null && dailyData.cloud_cover_mean[i] !== undefined) {
                dailyCloudCover = Math.round(dailyData.cloud_cover_mean[i]);
            } else if (dayHourlyCloud.length > 0) {
                dailyCloudCover = Math.round(calculateAverage(dayHourlyCloud));
            } // else leave undefined

            // Get daily values safely
            const dailyCode = dailyData.weather_code[i] ?? null;
            const dailyMaxTemp = dailyData.temperature_2m_max[i] ?? undefined;
            const dailyMinTemp = dailyData.temperature_2m_min[i] ?? undefined;

            forecasts.push({
                date: dateStr,
                weatherCondition: classifyWeatherCondition(dailyCode),
                tempMax: typeof dailyMaxTemp === 'number' ? parseFloat(dailyMaxTemp.toFixed(1)) : undefined,
                tempMin: typeof dailyMinTemp === 'number' ? parseFloat(dailyMinTemp.toFixed(1)) : undefined,
                cloudCover: dailyCloudCover,
                sunrise: sunriseISO ?? undefined,
                sunset: sunsetISO ?? undefined,
                hourly: dayHourlyTimes.length > 0 ? {
                    time: dayHourlyTimes,
                    cloudCover: dayHourlyCloud, // Array of numbers or nulls
                    weatherCode: dayHourlyWeatherCode, // Array of numbers or nulls
                } : undefined, // Only include hourly if data was found
            });
        } // End daily loop

        if (forecasts.length === 0 && numDays > 0) {
            console.warn(`Could not process any valid forecast days from the ${numDays} days received.`);
            // Depending on requirements, you might throw an error here or return empty
        }

        return forecasts;

    } catch (error) {
        console.error(`Error fetching or processing weather data from ${source}:`, error);
        if (error instanceof Error) {
            const message = `Weather service (${source}) failed: ${error.message}`;
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
        // Fetch forecast for just 1 day (today)
        const forecastArray = await getWeatherForecast(location, 1, source);

        if (forecastArray && forecastArray.length > 0) {
            // Open-Meteo's 1-day forecast should return today's data
            return forecastArray[0];
        } else {
            console.warn(`getCurrentDayWeather: No forecast data returned for ${location.lat},${location.lng}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching current day weather:', error);
        // Optionally, re-throw or handle specific error types
        return null;
    }
}
