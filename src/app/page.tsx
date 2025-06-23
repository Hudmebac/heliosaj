
'use client';
import React, {useState, useEffect, useMemo, useCallback } from 'react';import Link from 'next/link';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type {UserSettings, ManualDayForecast, ManualForecastInput } from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import {Loader2, Sun, Cloud, CloudRain, Edit3, Sunrise, Sunset, AlertCircle, BarChart2, LineChart as LineChartIcon, AreaChart as AreaChartIcon, RefreshCw, Thermometer, CloudSun, CloudFog, CloudSnow, CloudLightning } from 'lucide-react';
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
import type { DailyWeather } from '@/types/weather';
import { ManualForecastModal } from '@/components/manual-forecast-modal';
import { WMO_CODE_MAP, mapWmoCodeToManualForecastCondition } from '@/types/weather';


type ChartType = 'bar' | 'line' | 'area';

const getWeatherIconFromString = (conditionString: string | undefined) => {
  if (!conditionString) return <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" data-ai-hint="sun icon" />;
  const condition = conditionString.toLowerCase();

  // Order matters: more specific checks first
  if (condition.includes('thunderstorm')) return <CloudLightning className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" data-ai-hint="thunderstorm icon" />;
  if (condition.includes('snow') || condition.includes('sleet') || condition.includes('snowfall') || condition.includes('snow grains') || condition.includes('snow showers')) return <CloudSnow className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" data-ai-hint="snow icon" />;
  if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('showers')) return <CloudRain className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" data-ai-hint="rain icon" />;
  
  // Handle Cloudy+ (formerly Fog) specifically
  if (condition.includes('cloudy+')) return <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" data-ai-hint="dense cloud" />; // Similar to overcast

  // Original fog check (might still be useful if some non-WMO strings contain 'fog')
  if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze') || condition.includes('rime fog')) return <CloudFog className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" data-ai-hint="fog icon" />;
  
  if (condition.includes('overcast')) return <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" data-ai-hint="overcast icon" />;
  
  // Adjusted cloudy check to ensure it doesn't misinterpret "Cloudy+" or "Partly Cloudy"
  if (condition.includes('cloudy') && !condition.includes('partly') && !condition.includes('+')) return <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" data-ai-hint="cloudy icon" />;
  
  if (condition.includes('partly cloudy') || condition.includes('mostly cloudy') || condition.includes('scattered clouds') || condition.includes('broken clouds') || condition.includes('mainly clear') || condition.includes('mainly sunny')) return <CloudSun className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" data-ai-hint="partly cloudy" />;
  if (condition.includes('sunny') || condition.includes('clear') || condition.includes('fair')) return <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" data-ai-hint="sunny icon" />;
  
  // Default for unknown
  console.warn("Unknown weather condition string for icon:", conditionString);
  return <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" data-ai-hint="default weather" />;
};


