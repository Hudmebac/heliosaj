
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon, BarChart, Battery, Hourglass, Clock, Car } from 'lucide-react'; // Import Clock and Car icons
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import { getWeatherForecast, type WeatherForecast } from '@/services/weather';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations'; // Import calculation function
import { getChargingAdvice, type ChargingAdviceParams, type ChargingAdvice } from '@/lib/charging-advice'; // Import advice function
import { cn } from '@/lib/utils'; // Import cn for conditional class names

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London
const DEFAULT_WEATHER_SOURCE_ID = 'open-meteo'; // Default source
const HOURS_IN_DAY = 24;
const DEFAULT_BATTERY_MAX = 100; // Default max for input if settings not loaded
const DEFAULT_EV_MAX_CHARGE_RATE = 7.5; // Default max EV charge rate

export default function AdvisoryPage() {
    const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null); // Allow setting settings
    const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
    const [tomorrowAdvice, setTomorrowAdvice] = useState<ChargingAdvice | null>(null);
    const [todayAdvice, setTodayAdvice] = useState<ChargingAdvice | null>(null); // State for today's advice
    const [loadingTomorrow, setLoadingTomorrow] = useState(true);
    const [loadingToday, setLoadingToday] = useState(true); // Separate loading for today
    const [errorTomorrow, setErrorTomorrow] = useState<string | null>(null);
    const [errorToday, setErrorToday] = useState<string | null>(null); // Separate error for today
    const [tomorrowForecast, setTomorrowForecast] = useState<CalculatedForecast | null>(null);
    const [todayForecast, setTodayForecast] = useState<CalculatedForecast | null>(null); // State for today's forecast
    const [isMounted, setIsMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState<number | null>(null); // Initialize to null

    // State for user inputs
    const [currentBatteryLevel, setCurrentBatteryLevel] = useState<number>(0);
    const [hourlyUsage, setHourlyUsage] = useState<number[]>(
        () => Array(HOURS_IN_DAY).fill(0.4)
    );
    const [dailyConsumption, setDailyConsumption] = useState<number>(10);
    const [avgHourlyConsumption, setAvgHourlyConsumption] = useState<number>(0.4);

    // EV Settings State - use local state tied to inputs, which triggers useEffect to save to localStorage
    const [evChargeRequiredKWh, setEvChargeRequiredKWh] = useState<number>(0);
    const [evChargeByTime, setEvChargeByTime] = useState<string>('07:00');
    const [evMaxChargeRateKWh, setEvMaxChargeRateKWh] = useState<number>(DEFAULT_EV_MAX_CHARGE_RATE);


    // Effect for client mount and initializing settings-based state
    useEffect(() => {
      setIsMounted(true);
      setCurrentHour(new Date().getHours()); // Set current hour only on client mount

      if (settings) {
        // Initialize input states from settings
        setDailyConsumption(settings.dailyConsumptionKWh ?? 10);
        const avg = settings.avgHourlyConsumptionKWh ?? (settings.dailyConsumptionKWh ? settings.dailyConsumptionKWh / 24 : 0.4);
        setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
        if (hourlyUsage.every(val => val === 0.4)) { // Only set if still default
             setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
        }
        // Set EV state from loaded settings
        setEvChargeRequiredKWh(settings.evChargeRequiredKWh ?? 0);
        setEvChargeByTime(settings.evChargeByTime ?? '07:00');
        setEvMaxChargeRateKWh(settings.evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE);
         // Set battery level based on saved settings if available and plausible
        setCurrentBatteryLevel(settings.batteryCapacityKWh ? Math.min(settings.batteryCapacityKWh, (settings as any).lastKnownBatteryLevelKWh ?? 0) : 0);

      } else {
        // Reset to defaults if settings are null
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
       if (isMounted && settings) { // Only save if mounted and settings exist
           const handler = setTimeout(() => {
               setSettings(prev => ({
                   ...(prev!), // We know settings exist here
                   evChargeRequiredKWh: evChargeRequiredKWh,
                   evChargeByTime: evChargeByTime,
                   evMaxChargeRateKWh: evMaxChargeRateKWh,
                   // Persist the last entered battery level (consider adding a timestamp?)
                   lastKnownBatteryLevelKWh: currentBatteryLevel,
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

    // --- Function to Fetch and Calculate TOMORROW'S Advice ---
    const fetchTomorrowAdvice = async () => {
        if (!isMounted || !settings || currentHour === null) return;

        setLoadingTomorrow(true);
        setErrorTomorrow(null);
        setTomorrowAdvice(null);
        setTomorrowForecast(null);

        if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
            setErrorTomorrow("Battery capacity not set. Required for tomorrow's advice.");
            setLoadingTomorrow(false);
            return;
        }

        const cheapTariffs = tariffPeriods.filter(p => p.isCheap);
        let currentLocation = settings.latitude && settings.longitude ? { lat: settings.latitude, lng: settings.longitude } : DEFAULT_LOCATION;
        const selectedSource = settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID;

        try {
            const today = new Date();
            const tomorrowDate = new Date(today);
            tomorrowDate.setDate(today.getDate() + 1);
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

            const weatherResult = await getWeatherForecast(currentLocation, 2, selectedSource); // Fetch 2 days to get tomorrow

            if (!weatherResult || weatherResult.length === 0) throw new Error("No weather data.");

            const tomorrowWeather = weatherResult.find(f => f.date === tomorrowStr);
            if (!tomorrowWeather) throw new Error(`Forecast for tomorrow (${tomorrowStr}) not found.`);

            const calculatedForecast = calculateSolarGeneration(tomorrowWeather, settings);
            if (!calculatedForecast) throw new Error("Could not calculate tomorrow's generation.");
            setTomorrowForecast(calculatedForecast);

            const adviceParams: ChargingAdviceParams = {
               forecast: calculatedForecast,
               settings: settings,
               tariffPeriods: tariffPeriods, // Pass all periods
               currentBatteryLevelKWh: currentBatteryLevel,
               hourlyConsumptionProfile: hourlyUsage,
               adviceType: 'overnight', // Specifically for tomorrow/overnight
               // currentHour is not needed for overnight advice
            };
            const generatedAdvice = getChargingAdvice(adviceParams);
            if (!generatedAdvice) throw new Error("Failed to generate tomorrow's advice.");
            setTomorrowAdvice(generatedAdvice);

        } catch (err: any) {
            console.error("Error getting tomorrow's advice:", err);
            setErrorTomorrow(`Failed to get tomorrow's advice: ${err.message}`);
        } finally {
            setLoadingTomorrow(false);
        }
    };

    // --- Function to Fetch and Calculate TODAY'S Advice ---
    const fetchTodayAdvice = async () => {
        if (!isMounted || !settings || currentHour === null) return;

        setLoadingToday(true);
        setErrorToday(null);
        setTodayAdvice(null);
        setTodayForecast(null);

         if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
            setErrorToday("Battery capacity not set. Required for today's advice.");
            setLoadingToday(false);
            return;
        }

        const cheapTariffs = tariffPeriods.filter(p => p.isCheap);
        let currentLocation = settings.latitude && settings.longitude ? { lat: settings.latitude, lng: settings.longitude } : DEFAULT_LOCATION;
        const selectedSource = settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID;

        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const weatherResult = await getWeatherForecast(currentLocation, 1, selectedSource); // Fetch only today

            if (!weatherResult || weatherResult.length === 0) throw new Error("No weather data.");

            const todayWeather = weatherResult.find(f => f.date === todayStr);
            if (!todayWeather) throw new Error("Today's weather data not found.");

            const calculatedForecast = calculateSolarGeneration(todayWeather, settings);
            // Today's advice can still be generated even if calculation fails (e.g., based on tariffs only)
            setTodayForecast(calculatedForecast);

            const adviceParams: ChargingAdviceParams = {
                forecast: calculatedForecast, // Pass potentially null forecast
                settings: settings,
                tariffPeriods: tariffPeriods, // Pass all periods
                currentBatteryLevelKWh: currentBatteryLevel,
                hourlyConsumptionProfile: hourlyUsage,
                currentHour: currentHour, // Pass the current hour for today's advice
                adviceType: 'today', // Specifically for today
            };
            const generatedAdvice = getChargingAdvice(adviceParams);
            if (!generatedAdvice) throw new Error("Failed to generate today's advice.");
            setTodayAdvice(generatedAdvice);

        } catch (err: any) {
            console.error("Error getting today's advice:", err);
            setErrorToday(`Failed to get today's advice: ${err.message}`);
        } finally {
            setLoadingToday(false);
        }
    };


    // --- Main Effect to Trigger Advice Generation ---
    useEffect(() => {
      if (!isMounted || currentHour === null) return; // Don't run fetches until mounted and currentHour is set

      // Use separate timeouts to debounce/manage updates
      const tomorrowTimer = setTimeout(() => {
          fetchTomorrowAdvice();
      }, 500); // Debounce for tomorrow's advice based on inputs

       const todayTimer = setTimeout(() => {
          fetchTodayAdvice();
      }, 500); // Debounce for today's advice, including currentHour changes

      return () => {
          clearTimeout(tomorrowTimer);
          clearTimeout(todayTimer);
      };
      // Dependencies: Recalculate if settings, tariffs, inputs, or current hour change
    }, [settings, tariffPeriods, currentBatteryLevel, hourlyUsage, isMounted, currentHour]); // Added currentHour

   // --- Render Functions ---

   const renderAdvice = (advice: ChargingAdvice | null, titlePrefix: string) => {
     if (!advice) return null;

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
              <span className="block mt-1 text-xs text-primary">Estimated grid energy needed: {advice.chargeNeededKWh.toFixed(1)} kWh {advice.chargeWindow && `(${advice.chargeWindow})`}.</span>
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


   return (
     <div className="space-y-6">
       <h1 className="text-3xl font-bold">Smart Charging Advisory</h1>
       <p className="text-muted-foreground">Get recommendations for optimizing battery and EV charging based on forecasts, tariffs, and your consumption patterns.</p>

       {/* Inputs Card */}
       <Card>
         <CardHeader>
           <CardTitle>Your Energy Inputs</CardTitle>
           <CardDescription>Provide details about your current battery level and typical energy usage for more accurate advice.</CardDescription>
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
               disabled={!isMounted}
             />
              {isMounted && settings?.batteryCapacityKWh ? (
                <p className="text-xs text-muted-foreground"> (Capacity: {settings.batteryCapacityKWh} kWh)</p>
              ) : (
                  <p className="text-xs text-muted-foreground">{isMounted ? '(Set Capacity in Settings)' : 'Loading settings...'}</p>
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
               <p className="text-xs text-muted-foreground">Fine-tune your expected usage for each hour. Total daily consumption updates automatically.</p>
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

       {/* EV Charging Preferences Card */}
       <Card>
         <CardHeader>
             <CardTitle className="flex items-center gap-2">
                 <Car className="h-5 w-5"/> EV Charging Preferences
             </CardTitle>
             <CardDescription>
                 Set your electric vehicle charging needs to integrate them into the recommendations (saved automatically).
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


       {/* Recommendation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Recommendation Card */}
           <Card>
             <CardHeader>
               <CardTitle>Today's Recommendation</CardTitle>
                <CardDescription>Based on current conditions and today's forecast.</CardDescription>
             </CardHeader>
             <CardContent>
               {loadingToday && (
                 <div className="flex items-center text-muted-foreground">
                   <Loader2 className="h-5 w-5 animate-spin mr-2" />
                   <span>Generating today's advice...</span>
                 </div>
               )}
               {errorToday && !loadingToday && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4"/>
                   <AlertTitle>Error</AlertTitle>
                   <AlertDescription>{errorToday}</AlertDescription>
                 </Alert>
               )}
               {!loadingToday && !errorToday && renderAdvice(todayAdvice, "Today")}
                {!loadingToday && !errorToday && !todayAdvice && (
                    <Alert variant="default">
                        <SettingsIcon className="h-4 w-4" />
                        <AlertTitle>Could Not Generate Today's Advice</AlertTitle>
                        <AlertDescription>Unable to provide a recommendation. Check settings and forecast availability.</AlertDescription>
                    </Alert>
                )}
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
                {loadingTomorrow && (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Generating tomorrow's advice...</span>
                  </div>
                )}
                {errorTomorrow && !loadingTomorrow && (
                  <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4"/>
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorTomorrow}</AlertDescription>
                  </Alert>
                )}
                {!loadingTomorrow && !errorTomorrow && renderAdvice(tomorrowAdvice, "Overnight")}
                 {!loadingTomorrow && !errorTomorrow && !tomorrowAdvice && (
                     <Alert variant="default">
                         <SettingsIcon className="h-4 w-4" />
                         <AlertTitle>Could Not Generate Tomorrow's Advice</AlertTitle>
                         <AlertDescription>Unable to provide a recommendation. Check settings and forecast availability.</AlertDescription>
                     </Alert>
                 )}
              </CardContent>
            </Card>
         </div>


       {/* Forecast & Config Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Forecast & Configuration Used</CardTitle>
             <CardDescription>Summary of data used for the advice.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <p><strong>Today's Est. Generation:</strong> {todayForecast ? `${todayForecast.dailyTotalGenerationKWh.toFixed(2)} kWh (${todayForecast.weatherCondition || 'N/A'})` : 'N/A'}</p>
                     <p><strong>Tomorrow's Est. Generation:</strong> {tomorrowForecast ? `${tomorrowForecast.dailyTotalGenerationKWh.toFixed(2)} kWh (${tomorrowForecast.weatherCondition || 'N/A'})` : 'N/A'}</p>
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
                 {isMounted ? (
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
              <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on forecast quality (using {isMounted ? (settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID) : '...'} source), system settings, tariffs, and consumption inputs. Recommendations are estimates.</p>
          </CardContent>
        </Card>
     </div>
   );
 }
