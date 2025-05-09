'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { ManualForecastInput } from '@/types/settings';
import { useManualForecast} from '@/hooks/use-local-storage';
import { sunriseSunsetData, getApproximateSunriseSunset } from '@/components/forecast-info';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, addDays } from 'date-fns';

interface WeatherContextValue {
  isManualEditModalOpen: boolean;
  selectedSource: 'open-meteo' | 'manual' | string;
  setSelectedSource: (source: 'open-meteo' | 'manual' | string) => void;
  openManualEditModal: () => void;
  closeManualEditModal: () => void;
  isManualEditModalOpen: boolean;
  editableForecast: ManualForecastInput;
  setEditableForecast: React.Dispatch<React.SetStateAction<ManualForecastInput>>;
  selectedCityForTimes: string;
  setSelectedCityForTimes: React.Dispatch<React.SetStateAction<string>>;
  handleModalSave: () => void;
  handleCityTimeSelect: (cityName: string) => void;
  setIsManualEditModalOpen: (isOpen: boolean) => void;
}

interface WeatherContextType {
    selectedSource: string;
    isManualEditModalOpen: boolean;
    editableForecast: ManualForecastInput;
  setIsManualEditModalOpen: (isOpen: boolean) => void;
}

const WeatherContext = createContext<WeatherContextValue | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedSource, setSelectedSource] = useState<'open-meteo' | 'manual' | string>('open-meteo');
    const [isManualEditModalOpen, setIsManualEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForecast, setManualForecast, refreshForecastDates] = useManualForecast();
  const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(manualForecast);
  const [selectedCityForTimes, setSelectedCityForTimes] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    setEditableForecast(manualForecast);
  }, [manualForecast]);

  // Placeholder function for now - the actual implementation will come from the page
  const openManualEditModal = () => {
    setIsModalOpen(true);
  };

  const closeManualEditModal = () => {
    setIsModalOpen(false);
  };

  const handleModalSave = () => {
      const timeRegex = /^([01]\\d|2[0-3]):([0-5]\\d)$/;
        if (!timeRegex.test(editableForecast.today.sunrise) || !timeRegex.test(editableForecast.today.sunset) ||
            !timeRegex.test(editableForecast.tomorrow.sunrise) || !timeRegex.test(editableForecast.tomorrow.sunset)) {
            toast({
                title: "Invalid Time Format",
                description: "Please use HH:MM for sunrise and sunset times.",
                variant: "destructive",
            });
            return;
        }

        if (editableForecast.today.sunrise >= editableForecast.today.sunset) {
            toast({
                title: "Invalid Times for Today",
                description: "Sunrise time must be before sunset time for today.",
                variant: "destructive",
            });
            return;
        }
        if (editableForecast.tomorrow.sunrise >= editableForecast.tomorrow.sunset) {
            toast({
                title: "Invalid Times for Tomorrow",
                description: "Sunrise time must be before sunset time for tomorrow.",
                variant: "destructive",
            });
            return;
        }

        setManualForecast(editableForecast);
        closeManualEditModal();
  };

  const handleCityTimeSelect = (cityName: string) => {
    setSelectedCityForTimes(cityName);
  };

   return (
       <WeatherContext.Provider value={{ selectedSource, setSelectedSource, openManualEditModal, isManualEditModalOpen, setIsManualEditModalOpen, closeManualEditModal, editableForecast, setEditableForecast, selectedCityForTimes, setSelectedCityForTimes, handleModalSave, handleCityTimeSelect }}>
           {children}
       </WeatherContext.Provider>
   );
};

export const useWeatherContext = () => {
    const context = useContext(WeatherContext);
    if (context === undefined) {
        throw new Error('useWeatherContext must be used within a WeatherProvider');
    }
    return context;
};