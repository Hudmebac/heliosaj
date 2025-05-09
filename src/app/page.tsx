
'use client';
import React, {useState, useEffect, useMemo, useCallback } from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type {UserSettings, ManualDayForecast, ManualForecastInput } from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, Edit3, Sunrise, Sunset, AlertCircle, BarChart2, LineChart as LineChartIcon, AreaChart as AreaChartIcon, RefreshCw, Thermometer, Wind, Droplets, Eye } from 'lucide-react';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {ChartContainer} from "@/components/ui/chart";
import { Button } from '@/components/ui/button';
import {BarChart, AreaChart, LineChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { addDays, format, isValid, parse, parseISO } from 'date-fns';
import { HowToInfo } from '@/components/how-to-info';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWeatherForecast } from '@/hooks/use-weather-forecast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DailyWeather, HourlyWeather } from '@/types/weather'; // Removed ManualForecastCondition as it's covered by settings
import { ManualForecastModal } from '@/components/manual-forecast-modal';
import { mapWmoCodeToManualForecastCondition, WMO_CODE_MAP } from '@/types/weather';


type ChartType = 'bar' | 'line' | 'area';

const getWeatherIconFromString = (conditionString: string | undefined) => {
  if (!conditionString) return <Sun className="w-6 h-6 text-muted-foreground" data-ai-hint="sun icon" />;
  const condition = conditionString.toLowerCase();
  if (condition.includes('sunny') || condition.includes('clear')) return <Sun className="w-6 h-6 text-yellow-500" data-ai-hint="sun weather" />;
  if (condition.includes('partly cloudy') || condition.includes('mainly sunny')) return <Cloud className="w-6 h-6 text-yellow-400" data-ai-hint="cloudy sun" />;
  if (condition.includes('cloudy')) return <Cloud className="w-6 h-6 text-gray-500" data-ai-hint="cloud icon" />;
  if (condition.includes('overcast') || condition.includes('fog')) return <Cloud className="w-6 h-6 text-gray-700" data-ai-hint="dark cloud" />;
  if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('showers')) return <CloudRain className="w-6 h-6 text-blue-500" data-ai-hint="rain cloud" />;
  return <Sun className="w-6 h-6 text-muted-foreground" data-ai-hint="weather icon" />;
};


