
'use client'; // Mark as client component to use hooks

import React, {useState, useEffect} from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
// Update import: Import the function directly
import calculateSolarGeneration, { type CalculatedForecast } from '@/lib/solar-calculations';
import { getWeatherForecast, type WeatherForecast, type WeatherCondition } from '@/services/weather';
import {Loader2, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Droplets} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip} from 'recharts';

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London if no settings

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

export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [forecastData, setForecastData] = useState<{ today: CalculatedForecast | null, tomorrow: CalculatedForecast | null }>({ today: null, tomorrow: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');
  const [weeklyForecast, setWeeklyForecast] = useState<CalculatedForecast[]>([]);

  useEffect(() => {
    const fetchAndCalculateForecast = async () => {
      setLoading(true);
      setError(null);
      let currentLocation = DEFAULT_LOCATION;
      let locationName = 'Default Location (London)';
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      if (settings?.latitude && settings?.longitude) {
        currentLocation = { lat: settings.latitude, lng: settings.longitude };
        locationName = settings.location || `Lat: ${settings.latitude.toFixed(2)}, Lng: ${settings.longitude.toFixed(2)}`;
      } else if (settings?.location) {
        // TODO: Implement geocoding if location string is primary
        // For now, we'll stick to default or coords if available
        locationName = settings.location;
        // Optionally, try to geocode settings.location here
        // If geocoding fails, fall back to default or show error
        console.warn("Location coordinates not available, using default for weather fetch.");
      }
      setLocationDisplay(locationName);


      if (!settings) {
        setError("User settings not found. Please configure your system in the Settings page.");
        setLoading(false);
        return;
      }


      try {
        // Fetch weather for the next 7 days
        const weeklyWeatherRaw: WeatherForecast[] = await getWeatherForecast(currentLocation, 7);

        if (!weeklyWeatherRaw || weeklyWeatherRaw.length === 0) {
          throw new Error("No weather data received from the service.");
        }

        // Filter and calculate for today and tomorrow
        const todayWeather = weeklyWeatherRaw.find(f => f.date === todayStr);
        const tomorrowWeather = weeklyWeatherRaw.find(f => f.date === tomorrowStr);

        // Use the imported function directly
        const todayForecast = todayWeather ? calculateSolarGeneration(todayWeather, settings) : null;
        const tomorrowForecast = tomorrowWeather ? calculateSolarGeneration(tomorrowWeather, settings) : null;


        const weeklyCalculatedForecasts = weeklyWeatherRaw.map(dayWeather => {
          // Ensure calculateSolarGeneration can handle potentially missing weatherCondition
          // Use the imported function directly
          const calculated = calculateSolarGeneration(dayWeather, settings);
          return calculated || { // Provide a default structure if calculation fails
             date: dayWeather.date,
             dailyTotalGenerationKWh: 0,
             hourlyForecast: [],
             weatherCondition: dayWeather.weatherCondition || 'unknown' // Use weather from API or default
          };
        }).filter(Boolean) as CalculatedForecast[]; // Filter out nulls and assert type


        setWeeklyForecast(weeklyCalculatedForecasts);
        setForecastData({ today: todayForecast, tomorrow: tomorrowForecast });

      } catch (err) {
        console.error("Failed to fetch or calculate forecast:", err);
         let errorMessage = "Could not retrieve or calculate solar forecast.";
         if (err instanceof Error) {
             errorMessage += ` Details: ${err.message}`;
         }
         if (!settings) {
             errorMessage = "User settings not found. Please configure your system in the Settings page.";
         } else if (!settings.latitude || !settings.longitude) {
              // This check might be redundant if geocoding is implemented later or default is acceptable
             // errorMessage += " Location coordinates might be missing or invalid.";
         }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculateForecast();
  }, [settings]); // Re-run when settings change

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
    if (!forecast?.hourlyForecast) return [];
    // Filter out potential zero generation hours at start/end for cleaner chart
    const startIndex = forecast.hourlyForecast.findIndex(h => h.estimatedGenerationWh > 0);
    let endIndex = forecast.hourlyForecast.length - 1;
     // Find last non-zero hour from the end
    for (let i = forecast.hourlyForecast.length - 1; i >= 0; i--) {
      if (forecast.hourlyForecast[i].estimatedGenerationWh > 0) {
        endIndex = i;
        break;
      }
    }


    // Ensure startIndex and endIndex are valid before slicing
    if (startIndex === -1) return []; // No generation data
    const relevantHours = forecast.hourlyForecast.slice(startIndex, endIndex + 1);


    return relevantHours.map(h => ({
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
            Estimated Generation: {forecast ? `${forecast.dailyTotalGenerationKWh.toFixed(2)} kWh` : 'N/A'}
          </CardDescription>
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
    if (weeklyForecast.length === 0) {
      return <p className="text-muted-foreground text-center">Weekly forecast data unavailable.</p>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weeklyForecast.map((dayForecast, index) => {
           // Check for invalid date strings
           if (!dayForecast.date || typeof dayForecast.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dayForecast.date)) {
             console.warn("Invalid or missing date encountered in weekly forecast:", dayForecast);
             return (
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
          const condition = dayForecast.weatherCondition || 'unknown'; // Default if missing

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
    <> {/* Wrap in React Fragment */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Solar Dashboard</h1>
        <p className="text-muted-foreground">Forecasting for: {locationDisplay}</p>

        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading forecast...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error Loading Forecast</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderForecastCard("Today", forecastData.today)}
            {renderForecastCard("Tomorrow", forecastData.tomorrow)}
          </div>
        )}
          {!loading && !settings && !error && (
              <Alert>
               <AlertTitle>Welcome to HelioHeggie!</AlertTitle>
               <AlertDescription>
                 Please go to the <a href="/settings" className="underline font-medium">Settings page</a> to configure your solar panel system details.
                 This is required to calculate your energy forecast.
               </AlertDescription>
              </Alert>
          )}
      </div>

      {!loading && !error && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
            {renderWeeklyForecast()}
          </div>
        )}
    </> // Close React Fragment
  );
}
