
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sun, Home, Settings, Info, BarChart2, Zap, List, ExternalLink } from 'lucide-react'; // Import List, ExternalLink icons
import { cn } from '@/lib/utils';
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import { useState, useEffect } from 'react';

// Define the structure for weather sources including an ID
interface WeatherSource {
  id: string;
  name: string;
  url: string;
}

// List of weather sources with IDs
const weatherSources: WeatherSource[] = [
   { id: "openweathermap", name: "OpenWeatherMap", url: "https://openweathermap.org/" }, // Our current implementation
   { id: "accuweather", name: "AccuWeather", url: "https://www.accuweather.com" },
   { id: "weatherchannel", name: "The Weather Channel", url: "https://www.weather.com" },
   { id: "weatherunderground", name: "Weather Underground", url: "https://www.wunderground.com" },
   { id: "nws", name: "NWS (US)", url: "https://www.weather.gov" },
   { id: "google", name: "Google Weather", url: "https://www.google.com/search?q=weather" },
   { id: "bbc", name: "BBC Weather", url: "https://www.bbc.com/weather" },
   { id: "ventusky", name: "Ventusky", url: "https://www.ventusky.com" },
   { id: "windy", name: "Windy", url: "https://www.windy.com" },
];

const DEFAULT_WEATHER_SOURCE_ID = 'openweathermap'; // Default if nothing is set

export default function Header() {
  const pathname = usePathname();
  const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  // Local state to manage the selected source, initialized from settings or default
  const [selectedSourceId, setSelectedSourceId] = useState<string>(settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID);

   // Update local state if settings change from localStorage
   useEffect(() => {
     setSelectedSourceId(settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID);
   }, [settings?.selectedWeatherSource]);

  const handleSourceChange = (newSourceId: string) => {
    setSelectedSourceId(newSourceId);
    // Update the settings in localStorage
    setSettings(prevSettings => ({
      ...prevSettings!, // Assuming settings exist if user can change source? Or handle null case
      selectedWeatherSource: newSourceId,
    }));
    // TODO: Optionally trigger a data refresh here if needed immediately
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/info', label: 'Info', icon: Info },
    { href: '/tariffs', label: 'Tariffs', icon: BarChart2 },
    { href: '/advisory', label: 'Advisory', icon: Zap },
  ];

   const currentSource = weatherSources.find(s => s.id === selectedSourceId) || weatherSources.find(s => s.id === DEFAULT_WEATHER_SOURCE_ID)!;


  return (
    <header className="bg-secondary text-secondary-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="flex items-center gap-2 mb-2 sm:mb-0 text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity">
          <Sun className="h-6 w-6" />
          HelioHeggie
        </Link>

        {/* Navigation Links */}
        <nav className="flex gap-1 sm:gap-2 items-center flex-wrap justify-center mb-2 sm:mb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-sm transition-colors duration-200 ease-in-out",
                "hover:text-accent focus:text-accent focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-secondary",
                "[text-shadow:_0_0_8px_var(--tw-shadow-color)] shadow-accent",
                pathname === item.href
                  ? 'font-semibold text-accent shadow-[0_0_8px_theme(colors.accent)]'
                  : 'font-medium hover:shadow-accent/80 focus:shadow-accent'
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
                  "h-auto"
                )}
              >
                <List className="h-4 w-4" />
                Source: {currentSource?.name || 'Select'} {/* Show current source */}
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
                    disabled={source.id !== 'openweathermap'} // Only enable OpenWeatherMap for actual data fetching for now
                  >
                    {source.name}
                     {source.id !== 'openweathermap' && <span className="ml-auto text-xs text-muted-foreground/70">(Info Only)</span>}
                     {/* Add a comment explaining only OpenWeatherMap is functional */}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
               <DropdownMenuSeparator />
               {currentSource && (
                 <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent/20 focus:text-accent">
                    <a href={currentSource.url} target="_blank" rel="noopener noreferrer" className="text-sm flex items-center gap-2">
                      Visit {currentSource.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground/80" />
                    </a>
                 </DropdownMenuItem>
               )}
               <DropdownMenuItem disabled className="text-xs text-muted-foreground/70">
                   Note: Currently only OpenWeatherMap provides data to the app.
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </nav>

        <div className="absolute top-3 right-4 sm:relative sm:top-auto sm:right-auto">
         <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
