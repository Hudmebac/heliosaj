
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ManualForecastInput, ManualDayForecast } from '@/types/settings';
import { format, addDays } from 'date-fns';


export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = (value: T | ((val: T) => T)) => {
     if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`,
      );
    }
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

   useEffect(() => {
    setStoredValue(readValue());
  }, [key, readValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== event.oldValue) {
         setStoredValue(readValue());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]);

  return [storedValue, setValue];
}

const getDefaultManualDayForecast = (date: Date): ManualDayForecast => ({
  date: format(date, 'yyyy-MM-dd'),
  sunrise: '06:00', // Default sunrise
  sunset: '18:00',  // Default sunset
  condition: 'sunny', // Default condition
});

/**
 * Hook to manage manual weather forecast input for today and tomorrow.
 * @returns [ManualForecastInput, (value: ManualForecastInput | ((val: ManualForecastInput) => ManualForecastInput)) => void] - Tuple with current manual forecast and a setter.
 */
export const useManualForecast = (): [ManualForecastInput, (value: ManualForecastInput | ((val: ManualForecastInput) => ManualForecastInput)) => void] => {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const initialManualForecast: ManualForecastInput = {
    today: getDefaultManualDayForecast(today),
    tomorrow: getDefaultManualDayForecast(tomorrow),
  };

  const [forecast, setForecast] = useLocalStorage<ManualForecastInput>('manualWeatherForecast', initialManualForecast);

  // Effect to update dates if they become stale (e.g., app opened next day)
  useEffect(() => {
    const currentDateToday = format(new Date(), 'yyyy-MM-dd');
    const currentDateTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if (forecast.today.date !== currentDateToday || forecast.tomorrow.date !== currentDateTomorrow) {
      setForecast(prevForecast => ({
        today: {
          ...prevForecast.today, // Keep existing condition, sunrise, sunset
          sunrise: prevForecast.today.date === currentDateToday ? prevForecast.today.sunrise : '06:00',
          sunset: prevForecast.today.date === currentDateToday ? prevForecast.today.sunset : '18:00',
          condition: prevForecast.today.date === currentDateToday ? prevForecast.today.condition : 'sunny',
          date: currentDateToday,
        },
        tomorrow: {
          ...prevForecast.tomorrow, // Keep existing condition, sunrise, sunset
          sunrise: prevForecast.tomorrow.date === currentDateTomorrow ? prevForecast.tomorrow.sunrise : '06:00',
          sunset: prevForecast.tomorrow.date === currentDateTomorrow ? prevForecast.tomorrow.sunset : '18:00',
          condition: prevForecast.tomorrow.date === currentDateTomorrow ? prevForecast.tomorrow.condition : 'sunny',
          date: currentDateTomorrow,
        },
      }));
    }
  }, [forecast.today.date, forecast.tomorrow.date, setForecast]);


  return [forecast, setForecast];
};
