
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap, CloudSun, Edit3, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type { UserSettings, ManualForecastInput } from '@/types/settings';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';
import { ManualForecastModal } from '@/components/manual-forecast-modal';

export default function Header() {
  const pathname = usePathname();
  const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [isMounted, setIsMounted] = useState(false);
  // Default UI state for selectedWeatherSourceId, will be updated from localStorage or to default 'open-meteo'
  const [selectedWeatherSourceId, setSelectedWeatherSourceId] = useState<string>('open-meteo'); 
  const [isManualForecastModalOpen, setIsManualForecastModalOpen] = useState(false);
  const [manualForecast, setManualForecast, refreshForecastDates] = useManualForecast();


   useEffect(() => {
     setIsMounted(true);
     const storedSource = settings?.selectedWeatherSource;
     const defaultSource = 'open-meteo';

     if (settings === null) {
       // Case 1: No settings in localStorage (e.g., first visit)
       setSelectedWeatherSourceId(defaultSource);
       // Initialize settings with the default source
       setSettings({ selectedWeatherSource: defaultSource } as UserSettings);
     } else if (storedSource && weatherSources.some(s => s.id === storedSource && s.isFunctional)) {
       // Case 2: Valid functional source found in settings
       setSelectedWeatherSourceId(storedSource);
     } else {
       // Case 3: Settings exist, but source is invalid, not functional (and not manual), or missing.
       // Default to 'open-meteo' for UI and update localStorage.
       setSelectedWeatherSourceId(defaultSource);
       if (settings.selectedWeatherSource !== defaultSource) {
         setSettings(prev => ({
           ...(prev!), // prev is UserSettings here
           selectedWeatherSource: defaultSource,
         }));
       }
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [settings, setSettings]); // React to settings object changes

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/advisory', label: 'Advisory', icon: Zap },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/info', label: 'Info', icon: Info },
  ];

  interface WeatherSource {
    id: string;
    name: string;
    url?: string;
    isFunctional: boolean;
  }

  const weatherSources: WeatherSource[] = [
    { id: "open-meteo", name: "Open-Meteo", url: "https://open-meteo.com/", isFunctional: true },
    { id: "manual", name: "Manual Input", isFunctional: true },
    { id: "metoffice", name: "Met Office", url: "https://www.metoffice.gov.uk/", isFunctional: false },
    { id: "openweathermap", name: "OpenWeatherMap", url: "https://openweathermap.org/", isFunctional: false },
    { id: "accuweather", name: "AccuWeather", url: "https://www.accuweather.com", isFunctional: false },
    { id: "google", name: "Google Weather", url: "https://www.google.com/search?q=weather", isFunctional: false },
    { id: "bbc", name: "BBC Weather", url: "https://www.bbc.com/weather", isFunctional: false },
  ];

  const handleSourceSelect = (sourceId: string) => {
    setSelectedWeatherSourceId(sourceId); // Update local UI state immediately
    // Update settings in localStorage
    setSettings(prev => ({
      ...(prev || {} as UserSettings), // Ensure settings object exists
      selectedWeatherSource: sourceId,
    }));
    if (sourceId === 'manual') {
      refreshForecastDates(); // Ensure dates are current for manual forecast
      setIsManualForecastModalOpen(true);
    }
  };

  const currentSource = weatherSources.find(s => s.id === selectedWeatherSourceId) || weatherSources.find(s => s.id === 'open-meteo');


  return (
    <>
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6 text-primary" />
          HelioHeggie
        </Link>

        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0 order-2 sm:order-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                 "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                 "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent",
                 pathname === item.href ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]' : 'font-medium hover:shadow-accent/80 focus:shadow-accent'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isMounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                    "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                    "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent font-medium hover:shadow-accent/80 focus:shadow-accent"
                  )}
                >
                  <CloudSun className="h-4 w-4" />
                  Source: {currentSource?.name || 'Select...'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Select Weather Source</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {weatherSources.map((source) => (
                   <DropdownMenuItem
                     key={source.id}
                     onClick={() => handleSourceSelect(source.id)}
                     disabled={!source.isFunctional} // Only disable if not functional. Manual is functional.
                     className={cn(selectedWeatherSourceId === source.id && "bg-accent/50")}
                   >
                     {source.name} {!source.isFunctional && "(Info Only)"}
                   </DropdownMenuItem>
                ))}
                 {selectedWeatherSourceId === 'manual' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => {
                          refreshForecastDates(); // Ensure dates are correct before opening
                          setIsManualForecastModalOpen(true);
                        }}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Manual Forecast
                        </DropdownMenuItem>
                    </>
                 )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto order-1 sm:order-2">
         <ThemeToggle />
        </div>
      </div>
    </header>
    {isMounted && ( // Only render modal on client
        <ManualForecastModal
          isOpen={isManualForecastModalOpen}
          onClose={() => setIsManualForecastModalOpen(false)}
          currentForecast={manualForecast}
          onSave={(updatedForecast) => {
            setManualForecast(updatedForecast);
            setIsManualForecastModalOpen(false);
          }}
        />
      )}
    </>
  );
}
