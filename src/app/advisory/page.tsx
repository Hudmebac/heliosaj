

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon, BarChart, Battery, Hourglass, Clock, Car, RefreshCw } from 'lucide-react'; // Import Clock, Car, RefreshCw icons
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import type { WeatherForecast, Location } from '@/services/weather'; // Import Location type
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations'; // Import calculation function
import { getChargingAdvice, type ChargingAdviceParams, type ChargingAdvice } from '@/lib/charging-advice'; // Import advice function
import { cn } from '@/lib/utils'; // Import cn for conditional class names
import { useWeatherForecast } from '@/hooks/use-weather-forecast'; // Import the new hook

const DEFAULT_LOCATION: Location = { lat: 51.5074, lng: 0.1278 }; // Default to London
const DEFAULT_WEATHER_SOURCE_ID = 'open-meteo'; // Default source
const HOURS_IN_DAY = 24;
const DEFAULT_BATTERY_MAX = 100; // Default max for input if settings not loaded
const DEFAULT_EV_MAX_CHARGE_RATE = 7.5; // Default max EV charge rate

export default function AdvisoryPage() {
    const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null); // Allow setting settings
    const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
    const [tomorrowAdvice, setTomorrowAdvice] = useState<ChargingAdvice | null>(null);
    const [todayAdvice, setTodayAdvice] = useState<ChargingAdvice | null>(null); // State for today's advice
    const [adviceError, setAdviceError] = useState<string | null>(null); // Single error state for advice generation
    const [tomorrowForecastCalc, setTomorrowForecastCalc] = useState<CalculatedForecast | null>(null);
    const [todayForecastCalc, setTodayForecastCalc] = useState<CalculatedForecast | null>(null); // State for today's calculated forecast
    const [isMounted, setIsMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState<number | null>(null); // Initialize to null

    // State for user inputs
    const [currentBatteryLevel, setCurrentBatteryLevel] = useState<number>(0);
    const [hourlyUsage, setHourlyUsage] = useState<number[]>(
        () => Array(HOURS_IN_DAY).fill(0.4)
    );
    const [dailyConsumption, setDailyConsumption] = useState<number>(10);
    const [avgHourlyConsumption, setAvgHourlyConsumption] = useState<number>(0.4);

    // EV Settings State
    const [evChargeRequiredKWh, setEvChargeRequiredKWh] = useState<number>(0);
    const [evChargeByTime, setEvChargeByTime] = useState<string>('07:00');
    const [evMaxChargeRateKWh, setEvMaxChargeRateKWh] = useState<number>(DEFAULT_EV_MAX_CHARGE_RATE);

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
    } = useWeatherForecast(
        currentLocation,
        selectedSource,
        2, // Fetch today and tomorrow
        isMounted && !!settings // Enable only when mounted and settings are loaded
    );

    // Effect for client mount and initializing settings-based state
    useEffect(() => {
      setIsMounted(true);
      setCurrentHour(new Date().getHours()); // Set current hour only on client mount

      if (settings) {
        setDailyConsumption(settings.dailyConsumptionKWh ?? 10);
        const avg = settings.avgHourlyConsumptionKWh ?? (settings.dailyConsumptionKWh ? settings.dailyConsumptionKWh / 24 : 0.4);
        setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
        if (hourlyUsage.every(val => val === 0.4)) { // Only set if still default
             setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
        }
        setEvChargeRequiredKWh(settings.evChargeRequiredKWh ?? 0);
        setEvChargeByTime(settings.evChargeByTime ?? '07:00');
        setEvMaxChargeRateKWh(settings.evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE);
        // Load lastKnownBatteryLevel safely
        const lastKnown = (settings as any).lastKnownBatteryLevelKWh;
        setCurrentBatteryLevel(lastKnown !== undefined && lastKnown !== null && settings.batteryCapacityKWh ? Math.min(settings.batteryCapacityKWh, lastKnown) : 0);

      } else {
        setDailyConsumption(10);
        setAvgHourlyConsumption(0.4);
        setHourlyUsage(Array(HOURS_IN_DAY).fill(0.4));
        setCurrentBatteryLevel(0);
        setEvChargeRequiredKWh(0);
        setEvChargeByTime('07:00');
        setEvMaxChargeRateKWh(DEFAULT_EV_MAX_CHARGE_RATE);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings]); // Depend only on the main settings object loading

    // Effect to update current hour periodically
    useEffect(() => {
       if (!isMounted) return;
       const timer = setInterval(() => {
         setCurrentHour(new Date().getHours());
       }, 60 * 1000); // Update every minute
       return () => clearInterval(timer);
     }, [isMounted]);

     // Effect to save EV settings and current battery level to localStorage when they change
     useEffect(() => {
       if (isMounted && settings) {
           const handler = setTimeout(() => {
               setSettings(prev => ({
                   ...(prev!),
                   evChargeRequiredKWh: evChargeRequiredKWh,
                   evChargeByTime: evChargeByTime,
                   evMaxChargeRateKWh: evMaxChargeRateKWh,
                   lastKnownBatteryLevelKWh: currentBatteryLevel, // Save the current level
               }));
           }, 1000); // Debounce saving
           return () => clearTimeout(handler);
       }
        // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh, currentBatteryLevel, isMounted, setSettings]);


    // Function to handle changes in hourly sliders
    const handleSliderChange = (index: number, value: number[]) => {
      const newHourlyUsage = [...hourlyUsage];
      newHourlyUsage[index] = value[0];
      setHourlyUsage(newHourlyUsage);
      const newDailyTotal = newHourlyUsage.reduce((sum, val) => sum + val, 0);
      setDailyConsumption(parseFloat(newDailyTotal.toFixed(2)));
    };

    // Function to distribute daily consumption evenly
    const distributeDailyConsumption = () => {
      const avg = dailyConsumption / HOURS_IN_DAY;
      setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
    };

    // Function to apply average consumption
    const applyAverageConsumption = () => {
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avgHourlyConsumption));
      setDailyConsumption(parseFloat((avgHourlyConsumption * HOURS_IN_DAY).toFixed(2)));
    };

    // --- Advice Generation Logic (triggered by weatherData changes) ---
    useEffect(() => {
        if (!isMounted || !settings || currentHour === null || !weatherData || weatherLoading || weatherRefetching) {
            // Clear advice if inputs are not ready or weather is loading/refetching
             setTodayAdvice(null);
             setTomorrowAdvice(null);
             setTodayForecastCalc(null);
             setTomorrowForecastCalc(null);
             setAdviceError(null);
             if (isMounted && !settings) setAdviceError("Please configure your system in Settings first.");
            return;
        }

         // Clear previous errors if data is now available
         setAdviceError(null);

        if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
             setAdviceError("Battery capacity not set. Required for advice.");
            return;
        }

        // Find today's and tomorrow's weather from the fetched data
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

        const todayWeatherRaw = weatherData.find(f => f.date === todayStr);
        const tomorrowWeatherRaw = weatherData.find(f => f.date === tomorrowStr);

        // Calculate solar generation for today and tomorrow
        const todayCalculated = todayWeatherRaw ? calculateSolarGeneration(todayWeatherRaw, settings) : null;
        const tomorrowCalculated = tomorrowWeatherRaw ? calculateSolarGeneration(tomorrowWeatherRaw, settings) : null;

        setTodayForecastCalc(todayCalculated);
        setTomorrowForecastCalc(tomorrowCalculated);

        // --- Prepare EV Charging Needs ---
         const evNeeds = {
             chargeRequiredKWh: evChargeRequiredKWh ?? 0,
             chargeByHour: evChargeByTime ? parseInt(evChargeByTime.split(':')[0]) : 7, // Default to 7 AM if invalid
             maxChargeRateKWh: evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE,
         };


        // --- Generate Today's Advice ---
        try {
            const todayParams: ChargingAdviceParams = {
                forecast: todayCalculated,
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel,
                hourlyConsumptionProfile: hourlyUsage,
                currentHour: currentHour,
                evNeeds: evNeeds, // Pass EV needs
                adviceType: 'today',
            };
            const todayGeneratedAdvice = getChargingAdvice(todayParams);
            if (!todayGeneratedAdvice) throw new Error("Failed to generate today's advice.");
            setTodayAdvice(todayGeneratedAdvice);
        } catch (err: any) {
            console.error("Error generating today's advice:", err);
             setAdviceError(`Today's Advice Error: ${err.message}`);
             setTodayAdvice(null); // Clear potentially stale advice
        }

        // --- Generate Tomorrow's (Overnight) Advice ---
        try {
            // For overnight advice, we simulate the battery level at the *end* of today (e.g., midnight)
            // This requires a simplified simulation or an assumption. Let's use the current battery level
            // plus estimated remaining solar generation minus estimated remaining consumption for today.
            // This is complex, so for now, let's use a simpler approach:
            // Assume the overnight advice starts planning from the current battery level.
            // A more advanced version would project the end-of-day battery state.

            const overnightParams: ChargingAdviceParams = {
                forecast: tomorrowCalculated, // Use tomorrow's solar forecast
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel, // Base planning on current level for now
                hourlyConsumptionProfile: hourlyUsage, // Use the defined profile for tomorrow's usage estimate
                // currentHour is not needed for overnight planning which looks ahead
                 evNeeds: evNeeds, // Pass EV needs for overnight planning
                adviceType: 'overnight',
            };
            const tomorrowGeneratedAdvice = getChargingAdvice(overnightParams);
            if (!tomorrowGeneratedAdvice) throw new Error("Failed to generate tomorrow's advice.");
            setTomorrowAdvice(tomorrowGeneratedAdvice);
        } catch (err: any) {
             console.error("Error generating tomorrow's advice:", err);
             // Append to existing error or set if first error
             setAdviceError(prev => prev ? `${prev}\nTomorrow's Advice Error: ${err.message}` : `Tomorrow's Advice Error: ${err.message}`);
             setTomorrowAdvice(null); // Clear potentially stale advice
        }

    }, [
        isMounted, settings, tariffPeriods, currentBatteryLevel, hourlyUsage, currentHour,
        weatherData, weatherLoading, weatherRefetching, // Depend on weather query state
        evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh // Depend on EV settings
    ]);


   // --- Render Functions ---

   const renderAdvice = (advice: ChargingAdvice | null, titlePrefix: string, isLoading: boolean, errorMsg: string | null) => {
     if (isLoading && !advice) { // Show loading only if advice isn't already available
        return (
             <div className="flex items-center text-muted-foreground">
               <Loader2 className="h-5 w-5 animate-spin mr-2" />
               <span>Loading {titlePrefix.toLowerCase()} forecast & advice...</span>
             </div>
           );
     }
     // Display error specific to this advice type (today or overnight)
     if (errorMsg) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4"/>
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>{errorMsg}</AlertDescription>
             </Alert>
           );
     }
      // Display general advice error if no specific message and no advice
     if (!advice && adviceError && !isLoading) {
         return (
              <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4"/>
                 <AlertTitle>Error Generating Advice</AlertTitle>
                 <AlertDescription>{adviceError}</AlertDescription>
              </Alert>
         );
     }
     // If still loading but advice exists from previous run, show nothing here (avoids flicker)
     if (isLoading && advice) {
         return null;
     }

     if (!advice) {
        // Generic message if no advice could be generated and no error was caught
        return (
             <Alert variant="default">
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Could Not Generate Advice</AlertTitle>
                 <AlertDescription>Unable to provide a recommendation. Check settings, ensure forecast data is available, and try updating.</AlertDescription>
             </Alert>
         );
     }

     const Icon = advice.recommendChargeNow || advice.recommendChargeLater ? BatteryCharging : advice.reason.includes("Sufficient") || advice.reason.includes("Solar") ? Sun : Cloudy;
     const alertVariant = advice.recommendChargeNow || advice.recommendChargeLater ? "default" : "default"; // Customize as needed

     let title = `${titlePrefix}: `;
     if (advice.recommendChargeNow) {
         title += `Charge/Utilize Grid Now`;
     } else if (advice.recommendChargeLater) {
         title += `Prepare for Grid Charging Later`;
     } else {
         title += `Avoid Grid Charging / Rely on Solar/Battery`;
     }


     return (
        <Alert variant={alertVariant} className={`mt-4 ${advice.recommendChargeNow || advice.recommendChargeLater ? 'border-primary/50 dark:border-primary/40' : ''}`}>
          <Icon className={`h-5 w-5 ${advice.recommendChargeNow || advice.recommendChargeLater ? 'text-primary' : 'text-muted-foreground'}`} />
         <AlertTitle className="ml-7 font-semibold">{title}</AlertTitle>
         <AlertDescription className="ml-7">
           {advice.reason}
           {advice.details && <span className="block mt-1 text-xs text-muted-foreground">{advice.details}</span>}
            {advice.chargeNeededKWh !== undefined && advice.chargeNeededKWh > 0 && (
              <span className="block mt-1 text-xs text-primary">Estimated grid energy needed for battery: {advice.chargeNeededKWh.toFixed(1)} kWh {advice.chargeWindow && `(${advice.chargeWindow})`}.</span>
            )}
             {advice.potentialSavingsKWh !== undefined && advice.potentialSavingsKWh > 0 && (
               <span className="block mt-1 text-xs text-green-600 dark:text-green-400">Potential excess solar generation/savings: ~{advice.potentialSavingsKWh.toFixed(1)} kWh.</span>
             )}
              {/* EV Specific Advice */}
              {advice.evRecommendation && (
                 <span className={cn(
                    "block mt-2 text-sm font-medium",
                    advice.evRecommendation.includes("Consider") ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                 )}>
                     <Car className="inline h-4 w-4 mr-1"/> EV Charge: {advice.evRecommendation}
                     {advice.evChargeWindow && <span className="text-xs block ml-5 text-muted-foreground">{advice.evChargeWindow}</span>}
                 </span>
              )}
         </AlertDescription>
       </Alert>
     );
   };

    // Calculate max value for battery input safely after mount
    const batteryMaxInput = isMounted ? (settings?.batteryCapacityKWh ?? DEFAULT_BATTERY_MAX) : DEFAULT_BATTERY_MAX;
    // Calculate max value for hourly slider
    const sliderMax = isMounted ? Math.max(2, avgHourlyConsumption * 5) : 2;

    // Split adviceError into today and tomorrow errors
    const todayErrorMsg = adviceError?.split('\n').find(line => line.startsWith("Today's")) || (adviceError && !adviceError.includes("Tomorrow's") ? adviceError : null);
    const tomorrowErrorMsg = adviceError?.split('\n').find(line => line.startsWith("Tomorrow's")) || (adviceError && !adviceError.includes("Today's") ? adviceError : null);


   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Smart Charging Advisory</h1>
                <p className="text-muted-foreground">Optimize battery & EV charging based on forecasts, tariffs, and consumption.</p>
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

         {/* Combined Loading/Error state for weather fetch */}
        {(!isMounted || (isMounted && weatherLoading && !weatherData)) && ( // Show initial loading
          <div className="flex items-center text-muted-foreground py-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading initial weather forecast...</span>
          </div>
        )}
        {isMounted && weatherError && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4"/>
               <AlertTitle>Weather Forecast Error</AlertTitle>
               <AlertDescription>{weatherError.message}</AlertDescription>
             </Alert>
         )}
        {isMounted && !settings && !weatherLoading && !weatherError && (
             <Alert>
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Configuration Needed</AlertTitle>
                 <AlertDescription>Please configure your system in <a href="/settings" className="underline font-medium">Settings</a> first to get personalized advice.</AlertDescription>
             </Alert>
        )}


       {/* Inputs Card */}
       {isMounted && settings && ( // Only show inputs if mounted and settings loaded
       <Card>
         <CardHeader>
           <CardTitle>Your Energy Inputs</CardTitle>
           <CardDescription>Provide current battery level and typical energy usage for accurate advice.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Current Battery Level */}
           <div className="space-y-2">
             <Label htmlFor="batteryLevel" className="flex items-center gap-2">
               <Battery className="h-4 w-4" /> Current Battery Level (kWh)
             </Label>
             <Input
               id="batteryLevel"
               type="number"
               step="0.1"
               min="0"
               max={batteryMaxInput}
               value={currentBatteryLevel}
               onChange={(e) => setCurrentBatteryLevel(Math.max(0, Math.min(batteryMaxInput, parseFloat(e.target.value) || 0)))}
               placeholder="e.g., 5.2"
               className="max-w-xs"
               disabled={!isMounted} // Technically redundant due to outer check, but safe
             />
              {isMounted && settings?.batteryCapacityKWh ? (
                <p className="text-xs text-muted-foreground"> (Capacity: {settings.batteryCapacityKWh} kWh)</p>
              ) : (
                  <p className="text-xs text-muted-foreground">{isMounted ? '(Set Capacity in Settings)' : ''}</p> // Simplified
              )}
           </div>

            {/* Daily/Average Hourly Consumption */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="dailyConsumption" className="flex items-center gap-2">
                       <Hourglass className="h-4 w-4" /> Estimated Daily Consumption (kWh)
                    </Label>
                    <Input
                       id="dailyConsumption"
                       type="number"
                       step="0.1"
                       min="0"
                       value={dailyConsumption}
                       onChange={(e) => setDailyConsumption(Math.max(0, parseFloat(e.target.value) || 0))}
                       placeholder="e.g., 10.5"
                       className="max-w-xs"
                       disabled={!isMounted}
                    />
                </div>
                <Button variant="outline" size="sm" onClick={distributeDailyConsumption} className="w-full md:w-auto" disabled={!isMounted}>
                  Distribute Evenly to Hourly
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                 <div className="space-y-2">
                     <Label htmlFor="avgHourlyConsumption" className="flex items-center gap-2">
                         <BarChart className="h-4 w-4" /> Average Hourly Consumption (kWh)
                     </Label>
                     <Input
                         id="avgHourlyConsumption"
                         type="number"
                         step="0.01"
                         min="0"
                         value={avgHourlyConsumption}
                         onChange={(e) => setAvgHourlyConsumption(Math.max(0, parseFloat(e.target.value) || 0))}
                         placeholder="e.g., 0.4"
                         className="max-w-xs"
                         disabled={!isMounted}
                     />
                 </div>
                  <Button variant="outline" size="sm" onClick={applyAverageConsumption} className="w-full md:w-auto" disabled={!isMounted}>
                     Apply Average to All Hours
                  </Button>
            </div>

            {/* Hourly Usage Sliders */}
            <div className="space-y-3 pt-4">
              <Label className="flex items-center gap-2">Adjust Hourly Consumption Profile (kWh)</Label>
               <p className="text-xs text-muted-foreground">Fine-tune expected usage. Total daily consumption updates automatically.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
                {hourlyUsage.map((usage, index) => (
                  <div key={index} className="space-y-1">
                    <Label
                      htmlFor={`hour-${index}`}
                      className={cn(
                        "text-xs",
                        isMounted && index === currentHour ? 'text-primary font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      {`${index.toString().padStart(2, '0')}:00`}
                      {isMounted && index === currentHour ? ' (Now)' : ''}
                    </Label>
                    <div className="flex items-center gap-2">
                     <Slider
                       id={`hour-${index}`}
                       min={0}
                       max={sliderMax} // Use dynamic max
                       step={0.1}
                       value={[usage]}
                       onValueChange={(value) => handleSliderChange(index, value)}
                       className="flex-grow"
                       aria-label={`Hourly consumption slider for hour ${index}`}
                       disabled={!isMounted}
                     />
                      <span className="text-xs font-mono w-8 text-right">{usage.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
         </CardContent>
       </Card>
       )}

       {/* EV Charging Preferences Card */}
        {isMounted && settings && ( // Only show if mounted and settings loaded
       <Card>
         <CardHeader>
             <CardTitle className="flex items-center gap-2">
                 <Car className="h-5 w-5"/> EV Charging Preferences
             </CardTitle>
             <CardDescription>
                 Set EV needs to integrate them into recommendations (saved automatically).
             </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-1">
                     <Label htmlFor="evChargeRequired">Charge Required (kWh)</Label>
                     <Input
                         id="evChargeRequired"
                         type="number"
                         step="1"
                         min="0"
                         placeholder="e.g., 40"
                         value={evChargeRequiredKWh}
                         onChange={(e) => setEvChargeRequiredKWh(Math.max(0, parseInt(e.target.value) || 0))}
                         disabled={!isMounted}
                     />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="evChargeBy">Charge By Time (HH:MM)</Label>
                     <Input
                         id="evChargeBy"
                         type="time"
                         value={evChargeByTime}
                         onChange={(e) => setEvChargeByTime(e.target.value)}
                         disabled={!isMounted}
                     />
                 </div>
                  <div className="space-y-1">
                     <Label htmlFor="evMaxRate">Max Charge Rate (kW)</Label>
                     <Input
                         id="evMaxRate"
                         type="number"
                         step="0.1"
                         min="0.1" // Minimum charge rate
                         placeholder={`e.g., ${DEFAULT_EV_MAX_CHARGE_RATE}`}
                         value={evMaxChargeRateKWh}
                         onChange={(e) => setEvMaxChargeRateKWh(Math.max(0.1, parseFloat(e.target.value) || DEFAULT_EV_MAX_CHARGE_RATE))}
                         disabled={!isMounted}
                     />
                 </div>
             </div>
             <p className="text-xs text-muted-foreground">
                 Set required kWh to 0 if no EV charge needed. The system will try to schedule charging during cheap/solar hours before the 'Charge By' time. Max charge rate affects how quickly the target kWh can be added.
             </p>
         </CardContent>
       </Card>
       )}


       {/* Recommendation Section */}
       {isMounted && settings && ( // Only show recommendations if mounted and settings loaded
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Recommendation Card */}
           <Card>
             <CardHeader>
               <CardTitle>Today's Recommendation</CardTitle>
                <CardDescription>Based on current conditions and today's forecast.</CardDescription>
             </CardHeader>
             <CardContent>
                {renderAdvice(todayAdvice, "Today", weatherLoading || weatherRefetching, todayErrorMsg)}
                 <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                     <Clock className="h-3 w-3"/>
                     Current Hour: {isMounted && currentHour !== null ? `${currentHour.toString().padStart(2,'0')}:00` : 'Loading...'}
                 </p>
             </CardContent>
           </Card>


            {/* Tomorrow's (Overnight) Recommendation Card */}
            <Card>
              <CardHeader>
                <CardTitle>Overnight Charging (for Tomorrow)</CardTitle>
                <CardDescription>Recommendation based on tomorrow's forecast.</CardDescription>
              </CardHeader>
              <CardContent>
                 {renderAdvice(tomorrowAdvice, "Overnight", weatherLoading || weatherRefetching, tomorrowErrorMsg)}
              </CardContent>
            </Card>
         </div>
        )}


       {/* Forecast & Config Summary Card */}
       {isMounted && settings && ( // Only show summary if mounted and settings loaded
        <Card>
          <CardHeader>
            <CardTitle>Forecast & Configuration Used</CardTitle>
             <CardDescription>Summary of data used for the advice.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <p><strong>Today's Est. Generation:</strong> {todayForecastCalc ? `${todayForecastCalc.dailyTotalGenerationKWh.toFixed(2)} kWh (${todayForecastCalc.weatherCondition || 'N/A'})` : 'N/A'}</p>
                     <p><strong>Tomorrow's Est. Generation:</strong> {tomorrowForecastCalc ? `${tomorrowForecastCalc.dailyTotalGenerationKWh.toFixed(2)} kWh (${tomorrowForecastCalc.weatherCondition || 'N/A'})` : 'N/A'}</p>
                 </div>
                  <div>
                     <p><strong>Battery Capacity:</strong> {isMounted ? (settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh} kWh` : 'Not Set') : 'Loading...'}</p>
                     <p><strong>Current Battery Input:</strong> {currentBatteryLevel.toFixed(1)} kWh</p>
                     <p><strong>Est. Daily Consumption Input:</strong> {dailyConsumption.toFixed(1)} kWh</p>
                  </div>
              </div>
              {/* Display EV settings used */}
              {isMounted && evChargeRequiredKWh > 0 && (
                 <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                     <p><strong>EV Charge Need:</strong> {evChargeRequiredKWh} kWh by {evChargeByTime || 'N/A'} (Max rate: {evMaxChargeRateKWh} kW)</p>
                 </div>
              )}
             <div>
                 <strong>Defined Cheap Tariff Periods:</strong>
                 {isMounted && tariffPeriods ? (
                     tariffPeriods.filter(p => p.isCheap).length > 0 ? (
                         <ul className="list-disc list-inside ml-4 text-muted-foreground">
                             {tariffPeriods.filter(p => p.isCheap).map(p => (
                                 <li key={p.id}>{p.name} ({p.startTime} - {p.endTime})</li>
                             ))}
                         </ul>
                     ) : (
                         <span className="text-muted-foreground"> None defined</span>
                     )
                 ) : (
                     <span className="text-muted-foreground"> Loading tariffs...</span>
                 )}
             </div>
              <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on forecast quality (using {isMounted ? (settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID) : '...'} source via Open-Meteo API), system settings, tariffs, and consumption inputs. Recommendations are estimates.</p>
          </CardContent>
        </Card>
        )}
     </div>
   );
 }
