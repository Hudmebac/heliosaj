
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ManualForecastInput, ManualDayForecast } from '@/types/settings';
import { format, addDays } from 'date-fns';


export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValueFromLocalStorage = useCallback((): T => {
    // This function should only be called on the client.
    // For SSR and initial client render, `initialValue` is used directly by useState.
    if (typeof window === 'undefined') {
      // This case should ideally not be hit if called from useEffect on client.
      // If somehow called server-side directly, return initialValue.
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

  // Initialize with `initialValue` to ensure server and client first render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Effect to read from localStorage and update state, runs only on client after mount.
  useEffect(() => {
    const valueFromStorage = readValueFromLocalStorage();
    // Check if the value from storage is different to avoid unnecessary re-render.
    // This simple stringify comparison might not be perfect for complex objects if order matters,
    // but for typical settings data, it's usually sufficient.
    if (JSON.stringify(valueFromStorage) !== JSON.stringify(initialValue)) {
        setStoredValue(valueFromStorage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]); // Removed readValueFromLocalStorage from deps, it's stable via useCallback.
                           // initialValue in deps ensures if it changes, we re-evaluate. Key also.

  const setValue = (value: T | ((val: T) => T)) => {
     if (typeof window === 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`,
      );
      return; // Do not proceed if not on client
    }
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };
  
  // Effect to listen for storage changes from other tabs/windows
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
  }, [key, initialValue]);

  return [storedValue, setValue];
}

const getDefaultManualDayForecast = (date: Date): ManualDayForecast => ({
  date: format(date, 'yyyy-MM-dd'),
  sunrise: '06:00', // Default sunrise
  sunset: '18:00',  // Default sunset
  condition: 'sunny', // Default condition
});

export const useManualForecast = (): [ManualForecastInput, (value: ManualForecastInput | ((val: ManualForecastInput) => ManualForecastInput)) => void, () => void] => {
  const initialManualForecast = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    return {
      today: getDefaultManualDayForecast(today),
      tomorrow: getDefaultManualDayForecast(tomorrow),
    };
  }, []);

  const [forecast, setForecast] = useLocalStorage<ManualForecastInput>('manualWeatherForecast', initialManualForecast);

  const refreshDates = useCallback(() => {
    setForecast(prevForecast => {
      const currentDateToday = format(new Date(), 'yyyy-MM-dd');
      const currentDateTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

      const newTodayData = prevForecast.today.date === currentDateToday
        ? prevForecast.today
        : { ...getDefaultManualDayForecast(new Date()), condition: prevForecast.today.condition, sunrise: prevForecast.today.sunrise, sunset: prevForecast.today.sunset, date: currentDateToday };

      const newTomorrowData = prevForecast.tomorrow.date === currentDateTomorrow
        ? prevForecast.tomorrow
        : { ...getDefaultManualDayForecast(addDays(new Date(), 1)), condition: prevForecast.tomorrow.condition, sunrise: prevForecast.tomorrow.sunrise, sunset: prevForecast.tomorrow.sunset, date: currentDateTomorrow };
      
      if (newTodayData.date !== prevForecast.today.date || newTomorrowData.date !== prevForecast.tomorrow.date ||
          JSON.stringify(newTodayData) !== JSON.stringify(prevForecast.today) || 
          JSON.stringify(newTomorrowData) !== JSON.stringify(prevForecast.tomorrow)) {
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
};

