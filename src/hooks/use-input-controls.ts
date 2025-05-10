
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalStorage } from './use-local-storage';

const SHOW_SLIDERS_KEY = 'inputControls_showSliders';
const SHOW_TOOLTIPS_KEY = 'inputControls_showTooltips';

export interface InputControlsContextType {
  showSliders: boolean;
  toggleSliderVisibility: () => void;
  setShowSliders: (value: boolean | ((val: boolean) => boolean)) => void;
  showTooltips: boolean;
  toggleTooltipVisibility: () => void;
  setShowTooltips: (value: boolean | ((val: boolean) => boolean)) => void;
  isMounted: boolean;
}

const InputControlsContext = createContext<InputControlsContextType | undefined>(undefined);

export const InputControlProvider = ({ children }: { children: ReactNode }) => {
  const [showSliders, setShowSlidersState] = useLocalStorage<boolean>(SHOW_SLIDERS_KEY, true);
  const [showTooltips, setShowTooltipsState] = useLocalStorage<boolean>(SHOW_TOOLTIPS_KEY, true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const setShowSlidersDirectly = (value: boolean | ((val: boolean) => boolean)) => {
    setShowSlidersState(value);
  };

  const setShowTooltipsDirectly = (value: boolean | ((val: boolean) => boolean)) => {
    setShowTooltipsState(value);
  };

  const toggleSliderVisibility = () => {
    setShowSlidersState(prev => !prev);
  };

  const toggleTooltipVisibility = () => {
    setShowTooltipsState(prev => !prev);
  };

  // Define the context value as a separate object
  const contextValue: InputControlsContextType = {
    showSliders,
    toggleSliderVisibility,
    setShowSliders: setShowSlidersDirectly,
    showTooltips,
    toggleTooltipVisibility,
    setShowTooltips: setShowTooltipsDirectly,
    isMounted
  };

  return (
    <InputControlsContext.Provider value={contextValue}>
      {children}
    </InputControlsContext.Provider>
  );
};

export function useInputControls(): InputControlsContextType {
  const context = useContext(InputControlsContext);
  if (context === undefined) {
    throw new Error('useInputControls must be used within an InputControlProvider');
  }
  return context;
}
