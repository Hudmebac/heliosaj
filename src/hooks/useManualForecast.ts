import { useState, useEffect, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { format, addDays } from 'date-fns';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'windy' | 'foggy';

export interface ManualDayForecast {
  date: string; // Format: 'yyyy-MM-dd'
  sunrise: string; // Format: 'HH:mm'
  sunset: string;  // Format: 'HH:mm'
  condition: WeatherCondition;
}

export interface ManualForecastInput {
  today: ManualDayForecast;
  tomorrow: ManualDayForecast;
}

// Usage:
// const [storedValue, setStoredValue] = useLocalStorage<Type>('key', initialValue);
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial value function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function
          ? value(storedValue as unknown as T)
          : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  // This effect synchronizes the state if the initial readValue (due to prop change) differs or key changes.
  useEffect(() => {
    const currentValueFromStorage = readValue();
    // Basic check; for objects, a deep comparison might be needed
    // Only update if the read value is different from current stored value
    if (JSON.stringify(currentValueFromStorage) !== JSON.stringify(storedValue)) {
      setStoredValue(currentValueFromStorage);
    }
  }, [key, readValue, storedValue]);

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
  const initialManualForecast = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    return {
      today: getDefaultManualDayForecast(today),
      tomorrow: getDefaultManualDayForecast(tomorrow),
    };
  }, []);

  const [forecast, setForecast] = useLocalStorage<ManualForecastInput>('manualWeatherForecast', initialManualForecast);
  const [isInitialized, setIsInitialized] = useState(false);

  // Effect to update dates if they become stale (e.g., app opened next day)
  useEffect(() => {
    if (!isInitialized) return; // Only run after initial state is set from localStorage

    const currentDateToday = format(new Date(), 'yyyy-MM-dd');
    const currentDateTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if (forecast.today.date !== currentDateToday || forecast.tomorrow.date !== currentDateTomorrow) {
      setForecast(prevForecast => {
        const newTodayData = prevForecast.today.date === currentDateToday
          ? prevForecast.today
          : { ...getDefaultManualDayForecast(new Date()), condition: prevForecast.today.condition, sunrise: prevForecast.today.sunrise, sunset: prevForecast.today.sunset, date:currentDateToday };

        const newTomorrowData = prevForecast.tomorrow.date === currentDateTomorrow
          ? prevForecast.tomorrow
          : { ...getDefaultManualDayForecast(addDays(new Date(), 1)), condition: prevForecast.tomorrow.condition, sunrise: prevForecast.tomorrow.sunrise, sunset: prevForecast.tomorrow.sunset, date: currentDateTomorrow };

        return {
          today: newTodayData,
          tomorrow: newTomorrowData,
        };
      });
    }
  }, [forecast.today.date, forecast.tomorrow.date, setForecast, isInitialized]);

  // Effect to mark as initialized once forecast is loaded from localStorage
   useEffect(() => {
     // Check if forecast is not the initial default object
     if (forecast && (forecast.today.sunrise !== '06:00' || forecast.today.date !== format(new Date(), 'yyyy-MM-dd'))) {
       setIsInitialized(true);
     } else if (JSON.stringify(forecast) === JSON.stringify(initialManualForecast)) {
       // If it's still the initial default, we can consider it initialized for date checks
       setIsInitialized(true);
     }
   }, [forecast, initialManualForecast]);


  return [forecast, setForecast];
};
