
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ManualForecastInput, ManualDayForecast } from '@/types/settings';
import { format, addDays } from 'date-fns';


export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValueFromLocalStorage = useCallback((): T => {
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

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    // This effect runs ONCE on mount on the client to sync with localStorage
    // It ensures that the state is updated with the value from localStorage
    // if it differs from the initialValue used for SSR/initial client render.
    if (typeof window !== 'undefined') {
        const valueFromStorage = readValueFromLocalStorage();
        if (JSON.stringify(valueFromStorage) !== JSON.stringify(storedValue)) {
            setStoredValue(valueFromStorage);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only re-run if key changes. readValueFromLocalStorage is stable.

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`,
      );
      return;
    }
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]); // Dependencies: key and storedValue

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === window.localStorage) {
        try {
          setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
        } catch (error) {
            console.warn(`Error parsing storage event value for key "${key}":`, error);
            setStoredValue(initialValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]); // readValueFromLocalStorage was removed as it's covered by the direct set or initialValue

  return [storedValue, setValue];
}

const getDefaultManualDayForecast = (date: Date): ManualDayForecast => ({
  date: format(date, 'yyyy-MM-dd'),
  sunrise: '06:00',
  sunset: '18:00',
  condition: 'sunny',
})


export const useManualForecast = (): [ManualForecastInput, (value: ManualForecastInput | ((val: ManualForecastInput) => ManualForecastInput)) => void, () => void] => {

  // Use a function to initialize the useLocalStorage state.
 // This function runs only once on initial render.
  const [forecast, setForecast] = useLocalStorage<ManualForecastInput>('manualWeatherForecast', () => {
    if (typeof window !== 'undefined') {
      const item = window.localStorage.getItem('manualWeatherForecast');
      try { return item ? (JSON.parse(item) as ManualForecastInput) : undefined; } catch { /* ignore */ }
    }
    const today = new Date();
 return { today: getDefaultManualDayForecast(today), tomorrow: getDefaultManualDayForecast(addDays(today, 1)) };
  });
  const refreshDates = useCallback(() => {
    setForecast(prevForecast => {
      const currentDateToday = format(new Date(), 'yyyy-MM-dd');
      const currentDateTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      let changed = false;
      const newTodayData = { ...prevForecast.today };
      if (prevForecast.today.date !== currentDateToday) {
        newTodayData.date = currentDateToday;
        // Optionally reset other fields if date changes, or keep them
        // For now, just updating date. If sunrise/sunset also need reset, do it here.
        // newTodayData.sunrise = '06:00'; // etc. if needed
        changed = true;
      }

      const newTomorrowData = { ...prevForecast.tomorrow };
      if (prevForecast.tomorrow.date !== currentDateTomorrow) {
        newTomorrowData.date = currentDateTomorrow;
        changed = true;
      }
      
      if (changed) {
        return {
          today: newTodayData,
          tomorrow: newTomorrowData,
        };
      }
      return prevForecast; 
    });
  }, [setForecast]);

  useEffect(() => {
    refreshDates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return [forecast, setForecast, refreshDates];
}

