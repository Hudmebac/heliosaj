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

const defaultContextValue: InputControlsContextType = {
  showSliders: true,
  toggleSliderVisibility: () => {},
  setShowSliders: () => {},
  showTooltips: true,
  toggleTooltipVisibility: () => {},
  setShowTooltips: () => {},
  isMounted: false,
};

const InputControlsContext = createContext<InputControlsContextType>(defaultContextValue);

export const InputControlProvider = ({ children }: { children: ReactNode }) => {
  const [showSlidersState, setShowSlidersState] = useLocalStorage<boolean>(SHOW_SLIDERS_KEY, true);
  const [showTooltipsState, setShowTooltipsState] = useLocalStorage<boolean>(SHOW_TOOLTIPS_KEY, true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const toggleSliderVisibility = () => {
    setShowSlidersState(prev => !prev);
  };

  const toggleTooltipVisibility = () => {
    setShowTooltipsState(prev => !prev);
  };

  const contextValue: InputControlsContextType = {
    showSliders: showSlidersState,
    toggleSliderVisibility,
    setShowSliders: setShowSlidersState,
    showTooltips: showTooltipsState,
    toggleTooltipVisibility,
    setShowTooltips: setShowTooltipsState,
    isMounted,
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