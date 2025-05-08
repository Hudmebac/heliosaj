'use client';
import React, {useState, useEffect, useMemo, Fragment, useCallback } from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type {UserSettings, ManualDayForecast, ManualForecastInput } from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, Edit3, Sunrise, Sunset, HelpCircle, AlertCircle, BarChart2, LineChart as LineChartIcon, AreaChart as AreaChartIcon } from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {BarChart, AreaChart, LineChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ForecastInfo, sunriseSunsetData, getApproximateSunriseSunset } from '@/components/forecast-info';
import { addDays, format, isValid, parse } from 'date-fns';
import { HowToInfo } from '@/components/how-to-info';
import { useIsMobile } from '@/hooks/use-mobile';

type ChartType = 'bar' | 'line' | 'area';

const getWeatherIcon = (condition: ManualDayForecast['condition'] | undefined) => {
  if (!condition) return <Sun className="w-6 h-6 text-muted-foreground" data-ai-hint="sun icon" />;
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
  const isMobile = useIsMobile();

  const [calculatedForecasts, setCalculatedForecasts] = useState<{
    today: CalculatedForecast | null;
    tomorrow: CalculatedForecast | null;
  }>({ today: null, tomorrow: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(manualForecast);
  const [selectedCityForTimes, setSelectedCityForTimes] = useState<string>("");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');

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

  const calculateAndSetForecasts = useCallback(() => {
    if (!isMounted || !settings ) {
      setCalculatedForecasts({ today: null, tomorrow: null });
      return;
    }
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    let currentManualForecast = manualForecast;

    if(manualForecast.today.date !== todayDateStr || manualForecast.tomorrow.date !== tomorrowDateStr) {
        refreshForecastDates(); 
        return; 
    }

    try {
      const todayCalc = calculateSolarGeneration(currentManualForecast.today, settings);
      const tomorrowCalc = calculateSolarGeneration(currentManualForecast.tomorrow, settings);
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
  }, [isMounted, settings, manualForecast, toast, refreshForecastDates]);


  useEffect(() => {
    calculateAndSetForecasts();
  }, [calculateAndSetForecasts]);


  const handleModalSave = () => {
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

    setManualForecast(editableForecast);
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

 const formatChartData = useCallback((forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast) return [];
    return forecast.hourlyForecast.map(h => ({
        time: h.time.split(':')[0] + ':00', 
        kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(2))
    }));
  }, []);


  const todayChartData = useMemo(() => formatChartData(calculatedForecasts.today), [calculatedForecasts.today, formatChartData]);
  const tomorrowChartData = useMemo(() => formatChartData(calculatedForecasts.tomorrow), [calculatedForecasts.tomorrow, formatChartData]);

  const getMaxYValue = useCallback((chartData: Array<{ time: string; kWh: number }>) => {
    if (!chartData || chartData.length === 0) return 0.5;
    const maxKWh = Math.max(...chartData.map(d => d.kWh), 0);
    if (maxKWh === 0) return 0.5; // If all values are 0
    return Math.ceil(maxKWh / 0.25) * 0.25 + 0.25; // Ensure max tick is above highest value and is multiple of 0.25
  }, []);


  const todayMaxY = useMemo(() => getMaxYValue(todayChartData), [todayChartData, getMaxYValue]);
  const tomorrowMaxY = useMemo(() => getMaxYValue(tomorrowChartData), [tomorrowChartData, getMaxYValue]);

  const getYAxisTicks = useCallback((maxYValueForChart: number) => {
    if (maxYValueForChart <= 0) return [0];
    const ticks: number[] = [];
    for (let i = 0; i <= maxYValueForChart; i += 0.25) {
        ticks.push(parseFloat(i.toFixed(2)));
    }
    // Ensure the maxYValueForChart itself is a tick if not perfectly divisible
    if (ticks[ticks.length -1] < maxYValueForChart && maxYValueForChart % 0.25 !== 0) {
        ticks.push(parseFloat((Math.ceil(maxYValueForChart / 0.25) * 0.25).toFixed(2)));
    }
    return Array.from(new Set(ticks)); 
  }, []);


  const todayYAxisTicks = useMemo(() => getYAxisTicks(todayMaxY), [todayMaxY, getYAxisTicks]);
  const tomorrowYAxisTicks = useMemo(() => getYAxisTicks(tomorrowMaxY), [tomorrowMaxY, getYAxisTicks]);
  
  const calculateChartXTicks = useCallback((chartData: Array<{ time: string; kWh: number }>) => {
    if (!chartData || chartData.length === 0) return undefined; 

    const allHoursInData = Array.from(new Set(chartData.map(d => d.time)));
    allHoursInData.sort((a, b) => parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]));
    
    return allHoursInData.length > 0 ? allHoursInData : undefined;
  }, []);


  const todayChartXTicks = useMemo(() => calculateChartXTicks(todayChartData), [todayChartData, calculateChartXTicks]);
  const tomorrowChartXTicks = useMemo(() => calculateChartXTicks(tomorrowChartData), [tomorrowChartData, calculateChartXTicks]);


  const renderForecastCard = useCallback((
    title: string,
    forecastData: CalculatedForecast | null,
    manualDayData: ManualDayForecast | null,
    chartDataToDisplay: Array<{ time: string; kWh: number }>,
    maxYValueForChart: number,
    yAxisTicksForChart: number[],
    chartXTicksForChart: string[] | undefined
  ) => {
    if (!manualDayData) {
      return (
        <Card>
          <CardHeader><CardTitle>{title} Forecast</CardTitle></CardHeader>
          <CardContent><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading data...</CardContent>
        </Card>
      );
    }

    const weatherIcon = getWeatherIcon(manualDayData?.condition);

    const generationValue = forecastData?.dailyTotalGenerationKWh;
    const displayGeneration = (typeof generationValue === 'number' && !isNaN(generationValue))
      ? `${generationValue.toFixed(2)} kWh`
      : 'N/A';

    const conditionText = manualDayData?.condition ? manualDayData.condition.replace(/_/g, ' ') : 'N/A';

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
        } else if (chartDataToDisplay.length === 0 || !chartDataToDisplay.some(d=>d.kWh > 0.00001)) {
             chartPlaceholderMessage = "No significant solar generation is expected based on inputs. Please check inputs and factors.";
        }
    }
    
    const xAxisHeight = 50; 

    const renderChart = () => {
      const commonProps = {
        data: chartDataToDisplay,
        margin: { top: 5, right: 20, left: 0, bottom: xAxisHeight - 20 }, // Adjusted margins
      };
      const commonYAxisProps = {
        fontSize: 10,
        tickLine: false,
        axisLine: false,
        stroke: "hsl(var(--muted-foreground))",
        domain: [0, maxYValueForChart] as [number, number],
        allowDecimals: true,
        tickFormatter: (value: number) => value.toFixed(2),
        width: 40, // Adjusted width for Y-axis labels
        ticks: yAxisTicksForChart,
      };
      const commonXAxisProps = {
        dataKey: "time",
        tickLine: true,
        axisLine: false,
        stroke: "hsl(var(--muted-foreground))",
        ticks: chartXTicksForChart, 
        tickFormatter: (value: string) => value ? `${parseInt(value.split(':')[0]) % 12 || 12}${parseInt(value.split(':')[0]) >= 12 ? 'pm' : 'am'}`: '',
        interval: 'preserveStartEnd', 
        angle: -45, // Slightly less steep angle for better readability
        textAnchor: 'end' as const,
        dx: -5, 
        dy: 5, 
        height: xAxisHeight, 
        fontSize: 10,
      };

      const customTooltip = (props: any) => {
        const { active, payload, label } = props;
        if (active && payload && payload.length) {
          return (
            <div className="p-2 bg-background border border-border rounded-md shadow-lg">
              <p className="label text-sm font-semibold">{`${parseInt(label.split(':')[0]) % 12 || 12}${parseInt(label.split(':')[0]) >= 12 ? 'pm' : 'am'}`}</p>
              <p className="intro text-xs text-primary">{`Generation: ${payload[0].value.toFixed(2)} kWh`}</p>
            </div>
          );
        }
        return null;
      };

      switch (selectedChartType) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis {...commonXAxisProps} />
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} />
              <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Line type="monotone" dataKey="kWh" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} yAxisId="left" />
            </LineChart>
          );
        case 'area':
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis {...commonXAxisProps} />
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} />
              <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Area type="monotone" dataKey="kWh" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} yAxisId="left"/>
            </AreaChart>
          );
        case 'bar':
        default:
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis {...commonXAxisProps} />
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} />
              <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={4} yAxisId="left" />
            </BarChart>
          );
      }
    };


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
                {forecastData && !forecastData.errorMessage && chartDataToDisplay.length > 0 && chartDataToDisplay.some(d=>d.kWh > 0.00001) ? (
                    <ChartContainer config={{kWh: { label: "Generation (kWh)", color: "hsl(var(--primary))" }}} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           {renderChart()}
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col justify-center items-center h-[300px] text-center p-4">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">
                           {chartPlaceholderMessage}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }, [isMounted, settings, selectedChartType]); 

 const isValidDateString = (dateStr: string | undefined): dateStr is string => {
    if (!dateStr) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isValid(date);
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row">
           <div className="mb-4 sm:mb-0">
                <h1 className="text-3xl font-bold">Solar Dashboard</h1>
                <p className="text-muted-foreground">Forecasting for: {isMounted ? locationDisplay : 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <HowToInfo pageKey="dashboard" />
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
                      const dayData = editableForecast[dayKey];
                      const dayDateStr = dayData?.date;

                      return (
                        <div key={dayKey} className="space-y-3 p-3 border rounded-md">
                           <div className="space-y-1">
                              <h3 className="font-bold text-lg capitalize">{dayKey}</h3>
                              {dayData && isValidDateString(dayDateStr) ? (
                                  <>
                                      <p className="text-muted-foreground">
                                          {format(parse(dayDateStr, 'yyyy-MM-dd', new Date()), 'EEEE')}
                                      </p>
                                      <p className="text-muted-foreground">
                                          {format(parse(dayDateStr, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')}
                                      </p>
                                  </>
                              ) : (
                                  <p className="text-muted-foreground text-destructive">
                                    Date for {dayKey} is invalid or not loaded.
                                  </p>
                              )}
                           </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`${dayKey}-sunrise`}>Sunrise (HH:MM)</Label>
                              <Input
                                id={`${dayKey}-sunrise`}
                                type="time"
                                value={dayData?.sunrise || ''}
                                onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunrise: e.target.value}}))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`${dayKey}-sunset`}>Sunset (HH:MM)</Label>
                              <Input
                                id={`${dayKey}-sunset`}
                                type="time"
                                value={dayData?.sunset || ''}
                                onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunset: e.target.value}}))}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${dayKey}-condition`}>Weather Condition</Label>
                            <Select
                              value={dayData?.condition || 'sunny'}
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

        <div className="flex justify-end mb-4">
          <Select value={selectedChartType} onValueChange={(value) => setSelectedChartType(value as ChartType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar"><BarChart2 className="inline h-4 w-4 mr-2" />Bar Chart</SelectItem>
              <SelectItem value="line"><LineChartIcon className="inline h-4 w-4 mr-2" />Line Chart</SelectItem>
              <SelectItem value="area"><AreaChartIcon className="inline h-4 w-4 mr-2" />Area Chart</SelectItem>
            </SelectContent>
          </Select>
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
                    {renderForecastCard("Today", calculatedForecasts.today, manualForecast.today, todayChartData, todayMaxY, todayYAxisTicks, todayChartXTicks)}
                    {renderForecastCard("Tomorrow", calculatedForecasts.tomorrow, manualForecast.tomorrow, tomorrowChartData, tomorrowMaxY, tomorrowYAxisTicks, tomorrowChartXTicks)}
                </div>
                 {isMounted && (!settings.selectedWeatherSource || settings.selectedWeatherSource === 'manual') && !isMobile && (
                  <div className="mt-8">
                      <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
                       <p className="text-sm text-muted-foreground mt-2">Week ahead forecast is not available with manual input mode. Future updates may integrate API options for extended forecasts.</p>
                  </div>
                )}
            </>
        )}
    </div>
  );
}
