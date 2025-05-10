
'use client';

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
}

export function useInputControls(): InputControlsContextType {
  const [showSliders, setShowSliders] = useLocalStorage<boolean>(SHOW_SLIDERS_KEY, true);
  const [showTooltips, setShowTooltips] = useLocalStorage<boolean>(SHOW_TOOLTIPS_KEY, true);

  const toggleSliderVisibility = () => {
    setShowSliders(prev => !prev);
  };

  const toggleTooltipVisibility = () => {
    setShowTooltips(prev => !prev);
  };

  return {
    showSliders,
    toggleSliderVisibility,
    setShowSliders,
    showTooltips,
    toggleTooltipVisibility,
    setShowTooltips,
  };
}