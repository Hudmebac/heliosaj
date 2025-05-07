
'use client';
import React, {useState, useEffect, useMemo, Fragment } from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type {UserSettings, ManualDayForecast, ManualForecastInput} from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, Edit3, Sunrise, Sunset, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltipContent} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ForecastInfo, sunriseSunsetData, getApproximateSunriseSunset } from '@/components/forecast-info'; // Import the new component and data
import { addDays, format } from 'date-fns';
import { HowToInfo } from '@/components/how-to-info';

const getWeatherIcon = (condition: ManualDayForecast['condition'] | undefined) => {
  if (!condition) return <Sun className="w-6 h-6 text-muted-foreground" data-ai-hint="sun icon" />; // Default to Sun or a generic icon
  switch (condition) {
    case 'sunny': return <Sun className="w-6 h-6 text-yellow-500" data-ai-hint="sun weather" />;
    case 'partly_cloudy': return <Cloud className="w-6 h-6 text-yellow-400" data-ai-hint="cloudy sun" />;
    case 'cloudy': return <Cloud className="w-6 h-6 text-gray-500" data-ai-hint="cloud icon" />;
    case 'overcast': return <Cloud className="w-6 h-6 text-gray-700" data-ai-hint="dark cloud" />;
    case 'rainy': return <CloudRain className="w-6 h-6 text-blue-500" data-ai-hint="rain cloud" />;
    default: return <Sun className="w-6 h-6 text-muted-foreground" data-ai-hint="weather icon" />;
  }
};

