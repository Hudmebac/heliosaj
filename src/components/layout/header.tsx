
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap, List, ExternalLink } from 'lucide-react'; // Import List, ExternalLink icons
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
    DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, ForecastOptions } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

// Define the structure for weather sources including an ID
interface WeatherSource {
  id: string;
  name: string;
  url: string;
  isFunctional: boolean; // Flag to indicate if it actually fetches data
}

// List of weather sources with IDs and functional status
const weatherSources: WeatherSource[] = [
   { id: "open-meteo", name: "Open-Meteo", url: "https://open-meteo.com/", isFunctional: true }, // Our current implementation
   // Add others for display/selection, but mark as not functional for data fetching
   { id: "openweathermap", name: "OpenWeatherMap", url: "https://openweathermap.org/", isFunctional: false },
   { id: "accuweather", name: "AccuWeather", url: "https://www.accuweather.com", isFunctional: false },
   { id: "google", name: "Google Weather", url: "https://www.google.com/search?q=weather", isFunctional: false },
   { id: "bbc", name: "BBC Weather", url: "https://www.bbc.com/weather", isFunctional: false },
];

const DEFAULT_WEATHER_SOURCE_ID = 'open-meteo'; // Default to the functional source
const DEFAULT_WEATHER_SOURCE = weatherSources.find(s => s.id === DEFAULT_WEATHER_SOURCE_ID)!;

export default function Header() {
  const pathname = usePathname();
  const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [forecastOptions, setForecastOptions] = useLocalStorage<ForecastOptions>('forecastOptions', {
    showWeatherCondition: true,
    showTempMax: true,
    showTempMin: true,
    showSunrise: true,
    showSunset: true,
  });
  // Local state to manage the selected source, initialized from settings or default
  const [selectedSourceId, setSelectedSourceId] = useState<string>(DEFAULT_WEATHER_SOURCE_ID);

   // Ensure effect runs only on client after mount
   useEffect(() => {
     setIsMounted(true);
     // Initialize selectedSourceId from localStorage *after* mount
     const storedSourceId = settings?.selectedWeatherSource;
     const isValidSource = weatherSources.some(s => s.id === storedSourceId);
     setSelectedSourceId(isValidSource && storedSourceId ? storedSourceId : DEFAULT_WEATHER_SOURCE_ID);
   }, [settings?.selectedWeatherSource]); // Re-run if settings change externally


    // Modal state and related functions
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    const { toast } = useToast();


  const handleSourceChange = (newSourceId: string) => {
    setSelectedSourceId(newSourceId);
    // Update the settings in localStorage
    setSettings(prevSettings => ({
      ...(prevSettings || {
          // Provide default structure if prevSettings is null
           location: '',
           propertyDirection: 'South Facing',
           inputMode: 'Panels',
      }),
      selectedWeatherSource: newSourceId,
    }));
    // Data refresh will happen automatically on pages that use settings via useEffect dependency
  };

    const handleOptionChange = (optionKey: keyof ForecastOptions, checked: boolean) => {
        setForecastOptions((prevOptions) => ({
            ...prevOptions,
            [optionKey]: checked,
        }));
    };

    const handleModalClose = () => {
        // Set a timeout to close the modal after saving
        setTimeout(() => {
            closeModal();

            toast({
                title: "Forecast settings updated.",
                description: "Your changes have been saved.",
            })
        }, 500);
    };

    const isMounted = true;

    // Find the full source object based on the selected ID
    const currentSource = weatherSources.find(s => s.id === selectedSourceId) || DEFAULT_WEATHER_SOURCE;

    // Determine the name to display, avoiding hydration mismatch
    const displaySourceName = isMounted ? currentSource?.name : DEFAULT_WEATHER_SOURCE.name;

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/info', label: 'Info', icon: Info },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/advisory', label: 'Advisory', icon: Zap },
  ];

  return (
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6 text-primary" /> {/* Changed Sun icon color to primary */}
          HelioHeggie
        </Link>

        {/* Navigation Links */}
        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0 order-2 sm:order-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                 "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary", // Glow effect on hover/focus
                 "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent", // Silver text glow
                 pathname === item.href ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]' : 'font-medium hover:shadow-accent/80 focus:shadow-accent' // Active link styling
              )}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}

          {/* Source Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out font-medium",
                  "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                  "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent hover:shadow-accent/80 focus:shadow-accent",
                  "h-auto" // Ensure button height doesn't cause layout shifts
                )}
              >
                <List className="h-4 w-4" />
                {/* Render placeholder text initially or if not mounted */}
                Source: {isMounted ? (displaySourceName || 'Select') : 'Loading...'}
              </Button>



            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-secondary border-border text-secondary-foreground">
              <DropdownMenuLabel>Select Weather Data Source</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={selectedSourceId} onValueChange={handleSourceChange}>
                {weatherSources.map((source) => (
                  <DropdownMenuRadioItem
                    key={source.id}
                    value={source.id}
                    className="cursor-pointer focus:bg-accent/20 focus:text-accent"
                    // No longer disabling items, user can select any for display preference
                    // disabled={!source.isFunctional}
                  >
                    {source.name}
                     {/* Optionally, add a small icon or text if it's the active data provider */}
                     {source.isFunctional && <span className="ml-auto text-xs text-primary/80">(Active)</span>}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
               <DropdownMenuSeparator />
               {/* Only render link if mounted and currentSource is valid */}
               {isMounted && currentSource && (
                 <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent/20 focus:text-accent">
                    <a href={currentSource.url} target="_blank" rel="noopener noreferrer" className="text-sm flex items-center gap-2">
                      Visit {currentSource.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground/80" />
                    </a>
                 </DropdownMenuItem>
               )}
               <DropdownMenuItem disabled className="text-xs text-muted-foreground/70">
                   Note: Currently only Open-Meteo provides forecast data to the app.
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>          

            {/* Button to open forecast settings modal */}
            <Button variant="ghost" onClick={openModal} className="h-auto">
                Forecast Settings
            </Button>

          {/* Forecast settings dialog */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Forecast Display Settings</DialogTitle>
                <DialogDescription>
                  Customize what data is displayed in the forecast.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="showWeatherCondition" checked={forecastOptions.showWeatherCondition} onCheckedChange={(checked) => handleOptionChange('showWeatherCondition', checked)} />
                  <label htmlFor="showWeatherCondition" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Weather Condition
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="showTempMax" checked={forecastOptions.showTempMax} onCheckedChange={(checked) => handleOptionChange('showTempMax', checked)} />
                  <label htmlFor="showTempMax" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Max Temperature
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="showTempMin" checked={forecastOptions.showTempMin} onCheckedChange={(checked) => handleOptionChange('showTempMin', checked)} />
                  <label htmlFor="showTempMin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Min Temperature
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="showSunrise" checked={forecastOptions.showSunrise} onCheckedChange={(checked) => handleOptionChange('showSunrise', checked)} />
                  <label htmlFor="showSunrise" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sunrise</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="showSunset" checked={forecastOptions.showSunset} onCheckedChange={(checked) => handleOptionChange('showSunset', checked)} />
                  <label htmlFor="showSunset" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Sunset</label>
                </div>
              </div>
              <DialogFooter><Button onClick={handleModalClose}>Save and Close</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </nav>

        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto">
         <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
