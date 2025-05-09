'use client';

import { useQuery } from '@tanstack/react-query';
import { OpenMeteoWeatherService, type Location } from '@/services/weatherService';
import type { WeatherForecast } from '@/types/weather';
import type { UserSettings } from '@/types/settings';
import { useLocalStorage } from './use-local-storage';

const STALE_TIME = 1000 * 60 * 30; // 30 minutes
const GC_TIME = 1000 * 60 * 60; // 60 minutes

export const useWeatherForecast = () => {
  const [userSettings] = useLocalStorage<UserSettings | null>('userSettings', null);

  const location: Location | null = userSettings?.latitude && userSettings?.longitude
    ? { latitude: userSettings.latitude, longitude: userSettings.longitude, city: userSettings.location }
    : null;

  const selectedSource = userSettings?.selectedWeatherSource || 'open-meteo';

  const weatherService = new OpenMeteoWeatherService();

  const queryKey = ['weatherForecast', location?.latitude, location?.longitude, selectedSource];

  const {
    data: weatherForecastData,
    isLoading: weatherLoading,
    error: weatherError,
    refetch: refetchWeather,
    isRefetching: weatherRefetching,
  } = useQuery<WeatherForecast, Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (selectedSource === 'open-meteo' && location && userSettings) {
        return weatherService.getWeatherForecast(location, userSettings);
      }
      // This part should ideally not be reached if 'enabled' is working correctly.
      // If it is, it means the query was enabled without proper conditions.
      // For non-'open-meteo' sources, the query is disabled, so this won't run.
      // Throw an error or return a specific non-data state if it's called inappropriately.
      throw new Error("Weather forecast query called with invalid state or non-API source.");
    },
    enabled: selectedSource === 'open-meteo' && !!location && !!userSettings,
    staleTime: STALE_TIME,
    gcTime: GC_TIME, // Changed from cacheTime to gcTime as per TanStack Query v5
    refetchOnWindowFocus: false,
  });

  return {
    weatherForecastData,
    weatherLoading,
    weatherError,
    refetchWeather,
    weatherRefetching,
    isApiSourceSelected: selectedSource === 'open-meteo',
    locationAvailable: !!location,
  };
};
