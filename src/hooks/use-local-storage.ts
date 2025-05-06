
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import type { ManualForecastInput, ManualDayForecast } from '@/types/settings';
import { format, addDays } from 'date-fns';


export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // Ensure that if initialValue is a function, it's not called here unless localStorage is empty.
      // JSON.parse will handle actual stored values.
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // Initialize state. If readValue changes, useState will re-initialize with its result.
  // This part is generally fine if readValue itself is stable or its instability is intended for initialization.
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

   // This effect synchronizes the state if the initial readValue (due to prop change) differs or key changes.
   // The problem arises if `readValue` itself is unstable (changes reference on every render without its underlying value changing).
   useEffect(() => {
    // Only update if the read value is different from current stored value to avoid unnecessary re-renders
    // This comparison might be tricky for objects, but fundamental issue is readValue stability
    const currentValueFromStorage = readValue();
    // Basic check; for objects, a deep comparison might be needed if values can be same but references differ
    // However, the primary fix is stabilizing `readValue` by stabilizing `initialValue`
    if (JSON.stringify(currentValueFromStorage) !== JSON.stringify(storedValue)) {
      setStoredValue(currentValueFromStorage);
    }
  }, [key, readValue, storedValue]); // Added storedValue to dependencies to re-evaluate only when absolutely necessary.

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== event.oldValue) {
         setStoredValue(readValue());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, readValue]); // readValue dependency here is fine if it's stable.

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
  const initialManualForecast = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    return {
      today: getDefaultManualDayForecast(today),
      tomorrow: getDefaultManualDayForecast(tomorrow),
    };
  }, []); // Empty dependency array creates this value once per component lifecycle

  const [forecast, setForecast] = useLocalStorage<ManualForecastInput>('manualWeatherForecast', initialManualForecast);

  // Effect to update dates if they become stale (e.g., app opened next day)
  useEffect(() => {
    const currentDateToday = format(new Date(), 'yyyy-MM-dd');
    const currentDateTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Check if the dates in the current forecast state are stale
    if (forecast.today.date !== currentDateToday || forecast.tomorrow.date !== currentDateTomorrow) {
      setForecast(prevForecast => {
        // Create new day objects only if dates mismatch to preserve user's sunrise/sunset/condition for the correct day
        const newTodayData = prevForecast.today.date === currentDateToday
          ? prevForecast.today
          : { ...getDefaultManualDayForecast(new Date()), condition: prevForecast.today.condition, sunrise: prevForecast.today.sunrise, sunset: prevForecast.today.sunset, date:currentDateToday }; // Carry over settings if it's an update on the same day structure

        const newTomorrowData = prevForecast.tomorrow.date === currentDateTomorrow
          ? prevForecast.tomorrow
          : { ...getDefaultManualDayForecast(addDays(new Date(), 1)), condition: prevForecast.tomorrow.condition, sunrise: prevForecast.tomorrow.sunrise, sunset: prevForecast.tomorrow.sunset, date: currentDateTomorrow };

        return {
          today: newTodayData,
          tomorrow: newTomorrowData,
        };
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to check for stale dates from localStorage. setForecast will handle updates.
           // The `forecast.today.date` and `forecast.tomorrow.date` should not be in deps here
           // because we want to compare against the *current actual date* on mount, not react to `forecast` changes itself.
           // This effect's job is to *correct* forecast if it's stale from a previous session.

  return [forecast, setForecast];
};
