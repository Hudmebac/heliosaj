
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { InputControlToggle } from '@/components/input-control-toggle';
import { Sun, Home, Settings, Info, Zap, CloudSun, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
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
import { useInputControls } from '@/hooks/use-input-controls';


interface WeatherSource {
  id: string;
  name: string;
  url?: string;
  isFunctional: boolean;
}

const weatherSources: WeatherSource[] = [
  { id: "open-meteo", name: "Open-Meteo", url: "https://open-meteo.com/", isFunctional: true },
  { id: "manual", name: "Manual Input", isFunctional: true },
  { id: "metoffice", name: "Met Office (Info)", url: "https://www.metoffice.gov.uk/", isFunctional: false },
  { id: "openweathermap", name: "OpenWeatherMap (Info)", url: "https://openweathermap.org/", isFunctional: false },
  { id: "accuweather", name: "AccuWeather (Info)", url: "https://www.accuweather.com", isFunctional: false },
  { id: "google", name: "Google Weather (Info)", url: "https://www.google.com/search?q=weather", isFunctional: false },
  { id: "bbc", name: "BBC Weather (Info)", url: "https://www.bbc.com/weather", isFunctional: false },
];


export default function Header() {
  const pathname = usePathname();
  const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const { isMounted } = useInputControls(); 

  const [selectedWeatherSourceId, setSelectedWeatherSourceId] = useState<string>('open-meteo');
  const [isManualForecastModalOpen, setIsManualForecastModalOpen] = useState(false);
  const [manualForecast, setManualForecast, refreshForecastDates] = useManualForecast();


   useEffect(() => {
     if (!isMounted) return; 

     const storedSourceId = settings?.selectedWeatherSource;
     const defaultSource = 'open-meteo';
     
     const activeSource = weatherSources.find(s => s.id === storedSourceId && s.isFunctional);

     if (activeSource) {
       setSelectedWeatherSourceId(activeSource.id);
     } else {
       setSelectedWeatherSourceId(defaultSource);
       if (!settings || settings.selectedWeatherSource !== defaultSource) {
         setSettings(prev => ({
           ...(prev || {} as UserSettings),
           selectedWeatherSource: defaultSource,
         }));
       }
     }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [settings?.selectedWeatherSource, isMounted, setSettings]); 


  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/advisory', label: 'Advisory', icon: Zap },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/info', label: 'Info', icon: Info },
  ];

  const handleSourceSelect = (sourceId: string) => {
    const selected = weatherSources.find(s => s.id === sourceId);
    if (!selected) return;

    if (!selected.isFunctional) {
        if (selected.url) {
            window.open(selected.url, '_blank', 'noopener,noreferrer');
        }
        return; 
    }

    setSelectedWeatherSourceId(sourceId);
    setSettings(prev => ({
      ...(prev || {} as UserSettings),
      selectedWeatherSource: sourceId,
    }));
    if (sourceId === 'manual') {
      refreshForecastDates();
      setIsManualForecastModalOpen(true);
    }
  };

  const currentSource = weatherSources.find(s => s.id === selectedWeatherSourceId) || weatherSources.find(s => s.id === 'open-meteo');


  return (
    <>
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-3 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6 text-primary" />
          HelioHeggie
        </Link>
        <Link href="/aj_renewables_info" className="flex items-center gap-2 mb-3 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          AJ Renewables
        </Link>
        <nav className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mb-3 sm:mb-0 order-2 sm:order-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 ease-in-out",
                 "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                 "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent",
                 pathname === item.href ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]' : 'font-medium hover:shadow-accent/80 focus:shadow-accent'
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
              title={item.label}
            >
              <item.icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
          {isMounted && ( 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-xs sm:text-sm transition-colors duration-200 ease-in-out",
                    "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                    "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent font-medium hover:shadow-accent/80 focus:shadow-accent"
                  )}
                  id="weather-source-trigger"
                >
                  <CloudSun className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Source:&nbsp;</span>
                  {currentSource?.name || 'Select...'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" aria-labelledby="weather-source-trigger">
                <DropdownMenuLabel>Select Weather Source</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {weatherSources.map((source) => (
                   <DropdownMenuItem
                     key={source.id}
                     onSelect={(event) => {
                       if (!source.isFunctional && source.url) {
                         event.preventDefault();
                         window.open(source.url, '_blank', 'noopener,noreferrer');
                       } else if (source.isFunctional) {
                         handleSourceSelect(source.id);
                       }
                     }}
                     disabled={!source.isFunctional && !source.url} 
                     className={cn(
                        selectedWeatherSourceId === source.id && source.isFunctional && "bg-accent/50",
                        !source.isFunctional && source.url && "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                     )}
                   >
                     {source.name}
                   </DropdownMenuItem>
                ))}
                 {selectedWeatherSourceId === 'manual' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => {
                          refreshForecastDates();
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

        <div className="absolute top-3 right-3 sm:static sm:top-auto sm:right-auto order-1 sm:order-2 flex items-center gap-2">
         <InputControlToggle />
         <ThemeToggle />
        </div>
      </div>
    </header>
    {isMounted && ( 
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
