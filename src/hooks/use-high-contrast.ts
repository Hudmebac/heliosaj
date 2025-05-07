
'use client';

import { useState, useEffect, useCallback } from 'react';

const HIGH_CONTRAST_CLASS = 'high-contrast-enabled';
const LOCAL_STORAGE_KEY = 'highContrastEnabled';

/**
 * Custom hook to manage high contrast mode.
 * @returns A tuple containing:
 *  - `isHighContrast` (boolean): The current state of high contrast mode.
 *  - `setIsHighContrast` (function): A function to set the state of high contrast mode.
 */
export function useHighContrast(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void,
] {
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return item ? JSON.parse(item) : false;
    } catch (error) {
      console.warn(`Error reading localStorage key “${LOCAL_STORAGE_KEY}”:`, error);
      return false;
    }
  });

  useEffect(() => {
    const element = document.documentElement;
    if (isHighContrast) {
      element.classList.add(HIGH_CONTRAST_CLASS);
    } else {
      element.classList.remove(HIGH_CONTRAST_CLASS);
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(isHighContrast));
      } catch (error) {
        console.warn(`Error setting localStorage key “${LOCAL_STORAGE_KEY}”:`, error);
      }
    }
  }, [isHighContrast]);

  return [isHighContrast, setIsHighContrast];
}
