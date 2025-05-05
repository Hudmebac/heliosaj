'use client'; // Mark as client component to use hooks

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import type { WeatherForecast } from '@/services/weather'; // Import WeatherForecast type
import { getWeatherForecast } from '@/services/weather'; // Assume this is implemented
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations'; // Assume this is implemented
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London if no settings

export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [forecastData, setForecastData] = useState<{ today: CalculatedForecast | null, tomorrow: CalculatedForecast | null }>({ today: null, tomorrow: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');

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
        const weatherResult = await getWeatherForecast(currentLocation); // Assuming it gives at least today/tomorrow

        // Assuming weatherResult is an array like [{ date: 'YYYY-MM-DD', cloudCover: number, ... }, ...]
        // And calculateSolarGeneration handles filtering/processing for today/tomorrow
        if (!settings) {
           setError("User settings not found. Please configure your system in the Settings page.");
           setLoading(false);
           return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const todayWeather = weatherResult.find(f => f.date === todayStr);
        const tomorrowWeather = weatherResult.find(f => f.date === tomorrowStr);

        const todayForecast = todayWeather ? calculateSolarGeneration(todayWeather, settings) : null;
        const tomorrowForecast = tomorrowWeather ? calculateSolarGeneration(tomorrowWeather, settings) : null;


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

  const formatChartData = (forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast) return [];
    return forecast.hourlyForecast.map(h => ({
      time: h.time.split(':')[0] + ':00', // Format time for label
      kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(2)), // Convert Wh to kWh
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
                  <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kWh" />
                   <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                  <Bar dataKey="kWh" fill="var(--color-kWh)" radius={4} />
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


  return (
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
  );
}
