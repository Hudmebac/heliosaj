
'use client';
import React, {useState, useEffect, useMemo, Fragment } from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type {UserSettings, ManualDayForecast, ManualForecastInput} from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, Edit3, Sunrise, Sunset } from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltipContent} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const getWeatherIcon = (condition: ManualDayForecast['condition'] | undefined) => {
  if (!condition) return <Sun className="w-6 h-6 text-muted-foreground" />; // Default to Sun or a generic icon
  switch (condition) {
    case 'sunny': return <Sun className="w-6 h-6 text-yellow-500" />;
    case 'partly_cloudy': return <Cloud className="w-6 h-6 text-yellow-400" />;
    case 'cloudy': return <Cloud className="w-6 h-6 text-gray-500" />;
    case 'overcast': return <Cloud className="w-6 h-6 text-gray-700" />;
    case 'rainy': return <CloudRain className="w-6 h-6 text-blue-500" />;
    default: return <Sun className="w-6 h-6 text-muted-foreground" />;
  }
};

export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [manualForecast, setManualForecast] = useManualForecast();
  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [calculatedForecasts, setCalculatedForecasts] = useState<{
    today: CalculatedForecast | null;
    tomorrow: CalculatedForecast | null;
  }>({ today: null, tomorrow: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(manualForecast);

  useEffect(() => {
    setIsMounted(true);
    if (settings?.latitude && settings?.longitude) {
        setLocationDisplay(settings.location || `Lat: ${settings.latitude.toFixed(2)}, Lng: ${settings.longitude.toFixed(2)}`);
    } else if (settings?.location) {
        setLocationDisplay(settings.location);
    } else {
        setLocationDisplay('Location Not Set');
    }
  }, [settings]);

  useEffect(() => {
    setEditableForecast(manualForecast);
  }, [manualForecast]);

  useEffect(() => {
    if (!isMounted || !settings) {
      setCalculatedForecasts({ today: null, tomorrow: null });
      return;
    }
    try {
      const todayCalc = calculateSolarGeneration(manualForecast.today, settings);
      const tomorrowCalc = calculateSolarGeneration(manualForecast.tomorrow, settings);
      setCalculatedForecasts({ today: todayCalc, tomorrow: tomorrowCalc });
    } catch (calcError) {
      console.error("Error calculating solar generation:", calcError);
      toast({
        title: "Calculation Error",
        description: "Could not calculate solar generation based on current inputs.",
        variant: "destructive",
      });
      setCalculatedForecasts({ today: null, tomorrow: null });
    }
  }, [isMounted, settings, manualForecast, toast]);

  const handleModalSave = () => {
    // Basic validation for time format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(editableForecast.today.sunrise) || !timeRegex.test(editableForecast.today.sunset) ||
        !timeRegex.test(editableForecast.tomorrow.sunrise) || !timeRegex.test(editableForecast.tomorrow.sunset)) {
      toast({
        title: "Invalid Time Format",
        description: "Please use HH:MM for sunrise and sunset times.",
        variant: "destructive",
      });
      return;
    }
    setManualForecast(editableForecast);
    setIsModalOpen(false);
    toast({
      title: "Forecast Updated",
      description: "Manual weather forecast has been saved.",
    });
  };

  const formatChartData = (forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast || forecast.hourlyForecast.length === 0) return [];
    return forecast.hourlyForecast.map(h => ({
      time: h.time.split(':')[0] + ':00',
      kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(2))
    }));
  };

  const renderForecastCard = (title: string, forecastData: CalculatedForecast | null, manualDayData: ManualDayForecast) => {
    const chartData = formatChartData(forecastData);
    const weatherIcon = getWeatherIcon(manualDayData.condition);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{title} Forecast</CardTitle>
                        <CardDescription>
                            Est. Generation: {forecastData ? `${forecastData.dailyTotalGenerationKWh.toFixed(2)} kWh` : 'N/A'}
                            {` (${manualDayData.condition.replace('_', ' ')})`}
                        </CardDescription>
                    </div>
                    <div className="text-2xl">
                        {weatherIcon}
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                        <Sunrise className="w-3 h-3"/> {manualDayData.sunrise}
                    </span>
                    <span className="flex items-center gap-1">
                        <Sunset className="w-3 h-3"/> {manualDayData.sunset}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {forecastData && chartData.length > 0 && chartData.some(d => d.kWh > 0) ? (
                    <ChartContainer config={{kWh: { label: "kWh", color: "hsl(var(--primary))" }}} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kWh" stroke="hsl(var(--muted-foreground))" />
                                <ChartTooltipContent
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
                            {forecastData ? 'No significant generation expected or data missing for chart.' : 'Forecast data unavailable.'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  };

 const renderWeeklyForecastPlaceholder = () => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, index) => (
            <Card key={`placeholder-${index}`} className="text-center flex flex-col bg-muted/50">
              <CardHeader className="pb-2 pt-3 px-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Day {index + 1}</CardTitle>
                 <CardDescription className="text-xs text-muted-foreground">N/A</CardDescription>
                 <div className="pt-2 flex justify-center items-center h-8">
                     <Sun className="w-6 h-6 text-muted-foreground/50" />
                 </div>
               </CardHeader>
               <CardContent className="p-2 mt-auto">
                    <p className="text-base font-semibold text-muted-foreground/70">--</p>
                    <p className="text-xs text-muted-foreground -mt-1">kWh</p>
              </CardContent>
            </Card>
          ))}
      </div>);
   };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <div>
                <h1 className="text-3xl font-bold">Solar Dashboard</h1>
                <p className="text-muted-foreground">Forecasting for: {isMounted ? locationDisplay : 'Loading...'}</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!isMounted}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Manual Forecast
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Edit Manual Weather Forecast</DialogTitle>
                  <DialogDescription>
                    Input sunrise, sunset, and weather conditions for today and tomorrow. This will be used for solar generation estimates.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {(['today', 'tomorrow'] as const).map((dayKey) => {
                    return (
                      <div key={dayKey} className="space-y-3 p-3 border rounded-md">
                        <h3 className="font-semibold text-lg capitalize">{dayKey} ({editableForecast[dayKey].date})</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`${dayKey}-sunrise`}>Sunrise (HH:MM)</Label>
                            <Input
                              id={`${dayKey}-sunrise`}
                              type="time"
                              value={editableForecast[dayKey].sunrise}
                              onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunrise: e.target.value}}))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${dayKey}-sunset`}>Sunset (HH:MM)</Label>
                            <Input
                              id={`${dayKey}-sunset`}
                              type="time"
                              value={editableForecast[dayKey].sunset}
                              onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunset: e.target.value}}))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`${dayKey}-condition`}>Weather Condition</Label>
                          <Select
                            value={editableForecast[dayKey].condition}
                            onValueChange={(value) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], condition: value as ManualDayForecast['condition']}}))}
                          >
                            <SelectTrigger id={`${dayKey}-condition`}>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sunny">Sunny</SelectItem>
                              <SelectItem value="partly_cloudy">Partly Cloudy</SelectItem>
                              <SelectItem value="cloudy">Cloudy</SelectItem>
                              <SelectItem value="overcast">Overcast</SelectItem>
                              <SelectItem value="rainy">Rainy</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleModalSave}>Save Forecast</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>

      {!isMounted && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading dashboard...</p>
        </div>
      )}

       {!settings && isMounted && (
            <Alert>
             <AlertTitle>Welcome to HelioHeggie!</AlertTitle>
             <AlertDescription>
               Please go to the <a href="/settings" className="underline font-medium">Settings page</a> to configure your solar panel system details.
               This is required to calculate your energy forecast using manual inputs.
             </AlertDescription>
            </Alert>
        )}

        {isMounted && settings && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderForecastCard("Today", calculatedForecasts.today, manualForecast.today)}
                    {renderForecastCard("Tomorrow", calculatedForecasts.tomorrow, manualForecast.tomorrow)}
                </div>
                <div className="mt-8">
                    <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
                    {renderWeeklyForecastPlaceholder()}
                    <p className="text-sm text-muted-foreground mt-2">Note: Week ahead forecast is not available with manual input mode. Future updates may integrate more detailed input or API options.</p>
                </div>
            </>
        )}
    </div>
  );
}