export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [manualForecast, setManualForecast, refreshForecastDates] = useManualForecast();
  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [calculatedForecasts, setCalculatedForecasts] = useState<{
    today: CalculatedForecast | null;
    tomorrow: CalculatedForecast | null;
  }>({ today: null, tomorrow: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(manualForecast);
  const [selectedCityForTimes, setSelectedCityForTimes] = useState<string>("");


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
    if (!isMounted || !settings ) {
      setCalculatedForecasts({ today: null, tomorrow: null });
      return;
    }
    // Ensure manualForecast has valid dates before calculating
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if(manualForecast.today.date !== todayDateStr || manualForecast.tomorrow.date !== tomorrowDateStr) {
        // This condition might occur if useManualForecast hasn't updated its state yet after a date change.
        // The calculation will re-run when manualForecast updates.
        // Or user can click refresh button.
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

    // Validate sunrise is before sunset
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

    setManualForecast(editableForecast); // This will trigger the useEffect for calculation
    setIsModalOpen(false);
    toast({
      title: "Forecast Updated",
      description: "Manual weather forecast has been saved.",
    });
  };

  const handleCityTimeSelect = (cityName: string) => {
    setSelectedCityForTimes(cityName);
    if (!cityName) return;

    const todayDate = new Date();
    const tomorrowDate = addDays(todayDate, 1);

    const todayTimes = getApproximateSunriseSunset(cityName, todayDate);
    const tomorrowTimes = getApproximateSunriseSunset(cityName, tomorrowDate);

    setEditableForecast(prev => ({
      ...prev,
      today: {
        ...prev.today,
        sunrise: todayTimes?.sunrise || prev.today.sunrise,
        sunset: todayTimes?.sunset || prev.today.sunset,
      },
      tomorrow: {
        ...prev.tomorrow,
        sunrise: tomorrowTimes?.sunrise || prev.tomorrow.sunrise,
        sunset: tomorrowTimes?.sunset || prev.tomorrow.sunset,
      }
    }));
  };

  const formatChartData = (forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast || forecast.hourlyForecast.length === 0) return [];
    return forecast.hourlyForecast.map(h => ({
      time: h.time.split(':')[0] + ':00',
      kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(3)) // Use toFixed(3) for better precision
    }));
  };

  const renderForecastCard = (title: string, forecastData: CalculatedForecast | null, manualDayData: ManualDayForecast) => {
    const chartData = formatChartData(forecastData);
    const weatherIcon = getWeatherIcon(manualDayData?.condition); // Ensure manualDayData exists

    const generationValue = forecastData?.dailyTotalGenerationKWh;
    const displayGeneration = (typeof generationValue === 'number' && !isNaN(generationValue))
      ? `${generationValue.toFixed(2)} kWh`
      : 'N/A';
    
    const conditionText = manualDayData?.condition ? manualDayData.condition.replace(/_/g, ' ') : 'Condition N/A';
    
    let chartPlaceholderMessage = '';
    if (!isMounted) {
        chartPlaceholderMessage = 'Loading forecast data...';
    } else if (!settings) {
        chartPlaceholderMessage = 'Forecast data unavailable. Please configure your system in Settings first.';
    } else if (forecastData?.errorMessage) {
        chartPlaceholderMessage = forecastData.errorMessage;
    } else if (!forecastData) {
        chartPlaceholderMessage = 'Calculating forecast... Ensure manual forecast inputs are saved.';
    } else { 
        if (!manualDayData || !manualDayData.sunrise || !manualDayData.sunset || manualDayData.sunrise >= manualDayData.sunset) {
            chartPlaceholderMessage = "Invalid sunrise/sunset times. Please ensure sunrise is before sunset in the forecast settings.";
        } else if (!forecastData.hourlyForecast || forecastData.hourlyForecast.length === 0) {
            chartPlaceholderMessage = "Hourly forecast data could not be generated. Check system settings (e.g., panel power) and forecast inputs.";
        } else if (chartData.length === 0 || !chartData.some(d => d.kWh > 0)) { // Check if any kWh > 0
             chartPlaceholderMessage = "No significant solar generation is expected, or data is too small to display. Please check inputs and factors.";
        }
    }


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{title} Forecast</CardTitle>
                        <CardDescription>
                            Est. Generation: {displayGeneration}
                            {` (${conditionText})`}
                        </CardDescription>
                    </div>
                    <div className="text-2xl">
                        {weatherIcon}
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                        <Sunrise className="w-3 h-3"/> {manualDayData?.sunrise || 'N/A'}
                    </span>
                    <span className="flex items-center gap-1">
                        <Sunset className="w-3 h-3"/> {manualDayData?.sunset || 'N/A'}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                {forecastData && !forecastData.errorMessage && chartData.length > 0 && chartData.some(d => d.kWh > 0) ? (
                    <ChartContainer config={{kWh: { label: "kWh", color: "hsl(var(--primary))" }}} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                                <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="kWh" stroke="hsl(var(--muted-foreground))" domain={[0, 'auto']} />
                                <ChartTooltipContent
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel indicator="dot" />}
                                />
                                <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col justify-center items-center h-[250px] text-center p-4">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">
                           {chartPlaceholderMessage}
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
                     <Sun className="w-6 h-6 text-muted-foreground/50" data-ai-hint="weather sun" />
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

 const handleRefreshForecast = () => {
    refreshForecastDates(); // This will update dates in localStorage and trigger re-calculations
    toast({
      title: "Forecast Dates Refreshed",
      description: "Manual forecast dates have been updated to today and tomorrow. Recalculating generation...",
    });
  };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
           <div>
                <h1 className="text-3xl font-bold">Solar Dashboard</h1>
                <p className="text-muted-foreground">Forecasting for: {isMounted ? locationDisplay : 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-2">
              <HowToInfo pageKey="dashboard" />
              <Button
                onClick={handleRefreshForecast}
                disabled={!isMounted}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Forecast Dates
              </Button>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={!isMounted}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Manual Forecast
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Manual Weather Forecast</DialogTitle>
                    <DialogDescription>
                      Input sunrise, sunset, and weather conditions for today and tomorrow.
                      Or, select a city to pre-fill approximate sunrise/sunset times.
                      For general weather conditions, you can refer to sites like {' '}
                      <a href="https://weather.com/en-GB/weather/today" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">weather.com</a>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="city-time-select">Apply Approx. Times from City</Label>
                        <Select value={selectedCityForTimes} onValueChange={handleCityTimeSelect}>
                            <SelectTrigger id="city-time-select">
                                <SelectValue placeholder="Select city for sunrise/sunset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sunriseSunsetData.map(city => (
                                    <SelectItem key={city.city} value={city.city}>
                                        {city.city}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
                     <div className="mt-4 border-t pt-4">
                      <ForecastInfo />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleModalSave}>Save Forecast</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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

