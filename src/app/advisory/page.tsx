'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun } from 'lucide-react'; // Import icons
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import type { WeatherForecast } from '@/services/weather'; // Assuming type exists
import { getWeatherForecast } from '@/services/weather';
import { calculateSolarGeneration, type CalculatedForecast } from '../lib/Solar-calculations';
import { getChargingAdvice, AdviceResult } from '../lib/Charging-advice';


const DEFAULT_LOCATION = { lat: 51.5074, lng: 0.1278 }; // Default to London

export default function AdvisoryPage() {
  const [settings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForecastAndGenerateAdvice = async () => {
      setLoading(true);
      setError(null);
      setAdvice(null);

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
         // TODO: Add geocoding here if needed, or rely on default/show error
         console.warn("Using default location for forecast as specific coordinates are missing.");
      }


      try {
        // Fetch weather forecast for *tomorrow*
         const weatherResult = await getWeatherForecast(currentLocation); // Needs to return data including tomorrow

         const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
         const tomorrowWeather = weatherResult.find(f => f.date === tomorrowStr);


        if (!tomorrowWeather) {
          setError("Could not retrieve tomorrow's weather forecast data.");
          setLoading(false);
          return;
        }

        // Calculate tomorrow's solar generation
        const tomorrowForecast = calculateSolarGeneration(tomorrowWeather, settings);

        if (!tomorrowForecast) {
             setError("Could not calculate tomorrow's solar generation estimate.");
             setLoading(false);
             return;
        }

        // Get the charging advice
        const generatedAdvice = getChargingAdvice(tomorrowForecast, settings, cheapTariffs);
        setAdvice(generatedAdvice);

      } catch (err) {
        console.error("Error in advisory generation:", err);
        setError("Failed to generate charging advice. Check console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchForecastAndGenerateAdvice();
  }, [settings, tariffPeriods]); // Re-run when settings or tariffs change

  const renderAdvice = () => {
    if (!advice) return null;

    const Icon = advice.recommendCharge ? BatteryCharging : advice.reason.includes("High") ? Sun : Cloudy;
    const alertVariant: "default" | "destructive" | null | undefined = advice.recommendCharge ? undefined : undefined; // Default styling for both recommendations for now
    const title = advice.recommendCharge ? "Recommendation: Charge Battery Tonight" : "Recommendation: Avoid Grid Charging Tonight";

    return (
       <Alert variant={alertVariant} className="mt-4">
         <Icon className="h-5 w-5" />
        <AlertTitle className="ml-7">{title}</AlertTitle>
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
          {error && (
            <Alert variant="destructive">
               <Zap className="h-4 w-4"/>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && renderAdvice()}
           {!loading && !error && !advice && (
               <p className="text-muted-foreground">Could not generate advice. Please ensure settings and tariffs are correctly configured.</p>
           )}
        </CardContent>
      </Card>

       <Card>
         <CardHeader>
           <CardTitle>Configuration Used</CardTitle>
         </CardHeader>
         <CardContent className="text-sm space-y-2">
            <p><strong>Battery Capacity:</strong> {settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh} kWh` : 'Not Set'}</p>
            <div>
                <strong>Cheap Tariff Periods:</strong>
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
             <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on the quality of the forecast and your system settings.</p>
         </CardContent>
       </Card>
    </div>
  );
}
