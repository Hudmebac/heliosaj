

'use client';
import { dummyWeatherForecast } from '@/services/dummy-weather-forecast';
import { useQuery } from '@tanstack/react-query';
import { getWeatherForecast, type WeatherForecast, type Location, getCurrentDayWeather } from '@/services/weather'; // Corrected import path

const STALE_TIME = 1000 * 60 * 30; // 30 minutes
const CACHE_TIME = 1000 * 60 * 60; // 60 minutes

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
    enabled: boolean = true
) {
    // Include sourceId and days in the query key to ensure uniqueness
    const queryKey = ['weatherForecast', location, sourceId, days];

    return useQuery<WeatherForecast[], Error>({
        queryKey: queryKey,
        queryFn: async () => {
            if (!location) {
                 console.warn("Weather forecast hook called without location.");
                return []; // Return empty array if location isn't ready

            }
            // Only fetch from 'open-meteo' as per implementation
            if (sourceId !== 'open-meteo') {
                 console.warn(`Weather source "${sourceId}" requested, but using 'open-meteo' for data fetching.`);
                // No need to change sourceId variable, getWeatherForecast handles the actual API call
            }
             // Pass location and days to the actual fetching function
            return await getWeatherForecast(location, days, sourceId); // Pass sourceId here
        },
        enabled: enabled && !!location, // Only enable the query if 'enabled' is true AND location is available
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
    const queryKey = ['weatherCurrentDay', location, sourceId]; // Include sourceId in key

    return useQuery<WeatherForecast | null, Error>({ // Expect single forecast or null
        queryKey: queryKey,
        queryFn: async () => {
            if (!location) {
                 console.warn("Current day weather hook called without location.");
                 return null; // Return null if location isn't ready
            }
             // Only fetch from 'open-meteo' as per implementation
            if (sourceId !== 'open-meteo') {
                console.warn(`Weather source "${sourceId}" requested, but using 'open-meteo' for data fetching.`);
            }
            // Fetch only today's weather using the dedicated function
            return await getCurrentDayWeather(location, sourceId); // Pass sourceId
        },
        enabled: enabled && !!location,
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        retry: 1,
    });
}
