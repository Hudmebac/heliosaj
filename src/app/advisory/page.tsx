
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { Label } from '@/components/ui/label'; // Import Label
import { Slider } from '@/components/ui/slider'; // Import Slider
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon, BarChart, Battery, Hourglass } from 'lucide-react'; // Import icons
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import { getWeatherForecast, type WeatherForecast } from '@/services/weather'; // Assuming type exists
import calculateSolarGeneration, { getChargingAdvice, type AdviceResult, type CalculatedForecast, type AdvancedAdviceParams } from '@/lib/solar-calculations';

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London
const DEFAULT_WEATHER_SOURCE_ID = 'open-meteo'; // Default source
const HOURS_IN_DAY = 24;
const DEFAULT_BATTERY_MAX = 100; // Default max for input if settings not loaded

export default function AdvisoryPage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowForecast, setTomorrowForecast] = useState<CalculatedForecast | null>(null); // Store forecast for display
  const [isMounted, setIsMounted] = useState(false); // State to track client mount

  // State for user inputs
  const [currentBatteryLevel, setCurrentBatteryLevel] = useState<number>(0);
  // State for hourly usage sliders (using average as default)
  const [hourlyUsage, setHourlyUsage] = useState<number[]>(
      () => Array(HOURS_IN_DAY).fill(0.4) // Initial basic default
  );
  const [dailyConsumption, setDailyConsumption] = useState<number>(10); // Initial basic default
  const [avgHourlyConsumption, setAvgHourlyConsumption] = useState<number>(0.4); // Initial basic default

  // Set defaults from settings once mounted and settings are available
   useEffect(() => {
     setIsMounted(true); // Component has mounted
     if (settings) {
       setDailyConsumption(settings.dailyConsumptionKWh ?? 10);
       const avg = settings.avgHourlyConsumptionKWh ?? (settings.dailyConsumptionKWh ? settings.dailyConsumptionKWh / 24 : 0.4);
       setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
       // Only set hourlyUsage based on settings if it hasn't been manually changed yet (check if it's still the initial default)
       // This prevents overriding user adjustments if settings load later.
       if (hourlyUsage.every(val => val === 0.4)) { // Check against the *initial* default
            setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
       }

     } else {
       // Reset to basic defaults if settings are removed/null
       setDailyConsumption(10);
       setAvgHourlyConsumption(0.4);
       setHourlyUsage(Array(HOURS_IN_DAY).fill(0.4));
     }
     // Only run this effect when settings change or on initial mount
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [settings]);


  // Function to handle changes in hourly sliders
  const handleSliderChange = (index: number, value: number[]) => {
    const newHourlyUsage = [...hourlyUsage];
    newHourlyUsage[index] = value[0]; // Slider returns an array
    setHourlyUsage(newHourlyUsage);
     // Recalculate total daily consumption based on sliders
     const newDailyTotal = newHourlyUsage.reduce((sum, val) => sum + val, 0);
     setDailyConsumption(parseFloat(newDailyTotal.toFixed(2)));
  };

  // Function to distribute daily consumption evenly across hours
   const distributeDailyConsumption = () => {
     const avg = dailyConsumption / HOURS_IN_DAY;
     setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
     setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
   };

   // Function to apply average hourly consumption to all sliders
    const applyAverageConsumption = () => {
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avgHourlyConsumption));
      // Recalculate daily total based on the average
      setDailyConsumption(parseFloat((avgHourlyConsumption * HOURS_IN_DAY).toFixed(2)));
    };

  useEffect(() => {
     // Only run the main effect if the component is mounted
    if (!isMounted) return;

    const fetchForecastAndGenerateAdvice = async () => {
      setLoading(true);
      setError(null);
      setAdvice(null);
      setTomorrowForecast(null); // Reset forecast display

      if (!settings) {
        setError("User settings not found. Please configure your system in Settings.");
        setLoading(false);
        return;
      }

      if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
         setError("Battery capacity is not set or is zero. Smart charging advice requires battery details.");
         setLoading(false);
         return;
      }

      const cheapTariffs = tariffPeriods.filter(p => p.isCheap);
      if (cheapTariffs.length === 0) {
         // Consider making this a warning instead of an error if advice can still be given without tariffs
         // setError("No cheap tariff periods defined. Add them in the Tariffs page to get specific grid charging cost advice.");
         console.warn("No cheap tariff periods defined. Advice will be based on generation vs need, not cost optimization.")
         // setLoading(false); // Potentially allow continuing without tariff info
         // return;
      }

      let currentLocation = DEFAULT_LOCATION;
      if (settings.latitude && settings.longitude) {
        currentLocation = { lat: settings.latitude, lng: settings.longitude };
      } else {
         console.warn("Using default location for forecast as specific coordinates are missing.");
         // Don't set error here, just warn. Allow forecast with default location.
         // setError("Location coordinates missing in settings. Using default location (London) for forecast.");
      }

      const selectedSource = settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID;

      try {
        const today = new Date();
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

         const weatherResult = await getWeatherForecast(currentLocation, 2, selectedSource);

         if (!weatherResult || weatherResult.length === 0) {
            throw new Error("Could not retrieve weather forecast data.");
         }

        const tomorrowWeather = weatherResult.find(f => f.date === tomorrowStr);

        if (!tomorrowWeather) {
          console.error("API response:", weatherResult);
          throw new Error(`Could not find forecast data specifically for tomorrow (${tomorrowStr}). Check API response.`);
        }

        const calculatedTomorrowForecast = calculateSolarGeneration(tomorrowWeather, settings);
        setTomorrowForecast(calculatedTomorrowForecast); // Store for display

        if (!calculatedTomorrowForecast) {
            throw new Error("Could not calculate tomorrow's solar generation estimate.");
        }

        // Prepare parameters for advanced advice
         const adviceParams: AdvancedAdviceParams = {
           tomorrowForecast: calculatedTomorrowForecast,
           settings: settings,
           cheapTariffs: cheapTariffs, // Pass potentially empty array
           currentBatteryLevelKWh: currentBatteryLevel,
           hourlyConsumptionProfile: hourlyUsage // Pass the current slider values
         };


        // Get the charging advice using the updated function with advanced params
        const generatedAdvice = getChargingAdvice(adviceParams); // Pass the single object

        if (!generatedAdvice) {
             throw new Error("Failed to generate charging advice based on forecast and inputs.");
        }
        setAdvice(generatedAdvice);

      } catch (err) {
        console.error("Error in advisory generation:", err);
        let errorMessage = "Failed to generate charging advice.";
         if (err instanceof Error) {
             errorMessage += ` Details: ${err.message}`;
         }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Debounce or delay fetch/advice generation if inputs change frequently
    const timer = setTimeout(() => {
         fetchForecastAndGenerateAdvice();
     }, 500); // Add a small delay to avoid excessive calls when typing/sliding

     return () => clearTimeout(timer);

    // Include isMounted in dependency array
  }, [settings, tariffPeriods, currentBatteryLevel, hourlyUsage, avgHourlyConsumption, dailyConsumption, isMounted]); // Re-run when any relevant state changes

  const renderAdvice = () => {
    if (!advice) return null;

    const Icon = advice.recommendCharge ? BatteryCharging : advice.reason.includes("Sufficient") ? Sun : Cloudy;
    const alertVariant = error ? "destructive" : "default";
    const title = advice.recommendCharge ? "Recommendation: Charge Battery Tonight" : "Recommendation: Avoid Grid Charging Tonight";

    return (
       <Alert variant={alertVariant} className="mt-4 border-primary/50 dark:border-primary/40">
         <Icon className="h-5 w-5 text-primary" />
        <AlertTitle className="ml-7 font-semibold">{title}</AlertTitle>
        <AlertDescription className="ml-7">
          {advice.reason}
          {advice.details && <span className="block mt-1 text-xs text-muted-foreground">{advice.details}</span>}
           {advice.estimatedChargeNeededKWh !== undefined && advice.recommendCharge && (
             <span className="block mt-1 text-xs text-primary">Consider charging approx. {advice.estimatedChargeNeededKWh.toFixed(1)} kWh from the grid during cheap times.</span>
           )}
            {advice.estimatedSavingsKWh !== undefined && !advice.recommendCharge && (
              <span className="block mt-1 text-xs text-green-600 dark:text-green-400">Potential excess solar generation tomorrow: ~{advice.estimatedSavingsKWh.toFixed(1)} kWh.</span>
            )}
        </AlertDescription>
      </Alert>
    );
  };

   // Calculate max value for battery input safely after mount
   const batteryMaxInput = isMounted ? (settings?.batteryCapacityKWh ?? DEFAULT_BATTERY_MAX) : DEFAULT_BATTERY_MAX;


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Charging Advisory</h1>
      <p className="text-muted-foreground">Get recommendations on whether to charge your battery from the grid during cheap tariff periods based on tomorrow's solar forecast and your energy usage patterns.</p>

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
              max={batteryMaxInput} // Use state-derived max value
              value={currentBatteryLevel}
              onChange={(e) => setCurrentBatteryLevel(Math.max(0, Math.min(batteryMaxInput, parseFloat(e.target.value) || 0)))}
              placeholder="e.g., 5.2"
              className="max-w-xs"
              disabled={!isMounted} // Disable input until mounted to avoid issues
            />
             {/* Conditionally render capacity info only when mounted and settings available */}
             {isMounted && settings?.batteryCapacityKWh && (
               <p className="text-xs text-muted-foreground"> (Capacity: {settings.batteryCapacityKWh} kWh)</p>
             )}
             {!isMounted && (
                 <p className="text-xs text-muted-foreground">Loading settings...</p>
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
                      disabled={!isMounted} // Disable until mounted
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
                        disabled={!isMounted} // Disable until mounted
                    />
                </div>
                 <Button variant="outline" size="sm" onClick={applyAverageConsumption} className="w-full md:w-auto" disabled={!isMounted}>
                    Apply Average to All Hours
                 </Button>
           </div>

           {/* Hourly Usage Sliders - Simple Representation */}
           <div className="space-y-3 pt-4">
             <Label className="flex items-center gap-2">Adjust Hourly Consumption Profile (kWh)</Label>
              <p className="text-xs text-muted-foreground">Optionally fine-tune your expected usage for each hour tomorrow. This is a simplified view.</p>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
               {hourlyUsage.map((usage, index) => (
                 <div key={index} className="space-y-1">
                   <Label htmlFor={`hour-${index}`} className="text-xs text-muted-foreground">{`${index.toString().padStart(2, '0')}:00`}</Label>
                   <div className="flex items-center gap-2">
                    <Slider
                      id={`hour-${index}`}
                      min={0}
                      // Dynamic max based on average, ensure it's reasonable. Use isMounted check.
                      max={isMounted ? Math.max(2, avgHourlyConsumption * 5) : 2}
                      step={0.1}
                      value={[usage]}
                      onValueChange={(value) => handleSliderChange(index, value)}
                      className="flex-grow"
                      aria-label={`Hourly consumption slider for hour ${index}`}
                      disabled={!isMounted} // Disable until mounted
                    />
                     <span className="text-xs font-mono w-8 text-right">{usage.toFixed(1)}</span>
                   </div>
                 </div>
               ))}
             </div>
           </div>

        </CardContent>
      </Card>


      {/* Recommendation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Charging Recommendation</CardTitle>
           <CardDescription>Based on tomorrow's forecast and your inputs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span>Generating advice...</span>
            </div>
          )}
          {error && !loading && ( // Show error only if not loading
            <Alert variant="destructive">
               <AlertCircle className="h-4 w-4"/>
              <AlertTitle>Error Generating Advice</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && renderAdvice()}
           {!loading && !error && !advice && ( // Handle case where advice is null but no specific error was thrown
               <Alert variant="default">
                   <SettingsIcon className="h-4 w-4" />
                   <AlertTitle>Could Not Generate Advice</AlertTitle>
                   <AlertDescription>Unable to provide a recommendation. Please ensure your system settings (especially battery capacity) and tariff periods are correctly configured, and that forecast data is available.</AlertDescription>
               </Alert>
           )}
        </CardContent>
      </Card>

      {/* Forecast & Config Summary Card */}
       <Card>
         <CardHeader>
           <CardTitle>Forecast & Configuration Used</CardTitle>
            <CardDescription>Summary of data used for this advice.</CardDescription>
         </CardHeader>
         <CardContent className="text-sm space-y-3">
            {tomorrowForecast && (
             <p><strong>Tomorrow's Est. Generation:</strong> {tomorrowForecast.dailyTotalGenerationKWh.toFixed(2)} kWh ({tomorrowForecast.weatherCondition})</p>
            )}
            {/* Show settings values safely after mount */}
            <p><strong>Battery Capacity:</strong> {isMounted ? (settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh} kWh` : 'Not Set') : 'Loading...'}</p>
            <p><strong>Current Battery Level Input:</strong> {currentBatteryLevel.toFixed(1)} kWh</p>
            <p><strong>Estimated Daily Consumption Input:</strong> {dailyConsumption.toFixed(1)} kWh</p>
            <div>
                <strong>Defined Cheap Tariff Periods:</strong>
                {tariffPeriods.filter(p => p.isCheap).length > 0 ? (
                    <ul className="list-disc list-inside ml-4 text-muted-foreground">
                        {tariffPeriods.filter(p => p.isCheap).map(p => (
                            <li key={p.id}>{p.name} ({p.startTime} - {p.endTime})</li>
                        ))}
                    </ul>
                ) : (
                    <span className="text-muted-foreground"> None defined</span>
                )}
            </div>
             <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on the quality of the forecast (using {isMounted ? (settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID) : '...'} source), your system settings, defined tariff periods, and the accuracy of your consumption inputs. This is a simplified recommendation.</p>
         </CardContent>
       </Card>
    </div>
  );
}

