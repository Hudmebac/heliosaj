
'use client'; // Mark as client component to use hooks

import React, {useState, useEffect} from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import SolarService, { type CalculatedForecast } from '../services/SolarService';
import DummyWeatherService from '../services/DummyWeatherService';
import type { WeatherCondition, WeatherForecast } from '../services/WeatherService'
import {Loader2, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Droplets} from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip} from 'recharts';

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London if no settings

const getWeatherIcon = (condition: WeatherCondition) => {
  switch (condition) {
    case 'sunny': return <Sun className="w-6 h-6" />;
    case 'cloudy': return <Cloud className="w-6 h-6" />;
    case 'rainy': return <CloudRain className="w-6 h-6" />;
    case 'snowy': return <CloudSnow className="w-6 h-6" />;
    case 'stormy': return <CloudLightning className="w-6 h-6" />;
    default: return <Droplets className="w-6 h-6" />; // Default icon for unknown conditions
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

      if (settings?.latitude && settings?.longitude) {
        currentLocation = { lat: settings.latitude, lng: settings.longitude };
        locationName = settings.location || `Lat: ${settings.latitude.toFixed(2)}, Lng: ${settings.longitude.toFixed(2)}`;
      } else if (settings?.location) {
        // TODO: Implement geocoding if location string is primary
        // For now, we'll stick to default or coords if available
        locationName = settings.location;
        // Optionally, try to geocode settings.location here
        // If geocoding fails, fall back to default or show error
      }
      setLocationDisplay(locationName);


      try {
        // Fetch weather for today and tomorrow (or a multi-day forecast)
        // Adjust getWeatherForecast if it needs date ranges or count
        const weatherService = new DummyWeatherService();
        const weatherResult = await weatherService.getWeatherForecast(""); // Assuming it gives at least today/tomorrow

        // Get the next 7 days from result
        // We need to get more days if we want a week ahead view
        // Let's assume getWeatherForecast can take a day count
        const weeklyWeatherRaw: WeatherForecast[] = await weatherService.getWeatherForecast(""); // Fetch 7 days


        // Assuming weatherResult is an array like [{ date: 'YYYY-MM-DD', cloudCover: number, ... }, ...]
        // And calculateSolarGeneration handles filtering/processing for today/tomorrow
        if (!settings) {
          setError("User settings not found. Please configure your system in the Settings page.");
          setLoading(false);
          return;
        }
        
        

        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const todayWeather = weeklyWeatherRaw.find(f => f.date === todayStr);
        const tomorrowWeather = weeklyWeatherRaw.find(f => f.date === tomorrowStr);

        const todayForecast = todayWeather ? SolarService.calculateSolarGeneration(todayWeather, settings) : null;
        const tomorrowForecast = tomorrowWeather ? SolarService.calculateSolarGeneration(tomorrowWeather, settings) : null;


        const weeklyCalculatedForecasts = weeklyWeatherRaw.map(dayWeather => {
          // Ensure calculateSolarGeneration can handle potentially missing weatherCondition
          const calculated = SolarService.calculateSolarGeneration(dayWeather, settings);
          return calculated || { // Provide a default structure if calculation fails
             date: dayWeather.date,
             dailyTotalGenerationKWh: 0,
             hourlyForecast: [],
             weatherCondition: 'unknown' // Add a default condition
          };
        }).filter(Boolean) as CalculatedForecast[]; // Filter out nulls and assert type


        setWeeklyForecast(weeklyCalculatedForecasts);

        setForecastData({ today: todayForecast, tomorrow: tomorrowForecast });

      } catch (err) {
        console.error("Failed to fetch or calculate forecast:", err);
        setError("Could not retrieve or calculate solar forecast. Please check your settings and network connection.");
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
            Estimated Generation: {forecast ? `${forecast.dailyTotalGenerationKWh.toFixed(2)} kWh` : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecast && chartData.length > 0 ? (
             <ChartContainer config={{kWh: { label: "kWh", color: "hsl(var(--primary))" }}} className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kWh" />
                  <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel indicator="dot" />} // Use ShadCN tooltip
                    />
                  <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
               </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground">No detailed hourly forecast available.</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderWeeklyForecast = () => {
    if (weeklyForecast.length === 0) return <p className="text-muted-foreground">Weekly forecast data unavailable.</p>;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weeklyForecast.map((dayForecast, index) => {
          const date = new Date(dayForecast.date + 'T00:00:00'); // Ensure date is parsed correctly
           if (isNaN(date.getTime())) {
             console.warn("Invalid date encountered in weekly forecast:", dayForecast.date);
             return null; // Skip rendering if date is invalid
           }

          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const condition = dayForecast.weatherCondition || 'unknown'; // Default if missing

          return (
            <Card key={dayForecast.date || index} className="text-center flex flex-col">
              <CardHeader className="pb-2 pt-3 px-2">
                <CardTitle className="text-sm font-medium">{dayName}</CardTitle>
                 <CardDescription className="text-xs">{date.toLocaleDateString('en-GB', { day:'numeric', month:'short'})}</CardDescription>
                 <div className="pt-2 flex justify-center items-center h-8">
                     {getWeatherIcon(condition)}
                 </div>
              </CardHeader>
               <CardContent className="p-2 mt-auto">
                  <p className="text-sm font-semibold">{dayForecast.dailyTotalGenerationKWh.toFixed(1)} kWh</p>
              </CardContent>

            </Card>
          );
        })}
      </div>);};

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
            <AlertTitle>Error</AlertTitle>
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
                 Please go to the Settings page to configure your solar panel system details.
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
