
'use client';

import { useLocalStorage } from './use-local-storage';

const SLIDER_VISIBILITY_KEY = 'sliderVisibility';

export interface SliderVisibilityContextType {
  showSliders: boolean;
  toggleSliderVisibility: () => void;
  setShowSliders: (value: boolean | ((val: boolean) => boolean)) => void;
}

export function useSliderVisibility(): SliderVisibilityContextType {
  const [showSliders, setShowSliders] = useLocalStorage<boolean>(SLIDER_VISIBILITY_KEY, true);

  const toggleSliderVisibility = () => {
    setShowSliders(prev => !prev);
  };

  return { showSliders, toggleSliderVisibility, setShowSliders };
}