export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [manualForecast, setManualForecast] = useManualForecast();

  const [locationDisplay, setLocationDisplay] = useState<string>('Default Location');
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const {
    weatherForecastData,
    weatherLoading,
    weatherError,
    refetchWeather,
    weatherRefetching,
    isApiSourceSelected,
    locationAvailable,
  } = useWeatherForecast();

  const [todayCalculatedForecast, setTodayCalculatedForecast] = useState<CalculatedForecast | null>(null);
  const [tomorrowCalculatedForecast, setTomorrowCalculatedForecast] = useState<CalculatedForecast | null>(null);
  
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
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
    if (!isMounted || !settings) {
      setTodayCalculatedForecast(null);
      setTomorrowCalculatedForecast(null);
      return;
    }

    let todayInput: ManualDayForecast | null = null;
    let tomorrowInput: ManualDayForecast | null = null;

    if (isApiSourceSelected && weatherForecastData && weatherForecastData.todayForecast && weatherForecastData.tomorrowForecast) {
        const apiToday = weatherForecastData.todayForecast;
        todayInput = {
          date: apiToday.date, // This should be YYYY-MM-DD string
          sunrise: apiToday.sunrise ? format(parseISO(apiToday.sunrise), 'HH:mm') : '06:00',
          sunset: apiToday.sunset ? format(parseISO(apiToday.sunset), 'HH:mm') : '18:00',
          condition: mapWmoCodeToManualForecastCondition(apiToday.weather_code),
        };
      
        const apiTomorrow = weatherForecastData.tomorrowForecast;
        tomorrowInput = {
          date: apiTomorrow.date, // This should be YYYY-MM-DD string
          sunrise: apiTomorrow.sunrise ? format(parseISO(apiTomorrow.sunrise), 'HH:mm') : '06:00',
          sunset: apiTomorrow.sunset ? format(parseISO(apiTomorrow.sunset), 'HH:mm') : '18:00',
          condition: mapWmoCodeToManualForecastCondition(apiTomorrow.weather_code),
        };
    } else if (!isApiSourceSelected) {
      todayInput = manualForecast.today;
      tomorrowInput = manualForecast.tomorrow;
    }

    if (todayInput) {
      setTodayCalculatedForecast(calculateSolarGeneration(todayInput, settings));
    } else {
      setTodayCalculatedForecast(null);
    }

    if (tomorrowInput) {
      setTomorrowCalculatedForecast(calculateSolarGeneration(tomorrowInput, settings));
    } else {
      setTomorrowCalculatedForecast(null);
    }

  }, [isMounted, settings, weatherForecastData, manualForecast, isApiSourceSelected]);

  const formatChartData = useCallback((forecast: CalculatedForecast | null) => {
    if (!forecast?.hourlyForecast) return [];
    return forecast.hourlyForecast.map(h => ({
        time: h.time.split(':')[0] + ':00', 
        kWh: parseFloat((h.estimatedGenerationWh / 1000).toFixed(2))
    }));
  }, []);

  const todayChartData = useMemo(() => formatChartData(todayCalculatedForecast), [todayCalculatedForecast, formatChartData]);
  const tomorrowChartData = useMemo(() => formatChartData(tomorrowCalculatedForecast), [tomorrowCalculatedForecast, formatChartData]);

  const getMaxYValue = useCallback((chartData: Array<{ time: string; kWh: number }>) => {
    if (!chartData || chartData.length === 0) return 0.5;
    const maxKWh = Math.max(...chartData.map(d => d.kWh), 0);
    if (maxKWh === 0) return 0.5; 
    return Math.ceil(maxKWh / 0.25) * 0.25 + 0.25; 
  }, []);

  const todayMaxY = useMemo(() => getMaxYValue(todayChartData), [todayChartData, getMaxYValue]);
  const tomorrowMaxY = useMemo(() => getMaxYValue(tomorrowChartData), [tomorrowChartData, getMaxYValue]);

  const getYAxisTicks = useCallback((maxYValueForChart: number) => {
    if (maxYValueForChart <= 0) return [0];
    const ticks: number[] = [];
    for (let i = 0; i <= maxYValueForChart; i += 0.25) {
        ticks.push(parseFloat(i.toFixed(2)));
    }
    if (ticks.length > 0 && ticks[ticks.length -1] < maxYValueForChart && maxYValueForChart % 0.25 !== 0) {
        ticks.push(parseFloat((Math.ceil(maxYValueForChart / 0.25) * 0.25).toFixed(2)));
    } else if (ticks.length === 0 && maxYValueForChart > 0) { 
        ticks.push(0, parseFloat(maxYValueForChart.toFixed(2)));
    }
    return Array.from(new Set(ticks));
  }, []);

  const todayYAxisTicks = useMemo(() => getYAxisTicks(todayMaxY), [todayMaxY, getYAxisTicks]);
  const tomorrowYAxisTicks = useMemo(() => getYAxisTicks(tomorrowMaxY), [tomorrowMaxY, getYAxisTicks]);

  const calculateChartXTicks = useCallback((chartData: Array<{ time: string; kWh: number }>) => {
    if (!chartData || chartData.length === 0) return undefined; 

    const hoursWithGeneration = chartData
        .filter(d => d.kWh > 0.00001) 
        .map(d => d.time);

    if (hoursWithGeneration.length === 0) return undefined; 

    let uniqueHours = Array.from(new Set(hoursWithGeneration));
    uniqueHours.sort((a, b) => parseInt(a.split(':')[0]) - parseInt(b.split(':')[0])); 
    
    // If few hours, show all. Otherwise, show a max of ~8 ticks.
    if (uniqueHours.length <= 8) return uniqueHours;

    const step = Math.max(1, Math.floor(uniqueHours.length / 7)); // Aim for around 7-8 ticks
    const ticksToShow: string[] = [];
    for (let i = 0; i < uniqueHours.length; i += step) {
        ticksToShow.push(uniqueHours[i]);
    }
    // Ensure the last generating hour is always included if not caught by step
    if (uniqueHours.length > 0 && !ticksToShow.includes(uniqueHours[uniqueHours.length - 1])) {
        ticksToShow.push(uniqueHours[uniqueHours.length - 1]);
    }
    return Array.from(new Set(ticksToShow)); // Ensure uniqueness again after adding last hour
  }, []);

  const todayChartXTicks = useMemo(() => calculateChartXTicks(todayChartData), [todayChartData, calculateChartXTicks]);
  const tomorrowChartXTicks = useMemo(() => calculateChartXTicks(tomorrowChartData), [tomorrowChartData, calculateChartXTicks]);

  const renderForecastCard = useCallback((
    title: string,
    calculatedDayForecast: CalculatedForecast | null, 
    apiDayData: DailyWeather | null, 
    manualDayData: ManualDayForecast | null, 
    chartDataToDisplay: Array<{ time: string; kWh: number }>,
    maxYValueForChart: number,
    yAxisTicksForChart: number[],
    chartXTicksForChart: string[] | undefined
  ) => {
    if ((isApiSourceSelected && (weatherLoading || weatherRefetching)) || (!isMounted && isApiSourceSelected)) {
      return (
        <Card>
          <CardHeader><CardTitle>{title} Forecast</CardTitle></CardHeader>
          <CardContent className="h-[300px] flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading data...</CardContent>
        </Card>
      );
    }
    
    const displaySource = isApiSourceSelected ? apiDayData : manualDayData;
    
    if (!displaySource) {
        return (
            <Card>
                 <CardHeader><CardTitle>{title} Forecast</CardTitle></CardHeader>
                 <CardContent className="h-[300px] flex justify-center items-center text-center">
                     <div>
                        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 mx-auto" />
                        <p className="text-muted-foreground text-sm">Forecast data unavailable. Check settings or select a data source.</p>
                     </div>
                 </CardContent>
            </Card>
        )
    }

    const weatherIcon = getWeatherIconFromString(isApiSourceSelected ? apiDayData?.weatherConditionString : manualDayData?.condition.replace(/_/g, ' '));
    const generationValue = calculatedDayForecast?.dailyTotalGenerationKWh;
    const displayGeneration = (typeof generationValue === 'number' && !isNaN(generationValue))
      ? `${generationValue.toFixed(2)} kWh`
      : 'N/A';
    
    const conditionText = (isApiSourceSelected ? apiDayData?.weatherConditionString : manualDayData?.condition.replace(/_/g, ' ')) || 'N/A';
    
    const sunriseTime = displaySource.sunrise ? (displaySource.sunrise.includes('T') ? format(parseISO(displaySource.sunrise), 'HH:mm') : displaySource.sunrise) : 'N/A';
    const sunsetTime = displaySource.sunset ? (displaySource.sunset.includes('T') ? format(parseISO(displaySource.sunset), 'HH:mm') : displaySource.sunset) : 'N/A';


    let chartPlaceholderMessage = '';
    if (!isMounted && (weatherLoading || weatherRefetching)) {
        chartPlaceholderMessage = 'Loading forecast data...';
    } else if (!settings) {
        chartPlaceholderMessage = 'Forecast data unavailable. Please configure your system in Settings first.';
    } else if (isApiSourceSelected && !locationAvailable) {
        chartPlaceholderMessage = 'Location not set. Please configure your location in Settings for Open-Meteo forecast.';
    } else if (calculatedDayForecast?.errorMessage) {
        chartPlaceholderMessage = calculatedDayForecast.errorMessage;
    } else if (!calculatedDayForecast && !isApiSourceSelected) {
        chartPlaceholderMessage = 'Calculating forecast... Ensure manual forecast inputs are saved.';
    } else if (!calculatedDayForecast && isApiSourceSelected && !weatherLoading && !weatherRefetching) {
        chartPlaceholderMessage = 'Could not retrieve forecast data from Open-Meteo.';
    } else { 
        if (!displaySource.sunrise || !displaySource.sunset || sunriseTime >= sunsetTime) {
            chartPlaceholderMessage = "Invalid sunrise/sunset times. Please ensure sunrise is before sunset.";
        } else if (!calculatedDayForecast?.hourlyForecast || calculatedDayForecast.hourlyForecast.length === 0) {
            chartPlaceholderMessage = "Hourly forecast data could not be generated. Check system settings (e.g., panel power) and forecast inputs.";
        } else if (chartDataToDisplay.length === 0 || !chartDataToDisplay.some(d => d.kWh > 0.00001)) { 
             chartPlaceholderMessage = "No significant solar generation is expected based on inputs. Please check inputs and factors.";
        }
    }

    const xAxisHeight = 50; 

    const renderChart = () => {
      const commonProps = {
        data: chartDataToDisplay,
        margin: { top: 5, right: isMobile ? 5 : 20, left: isMobile ? 0 : 5, bottom: xAxisHeight - 20 }, 
      };
      const commonYAxisProps = {
        fontSize: 10,
        tickLine: false,
        axisLine: false,
        stroke: "hsl(var(--muted-foreground))",
        domain: [0, maxYValueForChart] as [number, number], 
        allowDecimals: true,
        tickFormatter: (value: number) => value.toFixed(2),
        width: isMobile ? 35 : 40, 
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
        angle: -45, 
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
              {!isMobile && <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />}
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
              {!isMobile && <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />}
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
              {!isMobile && <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />}
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={isMobile ? 2 : 4} yAxisId="left" />
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
                    <span className="flex items-center gap-1"><Sunrise className="w-3 h-3"/> {sunriseTime}</span>
                    <span className="flex items-center gap-1"><Sunset className="w-3 h-3"/> {sunsetTime}</span>
                    {isApiSourceSelected && apiDayData?.temperature_2m_max !== undefined && (
                         <span className="flex items-center gap-1"><Thermometer className="w-3 h-3"/> {apiDayData.temperature_2m_max.toFixed(0)}°C</span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {calculatedDayForecast && !calculatedDayForecast.errorMessage && chartDataToDisplay.length > 0 && chartDataToDisplay.some(d=>d.kWh > 0.00001) ? (
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
  }, [isMounted, settings, selectedChartType, weatherLoading, weatherRefetching, locationAvailable, isApiSourceSelected, isMobile]); 

  const renderWeeklyForecastItem = (dayData: DailyWeather, index: number) => {
    if (!settings) return null;
    const dayOfWeek = format(parseISO(dayData.date), 'EEE');
    const dateDisplay = format(parseISO(dayData.date), 'dd/MM');

    // For weekly, we create a ManualDayForecast-like object for calculation
    const forecastInputForCalc: ManualDayForecast = {
        date: dayData.date,
        sunrise: dayData.sunrise ? format(parseISO(dayData.sunrise), 'HH:mm') : '00:00',
        sunset: dayData.sunset ? format(parseISO(dayData.sunset), 'HH:mm') : '00:00',
        condition: mapWmoCodeToManualForecastCondition(dayData.weather_code),
    };

    const calculated = calculateSolarGeneration(forecastInputForCalc, settings);

    const weatherIcon = getWeatherIconFromString(dayData.weatherConditionString);
    const generationDisplay = calculated?.dailyTotalGenerationKWh?.toFixed(1) || 'N/A';

    return (
      <Card key={`week-${dayData.date}-${index}`} className="text-center flex flex-col p-2">
        <CardHeader className="pb-1 pt-2 px-1">
          <CardTitle className="text-sm font-medium">{dayOfWeek}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{dateDisplay}</CardDescription>
          <div className="pt-1 flex justify-center items-center h-6">
            {weatherIcon}
          </div>
        </CardHeader>
        <CardContent className="p-1 mt-auto">
          <p className="text-base font-semibold">{generationDisplay}</p>
          <p className="text-xs text-muted-foreground -mt-1">kWh</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row">
           <div className="mb-4 sm:mb-0">
                <h1 className="text-3xl font-bold">Solar Dashboard</h1>
                <p className="text-muted-foreground">Forecasting for: {isMounted ? locationDisplay : 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <HowToInfo pageKey="dashboard" />
                {isApiSourceSelected && (
                    <Button
                        onClick={() => refetchWeather()}
                        disabled={weatherLoading || weatherRefetching || !isMounted || !settings || !locationAvailable}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Forecast
                    </Button>
                )}
                 {!isApiSourceSelected && (
                    <Button variant="outline" onClick={() => setIsManualModalOpen(true)} disabled={!isMounted || !settings}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Manual Forecast
                    </Button>
                )}
            </div>
        </div>
        {isMounted && !isApiSourceSelected && settings && (
             <ManualForecastModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                currentForecast={manualForecast}
                onSave={(updatedForecast) => {
                    setManualForecast(updatedForecast);
                    setIsManualModalOpen(false);
                }}
            />
        )}

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

      {(weatherLoading && isApiSourceSelected) && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading dashboard...</p>
        </div>
      )}

       {isMounted && !settings && (
            <Alert>
             <AlertTitle>Welcome to HelioHeggie!</AlertTitle>
             <AlertDescription>
               Please go to the <a href="/settings" className="underline font-medium">Settings page</a> to configure your system details.
             </AlertDescription>
            </Alert>
        )}
        
        {isMounted && settings && isApiSourceSelected && !locationAvailable && !weatherLoading && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Location Not Set for API</AlertTitle>
                 <AlertDescription>Please set your latitude and longitude in <a href="/settings" className="underline font-medium">Settings</a> to use Open-Meteo forecast.</AlertDescription>
             </Alert>
        )}

        {isMounted && settings && weatherError && isApiSourceSelected && !weatherLoading && (
            <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error Loading API Forecast</AlertTitle>
                 <AlertDescription>{weatherError.message}</AlertDescription>
            </Alert>
        )}

        {isMounted && settings && (!weatherLoading || !isApiSourceSelected) && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderForecastCard("Today", todayCalculatedForecast, weatherForecastData?.todayForecast || null, manualForecast.today, todayChartData, todayMaxY, todayYAxisTicks, todayChartXTicks)}
                    {renderForecastCard("Tomorrow", tomorrowCalculatedForecast, weatherForecastData?.tomorrowForecast || null, manualForecast.tomorrow, tomorrowChartData, tomorrowMaxY, tomorrowYAxisTicks, tomorrowChartXTicks)}
                </div>
                
                {isApiSourceSelected && !isMobile && weatherForecastData?.weeklyForecast && weatherForecastData.weeklyForecast.length > 0 && !weatherLoading && (
                  <div className="mt-8">
                      <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                          {weatherForecastData.weeklyForecast.map((forecast, index) => renderWeeklyForecastItem(forecast, index))}
                      </div>
                  </div>
                )}
                 {!isApiSourceSelected && !isMobile && (
                  <div className="mt-8">
                      <h2 className="text-2xl font-bold mb-4">Week Ahead</h2>
                      <p className="text-sm text-muted-foreground mt-2">Week ahead forecast is only available with Open-Meteo source. Please select Open-Meteo in the header source dropdown.</p>
                  </div>
                )}
            </>
        )}
    </div>
  );
}

