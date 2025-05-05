

'use client';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useQuery } from '@tanstack/react-query';
import { getWeatherForecast, type WeatherForecast, type Location, getCurrentDayWeather } from '@/services/weather'; // Corrected import path
import type { UserSettings } from '@/types/settings'; // Ensure UserSettings type is imported

const STALE_TIME = 1000 * 60 * 10; // 10 minutes
const CACHE_TIME = 1000 * 60 * 60; // 60 minutes

/**
 * Checks if the location object is valid.
 * @param location The location object to check.
 * @returns True if the location is valid, false otherwise.
 */
const isValidLocation = (location: Location | null): location is Location => {
    return !!location && typeof location.lat === 'number' && typeof location.lng === 'number';
};

/**
 * Custom hook to fetch weather forecast data using react-query for caching.
 * @param location The location { lat, lng } for the forecast.
 * @param sourceId The weather data source identifier (e.g., 'open-meteo').
 * @param days Number of days to forecast.
 * @param enabled Whether the query should automatically run. Defaults to true.
 * @returns The react-query query result object containing data, isLoading, error, refetch, etc.
 */
export function useWeatherForecast(
    location: Location | null,
    sourceId: string, // Keep sourceId in the arguments for cache key differentiation
    days: number,
    enabled: boolean = true,
) {
    // Removed unnecessary import of UserSettings and useLocalStorage as settings are not directly used here
    // const { settings } = useLocalStorage<UserSettings | null>('userSettings', null);
    // const { forecastOptions } = useLocalStorage();


    // Include sourceId and days in the query key to ensure uniqueness
    const queryKey = ['weatherForecast', location, sourceId, days];

    return useQuery<WeatherForecast[], Error>({
        queryKey: queryKey,
        queryFn: async () => {
            // Location validity is checked by the 'enabled' option, but an early return is still good practice
            if (!isValidLocation(location)) {
                console.warn("Weather forecast hook query function called without valid location.");
                return []; // Return empty array if location isn't ready
            }

            // Only fetch from 'open-meteo' as per implementation
            if (sourceId !== 'open-meteo') {
                 console.warn(`Weather source "${sourceId}" requested, but using 'open-meteo' for data fetching.`);
                // No need to change sourceId variable, getWeatherForecast handles the actual API call
            }
             // Pass validated location and days to the actual fetching function
            return await getWeatherForecast(location, days, sourceId); // Pass sourceId here
        },
        // Enable the query only if 'enabled' is true AND location is valid
        enabled: enabled && isValidLocation(location),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        retry: 1,
    });
}


/**
 * Custom hook to fetch weather forecast data specifically for the current day.
 * @param location The location { lat, lng } for the forecast.
 * @param sourceId The weather data source identifier (e.g., 'open-meteo').
 * @param enabled Whether the query should automatically run. Defaults to true.
 * @returns The react-query query result object containing data for today, isLoading, error, etc.
 */
export function useWeatherCurrentDay(
    location: Location | null,
    sourceId: string, // Keep sourceId for cache key
    enabled: boolean = true

) {
    // Removed unnecessary import of UserSettings and useLocalStorage
    // const { settings } = useLocalStorage<UserSettings | null>('userSettings', null);
    // const { forecastOptions } = useLocalStorage();

    const queryKey = ['weatherCurrentDay', location, sourceId]; // Include sourceId in key

    return useQuery<WeatherForecast | null, Error>({ // Expect single forecast or null
        queryKey: queryKey,
        queryFn: async () => {
             // Location validity is checked by the 'enabled' option
            if (!isValidLocation(location)) {
                console.warn("Current day weather hook query function called without valid location.");
                return null; // Return null if location isn't ready
            }

             // Only fetch from 'open-meteo' as per implementation
            if (sourceId !== 'open-meteo') {
                console.warn(`Weather source "${sourceId}" requested, but using 'open-meteo' for data fetching.`);
            }
            // Fetch only today's weather using the dedicated function
            return await getCurrentDayWeather(location, sourceId); // Pass sourceId
        },
        enabled: enabled && isValidLocation(location), // Check validity before enabling
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        retry: 1,
    });
}
