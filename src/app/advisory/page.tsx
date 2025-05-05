
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon } from 'lucide-react'; // Import icons
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import { getWeatherForecast, type WeatherForecast } from '@/services/weather'; // Assuming type exists
import calculateSolarGeneration, { getChargingAdvice, type AdviceResult, type CalculatedForecast } from '@/lib/solar-calculations';

const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London
const DEFAULT_WEATHER_SOURCE_ID = 'openweathermap'; // Default source

export default function AdvisoryPage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tomorrowForecast, setTomorrowForecast] = useState<CalculatedForecast | null>(null); // Store forecast for display

  useEffect(() => {
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
         setError("No cheap tariff periods defined. Add them in the Tariffs page to get charging advice.");
         setLoading(false);
         return;
      }


      let currentLocation = DEFAULT_LOCATION;
      if (settings.latitude && settings.longitude) {
        currentLocation = { lat: settings.latitude, lng: settings.longitude };
      } else {
         console.warn("Using default location for forecast as specific coordinates are missing.");
         setError("Location coordinates missing in settings. Using default location (London) for forecast.");
         // Continue with default, but inform the user
      }

      const selectedSource = settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID;


      try {
        // Fetch weather forecast for *tomorrow*
        const today = new Date();
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(today.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

         // Request 2 days to ensure tomorrow is included even with timezone issues
         // Pass the selected source to the weather function
         const weatherResult = await getWeatherForecast(currentLocation, 2, selectedSource);

         if (!weatherResult || weatherResult.length === 0) {
            throw new Error("Could not retrieve weather forecast data.");
         }

        const tomorrowWeather = weatherResult.find(f => f.date === tomorrowStr);


        if (!tomorrowWeather) {
          // This might happen if API only returns today
          console.error("API response:", weatherResult);
          throw new Error(`Could not find forecast data specifically for tomorrow (${tomorrowStr}). Check API response.`);
        }

        // Calculate tomorrow's solar generation using the imported function
        const calculatedTomorrowForecast = calculateSolarGeneration(tomorrowWeather, settings);
        setTomorrowForecast(calculatedTomorrowForecast); // Store for display

        if (!calculatedTomorrowForecast) {
            throw new Error("Could not calculate tomorrow's solar generation estimate.");
        }

        // Get the charging advice using the imported function
        const generatedAdvice = getChargingAdvice(calculatedTomorrowForecast, settings);
        if (!generatedAdvice) {
            // This case handles if getChargingAdvice returns null (e.g., invalid inputs)
             throw new Error("Failed to generate charging advice based on forecast.");
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

    fetchForecastAndGenerateAdvice();
  }, [settings, tariffPeriods]); // Re-run when settings or tariffs change

  const renderAdvice = () => {
    if (!advice) return null;

    const Icon = advice.recommendCharge ? BatteryCharging : advice.reason.includes("Sufficient") ? Sun : Cloudy;
    // Use destructive variant only if there's a configuration error leading to advice failure
    const alertVariant = error ? "destructive" : "default";
    const title = advice.recommendCharge ? "Recommendation: Charge Battery Tonight" : "Recommendation: Avoid Grid Charging Tonight";

    return (
       <Alert variant={alertVariant} className="mt-4 border-primary/50 dark:border-primary/40">
         <Icon className="h-5 w-5 text-primary" />
        <AlertTitle className="ml-7 font-semibold">{title}</AlertTitle>
        <AlertDescription className="ml-7">
          {advice.reason}
          {advice.details && <span className="block mt-1 text-xs text-muted-foreground">{advice.details}</span>}
        </AlertDescription>
      </Alert>
    );

  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Charging Advisory</h1>
      <p className="text-muted-foreground">Get recommendations on whether to charge your battery from the grid during cheap tariff periods based on tomorrow's solar forecast.</p>

      <Card>
        <CardHeader>
          <CardTitle>Charging Recommendation</CardTitle>
           <CardDescription>Based on tomorrow's forecast and your settings.</CardDescription>
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
                   <AlertDescription>Unable to provide a recommendation. Please ensure your system settings (especially battery capacity) and tariff periods are correctly configured.</AlertDescription>
               </Alert>
           )}
        </CardContent>
      </Card>

       <Card>
         <CardHeader>
           <CardTitle>Forecast & Configuration Used</CardTitle>
            <CardDescription>Summary of data used for this advice.</CardDescription>
         </CardHeader>
         <CardContent className="text-sm space-y-3">
            {tomorrowForecast && (
             <p><strong>Tomorrow's Est. Generation:</strong> {tomorrowForecast.dailyTotalGenerationKWh.toFixed(2)} kWh ({tomorrowForecast.weatherCondition})</p>
            )}
            <p><strong>Battery Capacity:</strong> {settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh} kWh` : 'Not Set'}</p>
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
             <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on the quality of the forecast (using {settings?.selectedWeatherSource || DEFAULT_WEATHER_SOURCE_ID} source), your system settings, and defined cheap tariff periods. This is a basic recommendation.</p>
         </CardContent>
       </Card>
    </div>
  );
}