export default function HomePage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [manualForecast, setManualForecast, refreshManualForecastDates] = useManualForecast();

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

    let todayInput: ManualDayForecast | DailyWeather | null = null;
    let tomorrowInput: ManualDayForecast | DailyWeather | null = null;

    if (isApiSourceSelected && weatherForecastData) {
        todayInput = weatherForecastData.todayForecast;
        tomorrowInput = weatherForecastData.tomorrowForecast;
    } else if (!isApiSourceSelected) {
      refreshManualForecastDates();
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

  }, [isMounted, settings, weatherForecastData, manualForecast, isApiSourceSelected, refreshManualForecastDates]);

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

    if (uniqueHours.length <= 8) return uniqueHours; 

    
    const step = Math.max(1, Math.floor(uniqueHours.length / (isMobile ? 4 : 7))); 
    const ticksToShow: string[] = [];
    for (let i = 0; i < uniqueHours.length; i += step) {
        ticksToShow.push(uniqueHours[i]);
    }
    
    if (uniqueHours.length > 0 && !ticksToShow.includes(uniqueHours[uniqueHours.length - 1])) {
        ticksToShow.push(uniqueHours[uniqueHours.length - 1]);
    }
    return Array.from(new Set(ticksToShow)); 
  }, [isMobile]);

  const todayChartXTicks = useMemo(() => calculateChartXTicks(todayChartData), [todayChartData, calculateChartXTicks]);
  const tomorrowChartXTicks = useMemo(() => calculateChartXTicks(tomorrowChartData), [tomorrowChartData, calculateChartXTicks]);

  const renderForecastCard = useCallback((
    title: string,
    calculatedDayForecast: CalculatedForecast | null,
    sourceDayData: DailyWeather | ManualDayForecast | null,
    chartDataToDisplay: Array<{ time: string; kWh: number }>,
    maxYValueForChart: number,
    yAxisTicksForChart: number[],
    chartXTicksForChart: string[] | undefined,
    isApiForecast: boolean
  ) => {
    if ((isApiForecast && (weatherLoading || weatherRefetching)) || (!isMounted && isApiForecast)) {
      return (
        <Card>
          <CardHeader><CardTitle>{title} ({isApiForecast ? 'Auto' : 'Manual'}) Forecast</CardTitle></CardHeader>
          <CardContent className="h-[250px] sm:h-[300px] flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading data...</CardContent>
        </Card>
      );
    }

    if (!sourceDayData) {
        return (
            <Card>
                 <CardHeader><CardTitle>{title} ({isApiForecast ? 'Auto' : 'Manual'}) Forecast</CardTitle></CardHeader>
                 <CardContent className="h-[250px] sm:h-[300px] flex justify-center items-center text-center">
                     <div>
                        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2 mx-auto" />
                        <p className="text-muted-foreground text-sm">Forecast data unavailable. Check settings or select a data source.</p>
                     </div>
                 </CardContent>
            </Card>
        )
    }

    const weatherConditionString = ('condition' in sourceDayData) 
        ? sourceDayData.condition.replace(/_/g, ' ')
        : ('weatherConditionString' in sourceDayData && sourceDayData.weatherConditionString) 
          ? sourceDayData.weatherConditionString 
          : 'Unknown';

    const weatherIcon = getWeatherIconFromString(weatherConditionString);
    const generationValue = calculatedDayForecast?.dailyTotalGenerationKWh;
    const displayGeneration = (typeof generationValue === 'number' && !isNaN(generationValue))
      ? `${generationValue.toFixed(2)} kWh`
      : 'N/A';

    const conditionText = weatherConditionString || 'N/A';

    const getFormattedTime = (isoOrTimeString: string | undefined): string => {
        if (!isoOrTimeString) return 'N/A';
        if (isoOrTimeString.includes('T')) { // Check if it's likely an ISO string
            const dateObj = parseISO(isoOrTimeString);
            return isValid(dateObj) ? format(dateObj, 'HH:mm') : 'N/A';
        }
        // Assume HH:mm if not ISO
        const parsedTime = parse(isoOrTimeString, 'HH:mm', new Date());
        return isValid(parsedTime) ? isoOrTimeString : 'N/A';
    };

    const sunriseTime = getFormattedTime(sourceDayData.sunrise);
    const sunsetTime = getFormattedTime(sourceDayData.sunset);


    let chartPlaceholderMessage = '';
    if (!isMounted && (weatherLoading || weatherRefetching) && isApiForecast) {
        chartPlaceholderMessage = 'Loading forecast data...';
    } else if (!settings) {
        chartPlaceholderMessage = 'Forecast data unavailable. Please configure your system in Settings first.';
    } else if (isApiForecast && !locationAvailable) {
        chartPlaceholderMessage = 'Location not set. Please configure your location in Settings for Open-Meteo forecast.';
    } else if (calculatedDayForecast?.errorMessage) {
        chartPlaceholderMessage = calculatedDayForecast.errorMessage;
    } else if (!calculatedDayForecast && !isApiForecast) {
        chartPlaceholderMessage = 'Calculating forecast... Ensure manual forecast inputs are saved.';
    } else if (!calculatedDayForecast && isApiForecast && !weatherLoading && !weatherRefetching) {
        chartPlaceholderMessage = 'Could not retrieve forecast data from Open-Meteo.';
    } else {
        if (!sourceDayData.sunrise || !sourceDayData.sunset || sunriseTime === 'N/A' || sunsetTime === 'N/A' || sunriseTime >= sunsetTime) {
            chartPlaceholderMessage = "Invalid sunrise/sunset times. Please ensure sunrise is before sunset and times are valid.";
        } else if (!calculatedDayForecast?.hourlyForecast || calculatedDayForecast.hourlyForecast.length === 0) {
            chartPlaceholderMessage = "Hourly forecast data could not be generated. Check system settings (e.g., panel power) and forecast inputs.";
        } else if (chartDataToDisplay.length === 0 || !chartDataToDisplay.some(d => d.kWh > 0.00001)) {
             chartPlaceholderMessage = "No significant solar generation is expected based on inputs. Please check inputs and factors.";
        }
    }

    const xAxisHeight = isMobile ? 60 : 50;

    const renderChart = () => {
      const commonProps = {
        data: chartDataToDisplay,
        margin: { top: 5, right: isMobile ? 5 : 20, left: isMobile ? -10 : 5, bottom: xAxisHeight - (isMobile ? 10 : 20) },
      };
      const commonYAxisProps = {
        fontSize: isMobile ? 9 : 10,
        tickLine: false,
        axisLine: false,
        stroke: "hsl(var(--muted-foreground))",
        domain: [0, maxYValueForChart] as [number, number],
        allowDecimals: true,
        tickFormatter: (value: number) => `${value.toFixed(2)}kWh`, // Ensure kWh is displayed
        width: isMobile ? 35 : 45, 
 ticks: yAxisTicksForChart,
        allowDataOverflow: true, // Allow ticks on first line
      };
      const commonXAxisProps = {
        dataKey: "time",
        tickLine: true,
        axisLine: false,
        stroke: "hsl(var(--muted-foreground))",
        ticks: chartXTicksForChart,
        tickFormatter: (value: string) => value ? `${parseInt(value.split(':')[0]) % 12 || 12}${parseInt(value.split(':')[0]) >= 12 ? 'pm' : 'am'}`: '',
        interval: 'preserveStartEnd' as const,
        angle: -45,
        textAnchor: 'end' as const,
        dx: -5,
        dy: 5,
        height: xAxisHeight,
        fontSize: isMobile ? 9 : 10,
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
              <XAxis {...commonXAxisProps} /> {/* X-axis */}
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} allowDataOverflow={true} /> {/* Ensure first tick shows */}
              {!isMobile && <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />}
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Line type="monotone" dataKey="kWh" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: isMobile ? 2 : 3 }} activeDot={{ r: isMobile ? 4 : 6 }} yAxisId="left" />
            </LineChart>
          );
        case 'area':
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <XAxis {...commonXAxisProps} /> {/* X-axis */}
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} allowDataOverflow={true} /> {/* Ensure first tick shows */}
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
              <XAxis {...commonXAxisProps} /> {/* X-axis */}
              <YAxis yAxisId="left" orientation="left" {...commonYAxisProps} allowDataOverflow={true} /> {/* Ensure first tick shows */}
              {!isMobile && <YAxis yAxisId="right" orientation="right" {...commonYAxisProps} />}
              <RechartsTooltip content={customTooltip} cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.3 }}/>
              <Bar dataKey="kWh" fill="hsl(var(--primary))" radius={isMobile ? 2 : 4} yAxisId="left" />
            </BarChart>
          );
      }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg sm:text-xl">{title} ({isApiForecast ? 'Auto' : 'Manual'}) Forecast</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Est. Generation: {displayGeneration}
                            {` (${conditionText})`}
                        </CardDescription>
                    </div>
                    <div className="text-2xl">
                        {weatherIcon}
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Sunrise className="w-3 h-3"/> {sunriseTime}</span>
                    <span className="flex items-center gap-1"><Sunset className="w-3 h-3"/> {sunsetTime}</span>
                    {isApiForecast && 'temperature_2m_max' in sourceDayData && (sourceDayData as DailyWeather).temperature_2m_max !== undefined && (
                         <span className="flex items-center gap-1"><Thermometer className="w-3 h-3"/> {((sourceDayData as DailyWeather).temperature_2m_max!).toFixed(0)}°C</span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                {calculatedDayForecast && !calculatedDayForecast.errorMessage && chartDataToDisplay.length > 0 && chartDataToDisplay.some(d=>d.kWh > 0.00001) ? (
                    <ChartContainer config={{kWh: { label: "Generation (kWh)", color: "hsl(var(--primary))" }}} className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           {renderChart()}
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col justify-center items-center h-[250px] sm:h-[300px] text-center p-4">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">
                           {chartPlaceholderMessage}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, settings, selectedChartType, weatherLoading, weatherRefetching, locationAvailable, isApiSourceSelected, isMobile, toast]);

  const renderWeeklyForecastItem = (dayData: DailyWeather, index: number) => {
    if (!settings) return null;
    const dayOfWeek = format(parseISO(dayData.date), 'EEE');
    const dateDisplay = format(parseISO(dayData.date), 'dd/MM');

    const calculated = calculateSolarGeneration(dayData, settings);

    const weatherIcon = getWeatherIconFromString(dayData.weatherConditionString);
    const generationDisplay = calculated?.dailyTotalGenerationKWh?.toFixed(1) || 'N/A';
    const conditionText = dayData.weatherConditionString || 'Unknown';

    return (
      <Card key={`week-${dayData.date}-${index}`} className="text-center flex flex-col p-2">
        <CardHeader className="pb-1 pt-2 px-1 flex-grow">
          <CardTitle className="text-xs sm:text-sm font-medium">{dayOfWeek}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{dateDisplay}</CardDescription>
          <div className="pt-1 flex flex-col justify-center items-center h-auto">
            {weatherIcon}
            <span className="text-xs text-muted-foreground mt-1 capitalize">{conditionText.toLowerCase().replace('_', ' ')}</span>
          </div>
        </CardHeader>
        <CardContent className="p-1 mt-auto">
          <p className="text-sm sm:text-base font-semibold">{generationDisplay}</p>
          <p className="text-xs text-muted-foreground -mt-1">kWh</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row">
           <div className="mb-4 sm:mb-0">
                <h1 className="text-xl sm:text-2xl font-bold">Solar Dashboard</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Forecasting for: {isMounted ? locationDisplay : 'Loading...'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <HowToInfo pageKey="dashboard" />
                {isMounted ? (
                     // Conditional rendering for Refresh/Edit button based on source
                    isApiSourceSelected ? (
                        <Button
                            onClick={() => refetchWeather()}
                            disabled={weatherLoading || weatherRefetching || !settings || !locationAvailable}
                            variant="outline"
                            size="icon" // Make it icon only
>
                            <RefreshCw className="h-4 w-4" /> {/* Icon only */}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => setIsManualModalOpen(true)} disabled={!settings}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Manual Forecast
                        </Button>
                    )
                ) : (
                    <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading Source...
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

        <div className="flex justify-end items-center">
          <Select value={selectedChartType} onValueChange={(value) => setSelectedChartType(value as ChartType)} >
            <SelectTrigger className="w-full sm:w-[180px]">
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
                  <AlertDescription>Location Not Set to source forecast for your address. Please set your address details in <a href="/settings" className="underline font-medium">Settings</a> to use Auto forecast function or change source to Manual Input</AlertDescription>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {renderForecastCard("Today", todayCalculatedForecast, isApiSourceSelected ? weatherForecastData?.todayForecast || null : manualForecast.today, todayChartData, todayMaxY, todayYAxisTicks, todayChartXTicks, isApiSourceSelected)}
                    {renderForecastCard("Tomorrow", tomorrowCalculatedForecast, isApiSourceSelected ? weatherForecastData?.tomorrowForecast || null : manualForecast.tomorrow, tomorrowChartData, tomorrowMaxY, tomorrowYAxisTicks, tomorrowChartXTicks, isApiSourceSelected)}
                </div>

                {isApiSourceSelected && weatherForecastData?.weeklyForecast && weatherForecastData.weeklyForecast.length > 0 && !weatherLoading && !isMobile && (
                  <div className="mt-8">
                      <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                        Week Ahead (Auto Forecast)
                        <Link href="/info#wmo-codes" className="text-sm text-blue-600 hover:underline dark:text-orange-400">
                           WMO Codes
                        </Link>
                      </h2>
                      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
                          {weatherForecastData.weeklyForecast.map((forecast, index) => renderWeeklyForecastItem(forecast, index))}
                      </div>
                  </div>
                )}
                 {!isApiSourceSelected && !isMobile && (
                  <div className="mt-8">
                      <h2 className="text-xl sm:text-2xl font-bold mb-4">Week Ahead</h2>
                      <p className="text-sm text-muted-foreground mt-2">Week ahead forecast is only available with Open-Meteo source. Please select Open-Meteo in the header source dropdown.</p>
                  </div>
                )}
            </>
        )}
    </div>
  );
}



