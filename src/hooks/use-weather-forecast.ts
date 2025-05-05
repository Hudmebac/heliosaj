
'use client';

import { useQuery } from '@tanstack/react-query';
import { getWeatherForecast, type WeatherForecast, type Location } from '@/services/weather';

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
    sourceId: string,
    days: number = 7,
    enabled: boolean = true
) {
    const queryKey = ['weatherForecast', location, sourceId, days];

    return useQuery<WeatherForecast[], Error>({
        queryKey: queryKey,
        queryFn: async () => {
            if (!location) {
                // If location is null, don't fetch, return empty array or handle as needed
                // Throwing an error might be better if location is essential
                // throw new Error("Location is required to fetch weather forecast.");
                 console.warn("Weather forecast hook called without location.");
                 return []; // Return empty array if location isn't ready
            }
             // Only fetch from 'open-meteo' as per implementation
            if (sourceId !== 'open-meteo') {
                console.warn(`Weather source "${sourceId}" requested, but using 'open-meteo' for data fetching.`);
                // No need to change sourceId variable, getWeatherForecast handles the actual API call
            }
             // The actual source used by getWeatherForecast is hardcoded for now,
             // but we keep sourceId in the key to potentially support multiple sources later.
            return await getWeatherForecast(location, days, 'open-meteo');
        },
        enabled: enabled && !!location, // Only enable the query if 'enabled' is true AND location is available
        staleTime: STALE_TIME, // How long data is considered fresh (ms)
        gcTime: CACHE_TIME, // How long inactive data remains in cache (ms) - Renamed from cacheTime in v5
        refetchOnWindowFocus: false, // Optional: Prevent refetching on window focus
        refetchOnMount: true, // Refetch on mount if data is stale
        retry: 1, // Optional: Number of retries on error
    });
}
