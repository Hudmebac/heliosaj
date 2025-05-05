

'use client'; // Mark as client component to use hooks

import React, {useState, useEffect, useMemo} from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import type { WeatherForecast, WeatherCondition, Location } from '@/services/weather';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Droplets, RefreshCw, Sunrise, Sunset, Thermometer} from 'lucide-react'; // Import weather icons & RefreshCw, Sunrise, Sunset, Thermometer
import { getChargingAdvice } from '../../lib/charging-advice';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip} from 'recharts';
import { useWeatherForecast } from '@/hooks/use-weather-forecast'; // Import the hook
import { Button } from '@/components/ui/button'; // Import Button
import { format, parseISO } from 'date-fns'; // Import date-fns for formatting

const DEFAULT_LOCATION: Location = { lat: 51.5074, lng: 0.1278 }; // Default to London if no settings
const DEFAULT_WEATHER_SOURCE_ID = 'open-meteo'; // Default source


/**
 * Returns the appropriate Lucide icon based on the weather condition.
 * @param condition The weather condition string.
 * @returns A Lucide icon component or a default icon.
 */
const getWeatherIcon = (condition: WeatherCondition | undefined) => {
  // Handle undefined condition gracefully
  if (!condition) return <Droplets className="w-6 h-6 text-muted-foreground" />; // Default/unknown icon

  switch (condition) {
    case 'sunny': return <Sun className="w-6 h-6 text-yellow-500" />;
    case 'cloudy': return <Cloud className="w-6 h-6 text-gray-500" />;
    case 'rainy': return <CloudRain className="w-6 h-6 text-blue-500" />;
    case 'snowy': return <CloudSnow className="w-6 h-6 text-blue-200" />;
    case 'stormy': return <CloudLightning className="w-6 h-6 text-purple-600" />;
    default: return <Droplets className="w-6 h-6 text-muted-foreground" />; // Default icon for unknown conditions
  }
};

/**
 * Formats an ISO date string to HH:mm time.
 * Returns 'N/A' if the date is invalid.
 */
const formatTime = (isoString: string | undefined): string => {
    if (!isoString) return 'N/A';
    try {
        return format(parseISO(isoString), 'HH:mm');
    } catch (e) {
        console.error("Error formatting time:", e);
        return 'N/A';
    }
};

