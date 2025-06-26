
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';

const SHOW_SLIDERS_KEY = 'inputControls_showSliders';
const SHOW_TOOLTIPS_KEY = 'inputControls_showTooltips';

export interface InputControlsContextType {
  showSliders: boolean;
  toggleSliderVisibility: () => void;
  showTooltips: boolean;
  toggleTooltipVisibility: () => void;
  isMounted: boolean;
}

const defaultContextValue: InputControlsContextType = {
  showSliders: true,
  toggleSliderVisibility: () => console.warn('toggleSliderVisibility called before provider mounted'),
  setShowSliders: () => console.warn('setShowSliders called before provider mounted'),
  showTooltips: true,
  toggleTooltipVisibility: () => console.warn('toggleTooltipVisibility called before provider mounted'),
  setShowTooltips: () => console.warn('setShowTooltips called before provider mounted'),
  isMounted: false, // Represents whether the component has mounted on the client
};

const InputControlsContext = createContext<InputControlsContextType>(defaultContextValue);

export const InputControlProvider = ({ children }: { children: ReactNode }) => {
  const [showSlidersStored, setShowSlidersStored] = useLocalStorage<boolean>(SHOW_SLIDERS_KEY, true);
  const [showTooltipsStored, setShowTooltipsStored] = useLocalStorage<boolean>(SHOW_TOOLTIPS_KEY, true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleSliderVisibility = useCallback(() => {
    if(isMounted) setShowSlidersStored(prev => !prev);
  }, [isMounted, setShowSlidersStored]);

  const toggleTooltipVisibility = useCallback(() => {
    if(isMounted) setShowTooltipsStored(prev => !prev);
  }, [isMounted, setShowTooltipsStored]);
  
  // Use stored values only after mount to avoid hydration mismatch
  const showSliders = isMounted ? showSlidersStored : true;
  const showTooltips = isMounted ? showTooltipsStored : true;

  const contextValue = useMemo<InputControlsContextType>(() => ({
    showSliders,
    toggleSliderVisibility,
    setShowSliders: setShowSlidersStored, // Pass the setter from useLocalStorage
    showTooltips,
    toggleTooltipVisibility,
    setShowTooltips: setShowTooltipsStored, // Pass the setter from useLocalStorage
    isMounted,
  }), [
    showSliders, 
    toggleSliderVisibility, 
    setShowSlidersStored,
    showTooltips, 
    toggleTooltipVisibility,
    setShowTooltipsStored,
    isMounted
  ]);

  return (
    <InputControlsContext.Provider value={contextValue}>
      {children}
    </InputControlsContext.Provider>
  );
};

export function useInputControls(): InputControlsContextType {
  const context = useContext(InputControlsContext);
  if (context === undefined) {
    // This typically means useInputControls is used outside of InputControlProvider
    // For client components, this should ideally not happen if setup is correct.
    // Returning default or throwing error are options. For now, let's return default to avoid crashing,
    // but log a warning.
    console.warn('useInputControls must be used within an InputControlProvider. Using default values.');
    return defaultContextValue; 
  }
  return context;
}