export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');
  const [isMounted, setIsMounted] = useState(false);

   // Determine location and source from settings, providing defaults
   const currentLocation = useMemo(() => {
     if (settings?.latitude && settings?.longitude) {
       return { lat: settings.latitude, lng: settings.longitude };
     }
     return DEFAULT_LOCATION; // Fallback to default if no settings or coords
   }, [settings]);
   const selectedSource = useMemo(() => settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID, [settings]);

    // Fetch weather data using react-query hook
    const {
        data: weatherData, // Array of WeatherForecast
        isLoading: weatherLoading,
        error: weatherError,
        refetch: refetchWeather,
        isRefetching: weatherRefetching,
        isError: isWeatherError, // Use this boolean flag
    } = useWeatherForecast(
        currentLocation,
        selectedSource,
        7, // Fetch 7 days for the week ahead
        isMounted && !!settings // Enable only when mounted and settings are loaded
    );

  // State for calculated forecasts (derived from weatherData)
  const [calculatedForecasts, setCalculatedForecasts] = useState<{
      today: CalculatedForecast | null,
      tomorrow: CalculatedForecast | null,
      week: CalculatedForecast[]
  }>({ today: null, tomorrow: null, week: [] });

   useEffect(() => {
       setIsMounted(true);
        if (settings?.latitude && settings?.longitude) {
            setLocationDisplay(settings.location || `Lat: ${settings.latitude.toFixed(2)}, Lng: ${settings.longitude.toFixed(2)}`);
        } else if (settings?.location) {
             setLocationDisplay(settings.location);
             console.warn("Location coordinates not available, using default for weather fetch. Please update settings.");
        } else {
            setLocationDisplay('Default Location (London)');
        }
   }, [settings]);

   // Effect to calculate solar generation when weatherData changes
   useEffect(() => {
     if (!settings || !weatherData || weatherData.length === 0) {
       // Clear calculated data if prerequisites are missing
       setCalculatedForecasts({ today: null, tomorrow: null, week: [] });
       return;
     }

     const todayStr = new Date().toISOString().split('T')[0];
     const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

     try {
       const weeklyCalculated = weatherData.map(dayWeather => {
         const calculated = calculateSolarGeneration(dayWeather, settings);
         // Manually add weather data not included in calculateSolarGeneration result if needed
         if (calculated) {
            calculated.weatherCondition = dayWeather.weatherCondition;
            calculated.tempMax = dayWeather.tempMax;
            calculated.sunrise = dayWeather.sunrise;
            calculated.sunset = dayWeather.sunset;
         }
          return calculated || { // Provide default structure if calculation fails
             date: dayWeather.date,
             dailyTotalGenerationKWh: 0,
             hourlyForecast: [],
             weatherCondition: dayWeather.weatherCondition || 'unknown',
             tempMax: dayWeather.tempMax,
             sunrise: dayWeather.sunrise,
             sunset: dayWeather.sunset,
          };
       }).filter(Boolean) as CalculatedForecast[];

       const todayForecast = weeklyCalculated.find(f => f.date === todayStr) || null;
       const tomorrowForecast = weeklyCalculated.find(f => f.date === tomorrowStr) || null;

       setCalculatedForecasts({
         today: todayForecast,
         tomorrow: tomorrowForecast,
         week: weeklyCalculated
       });

     } catch (calcError) {
       console.error("Error calculating solar generation:", calcError);
       // Optionally set an error state specific to calculation
       setCalculatedForecasts({ today: null, tomorrow: null, week: [] }); // Clear on error
     }

   }, [settings, weatherData]); // Re-calculate when settings or weather data change


  getChargingAdvice(10, 'night');
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border p-2 rounded-md text-card-foreground shadow-lg">
          <p className="text-sm">{data.time}</p>
          <p className="text-sm font-medium text-primary">Est: {data.kWh} kWh</p>
        </div>
      );
    }
    return null;
  };

  const formatChartData = (forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast || forecast.hourlyForecast.length === 0) return [];
    return forecast.hourlyForecast.map(h => ({
      time: h.time.split(':')[0] + ':00', // Format time for label,
      kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(2)) // Convert Wh to kWh
    }));
  };


  const renderForecastCard = (title: string, forecast: CalculatedForecast | null) => {
    const chartData = formatChartData(forecast);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title} Forecast</CardTitle>
          <CardDescription>
            Est. Generation: {forecast ? `${forecast.dailyTotalGenerationKWh.toFixed(2)} kWh` : 'N/A'}
             {forecast?.weatherCondition && ` (${forecast.weatherCondition})`}
          </CardDescription>
            {/* Additional Info: Temp Max, Sunrise, Sunset */}
            {forecast && (
                 <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                     {forecast.tempMax !== undefined && (
                         <span className="flex items-center gap-1">
                             <Thermometer className="w-3 h-3" /> Max: {forecast.tempMax.toFixed(0)}°C
                         </span>
                     )}
                     {forecast.sunrise && (
                         <span className="flex items-center gap-1">
                            <Sunrise className="w-3 h-3" /> {formatTime(forecast.sunrise)}
                         </span>
                     )}
                    {forecast.sunset && (
                        <span className="flex items-center gap-1">
                           <Sunset className="w-3 h-3" /> {formatTime(forecast.sunset)}
                        </span>
                    )}
                </div>
            )}
        </CardHeader>
        <CardContent>
          {forecast && chartData.length > 0 ? (
             <ChartContainer config={{kWh: { label: "kWh", color: "hsl(var(--primary))" }}} className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kWh" stroke="hsl(var(--muted-foreground))" />
                   <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel indicator="dot" />}
                    />
                  <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
               </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex justify-center items-center h-[250px]">
                <p className="text-muted-foreground text-sm">
                 {forecast ? 'No significant generation expected.' : 'Forecast data unavailable.'}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

 const renderWeeklyForecast = () => {
     // Use calculatedForecasts.week which is derived from weatherData
    if (calculatedForecasts.week.length === 0) {
      // Display message based on loading/error state of the *weather* query
       if (weatherLoading || weatherRefetching) return null; // Handled by main loading indicator
       if (isWeatherError) return null; // Handled by main error alert
       if (!settings) return null; // Handled by settings alert
      return <p className="text-muted-foreground text-center py-4">Weekly forecast data unavailable or calculation failed.</p>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {calculatedForecasts.week.map((dayForecast, index) => {
           // Validate date
           if (!dayForecast.date || typeof dayForecast.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayForecast.date)) {
             console.warn("Invalid or missing date encountered in weekly forecast:", dayForecast);
             return ( // Render placeholder for invalid data
                <Card key={`invalid-${index}`} className="text-center flex flex-col border-destructive">
                   <CardHeader className="pb-2 pt-3 px-2">
                       <CardTitle className="text-sm font-medium text-destructive">Invalid Date</CardTitle>
                   </CardHeader>
                   <CardContent className="p-2 mt-auto">
                       <p className="text-xs text-destructive">Data error</p>
                   </CardContent>
               </Card>
             );
           }

          const date = new Date(dayForecast.date + 'T00:00:00'); // Ensure date is parsed as local time UTC offset
          if (isNaN(date.getTime())) {
             console.warn("Invalid date object created from string:", dayForecast.date);
             return null; // Skip rendering if date is invalid
           }

          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const condition = dayForecast.weatherCondition || 'unknown';

          return (
            <Card key={dayForecast.date || index} className="text-center flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 pt-3 px-2">
                <CardTitle className="text-sm font-medium">{dayName}</CardTitle>
                 <CardDescription className="text-xs">{date.toLocaleDateString('en-GB', { day:'numeric', month:'short'})}</CardDescription>
                 <div className="pt-2 flex justify-center items-center h-8">
                     {getWeatherIcon(condition)}
                 </div>
              </CardHeader>
               <CardContent className="p-2 mt-auto">
                  <p className="text-base font-semibold text-primary">{dayForecast.dailyTotalGenerationKWh.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground -mt-1">kWh</p>
              </CardContent>

            </Card>
          );
        })}
      </div>);
   };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <div>
                <h1 className="text-3xl font-bold">Solar Dashboard</h1>
                <p className="text-muted-foreground">Forecasting for: {locationDisplay}</p>
            </div>
            <Button
                onClick={() => refetchWeather()}
                disabled={weatherLoading || weatherRefetching || !isMounted || !settings}
                variant="outline"
            >
                <RefreshCw className={`h-4 w-4 mr-2 ${weatherRefetching ? 'animate-spin' : ''}`} />
                {weatherRefetching ? 'Updating...' : 'Update Forecast'}
            </Button>
       </div>

      {/* Unified Loading State */}
      {(weatherLoading && !isMounted) || (weatherLoading && isMounted && !weatherData) && ( // Show initial loading indicator
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading forecast...</p>
        </div>
      )}

       {/* Weather Fetch Error */}
      {isWeatherError && weatherError && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Forecast</AlertTitle>
          <AlertDescription>{weatherError.message}</AlertDescription>
        </Alert>
      )}

       {/* Settings Missing Alert */}
       {!settings && isMounted && !weatherLoading && !isWeatherError && (
            <Alert>
             <AlertTitle>Welcome to HelioHeggie!</AlertTitle>
             <AlertDescription>
               Please go to the <a href="/settings" className="underline font-medium">Settings page</a> to configure your solar panel system details.
               This is required to calculate your energy forecast.
             </AlertDescription>
            </Alert>
        )}

      {/* Display Forecast Cards and Week Ahead only if not initial loading, no error, and settings exist */}
      {!((weatherLoading && !isMounted) || (weatherLoading && isMounted && !weatherData)) && !isWeatherError && settings && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Use calculatedForecasts state */}
              {renderForecastCard("Today", calculatedForecasts.today)}
              {renderForecastCard("Tomorrow", calculatedForecasts.tomorrow)}
            </div>

             <div className="mt-8">
               <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
               {renderWeeklyForecast()}
             </div>
         </>
       )}

    </div>
  );
}

