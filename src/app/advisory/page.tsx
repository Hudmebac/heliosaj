'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon, BarChart, Battery, Hourglass, Clock, Car, Edit3, HelpCircle, BatteryCharging as BatteryChargingIcon, Percent, RefreshCw } from 'lucide-react';
import { useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod, ManualDayForecast, ManualForecastInput } from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast} from '@/lib/solar-calculations';
import { getChargingAdvice, type ChargingAdviceParams, type ChargingAdvice,  } from '@/lib/charging-advice';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HowToInfo } from '@/components/how-to-info';
import { useWeatherForecast } from '@/hooks/use-weather-forecast';
import { ManualForecastModal } from '@/components/manual-forecast-modal';
import type { DailyWeather } from '@/types/weather';


const HOURS_IN_DAY = 24;
const DEFAULT_BATTERY_MAX = 100; // Default max for UI elements if capacity not set
const DEFAULT_EV_MAX_CHARGE_RATE = 7.5;
const MAX_EV_CHARGE_REQUIRED_SLIDER = 100; // Max kWh for EV charge slider

export default function AdvisoryPage() {
    const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
    const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
    const [manualForecast, setManualForecast, refreshManualForecastDates] = useManualForecast();

    const [tomorrowAdvice, setTomorrowAdvice] = useState<ChargingAdvice | null>(null);
    const [todayAdvice, setTodayAdvice] = useState<ChargingAdvice | null>(null);
    const [adviceError, setAdviceError] = useState<string | null>(null);

    const [todayForecastCalc, setTodayForecastCalc] = useState<CalculatedForecast | null>(null);
    const [tomorrowForecastCalc, setTomorrowForecastCalc] = useState<CalculatedForecast | null>(null);

    const [isMounted, setIsMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState<number | null>(null);
    const { toast } = useToast();

    const [currentBatteryLevel, setCurrentBatteryLevel] = useState<number>(10); // Default to 10
    const [hourlyUsage, setHourlyUsage] = useState<number[]>(() => Array(HOURS_IN_DAY).fill(0.4));
    const [dailyConsumption, setDailyConsumption] = useState<number>(10);
    const [avgHourlyConsumption, setAvgHourlyConsumption] = useState<number>(0.4);
    const [preferredOvernightBatteryChargePercent, setPreferredOvernightBatteryChargePercent] = useState<number>(100);


    const [evChargeRequiredKWh, setEvChargeRequiredKWh] = useState<number>(0);
    const [evChargeByTime, setEvChargeByTime] = useState<string>('07:00');
    const [evMaxChargeRateKWh, setEvMaxChargeRateKWh] = useState<number>(DEFAULT_EV_MAX_CHARGE_RATE);

    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
     const {
        weatherForecastData,
        weatherLoading,
        weatherError,
        refetchWeather,
        weatherRefetching,
        isApiSourceSelected,
        locationAvailable
    } = useWeatherForecast();


    useEffect(() => {
      setIsMounted(true);
      const now = new Date();
      setCurrentHour(now.getHours());

      if (settings) {
        setDailyConsumption(settings.dailyConsumptionKWh ?? 10);
        const avg = settings.avgHourlyConsumptionKWh ?? (settings.dailyConsumptionKWh ? settings.dailyConsumptionKWh / 24 : 0.4);
        setAvgHourlyConsumption(s => {
            const newAvg = parseFloat(avg.toFixed(2));
            return s === newAvg ? s : newAvg;
        });

        const newHourlyProfileSource = settings.hourlyUsageProfile && settings.hourlyUsageProfile.length === HOURS_IN_DAY
            ? settings.hourlyUsageProfile
            : Array(HOURS_IN_DAY).fill(parseFloat(avg.toFixed(2)));

        setHourlyUsage(currentProfile => {
            if (JSON.stringify(currentProfile) !== JSON.stringify(newHourlyProfileSource)) {
                return newHourlyProfileSource;
            }
            return currentProfile;
        });

        setEvChargeRequiredKWh(settings.evChargeRequiredKWh ?? 0);
        setEvChargeByTime(settings.evChargeByTime ?? '07:00');
        setEvMaxChargeRateKWh(settings.evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE);
        
        const batteryCapacity = settings.batteryCapacityKWh ?? 0; // Default to 0 if not set
        const lastKnown = settings.lastKnownBatteryLevelKWh;

        if (batteryCapacity <= 0) {
            setCurrentBatteryLevel(0); // If capacity is 0 or not meaningfully set, level must be 0
        } else if (lastKnown !== undefined && lastKnown !== null) {
            // Use last known level, capped by actual capacity
            setCurrentBatteryLevel(Math.max(0, Math.min(batteryCapacity, lastKnown)));
        } else {
            // No last known level, but capacity > 0. Cap the current state (initial 10 or user input) by capacity.
            setCurrentBatteryLevel(prev => Math.max(0, Math.min(batteryCapacity, prev)));
        }
        setPreferredOvernightBatteryChargePercent(settings.preferredOvernightBatteryChargePercent ?? 100);

      } else {
        // Settings are null, reset relevant states to their defaults
        setCurrentBatteryLevel(10); // Default to 10 if settings are null
        setDailyConsumption(10);
        const avg = 0.4;
        setAvgHourlyConsumption(avg);
        setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
        setEvChargeRequiredKWh(0);
        setEvChargeByTime('07:00');
        setEvMaxChargeRateKWh(DEFAULT_EV_MAX_CHARGE_RATE);
        setPreferredOvernightBatteryChargePercent(100);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, isMounted]);


    useEffect(() => {
       if (isMounted && settings) {
           const timer = setInterval(() => {
             setCurrentHour(new Date().getHours());
           }, 60 * 1000);
           return () => clearInterval(timer);
       }
   }, [isMounted, settings]);

     useEffect(() => {
       if (isMounted && settings) {
           const handler = setTimeout(() => {
               setSettings(prev => {
                const newSettings = {
                   ...(prev!),
                   evChargeRequiredKWh: evChargeRequiredKWh,
                   evChargeByTime: evChargeByTime,
                   evMaxChargeRateKWh: evMaxChargeRateKWh,
                   lastKnownBatteryLevelKWh: currentBatteryLevel, // Persist currentBatteryLevel
                   dailyConsumptionKWh: dailyConsumption,
                   avgHourlyConsumptionKWh: avgHourlyConsumption,
                   hourlyUsageProfile: hourlyUsage,
                   preferredOvernightBatteryChargePercent: preferredOvernightBatteryChargePercent,
                };
                if (JSON.stringify(prev) !== JSON.stringify(newSettings)) {
                    return newSettings;
                }
                return prev;
               });
           }, 1000);
           return () => clearTimeout(handler);
       }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh, currentBatteryLevel, dailyConsumption, avgHourlyConsumption, hourlyUsage, preferredOvernightBatteryChargePercent, isMounted, settings]);


    useEffect(() => {
        if (!isMounted || !settings) {
            setTodayForecastCalc(null);
            setTomorrowForecastCalc(null);
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
            setTodayForecastCalc(calculateSolarGeneration(todayInput, settings));
        } else {
            setTodayForecastCalc(null);
        }

        if (tomorrowInput) {
            setTomorrowForecastCalc(calculateSolarGeneration(tomorrowInput, settings));
        } else {
            setTomorrowForecastCalc(null);
        }
    }, [isMounted, settings, weatherForecastData, manualForecast, isApiSourceSelected, refreshManualForecastDates]);


    const generateAdvice = useCallback(() => {
        if (!isMounted || !settings || currentHour === null || !todayForecastCalc || !tomorrowForecastCalc) {
             setTodayAdvice(null);
             setTomorrowAdvice(null);
             setAdviceError(null);
             if (isMounted && !settings) setAdviceError("Please configure your system in Settings first.");
             if (isMounted && settings && (!todayForecastCalc || !tomorrowForecastCalc) && (isApiSourceSelected && (weatherLoading || weatherRefetching))) {
                 setAdviceError("Fetching forecast data for advice...");
             } else if (isMounted && settings && (!todayForecastCalc || !tomorrowForecastCalc) && !isApiSourceSelected) {
                  setAdviceError("Manual forecast data incomplete for advice.");
             } else if (isMounted && settings && (!todayForecastCalc || !tomorrowForecastCalc) && isApiSourceSelected && !weatherLoading && !weatherRefetching) {
                  setAdviceError("Could not load API forecast data for advice. Check location settings.");
             }
            return;
        }
         setAdviceError(null);

        if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
            // If capacity is 0, advice for battery is limited, but EV advice might still be relevant
             if(evChargeRequiredKWh <= 0 ) { // If no EV charge either, then error out
                setAdviceError("Battery capacity not set or is 0. This is required for battery charging advice.");
                return;
             }
        }

         const evNeedsInput = {
             chargeRequiredKWh: evChargeRequiredKWh ?? 0,
             chargeByHour: evChargeByTime ? parseInt(evChargeByTime.split(':')[0]) : 7,
             maxChargeRateKWh: evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE,
         };

        try {
            if (!todayForecastCalc || todayForecastCalc.errorMessage || !todayForecastCalc.hourlyForecast) throw new Error(todayForecastCalc?.errorMessage || "Today's solar forecast could not be calculated or hourly data missing.");
            const todayParams: ChargingAdviceParams = {
                forecast: todayForecastCalc,
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel,
                hourlyConsumptionProfile: hourlyUsage,
                currentHour: currentHour,
                evNeeds: evNeedsInput,
                adviceType: 'today',
                preferredOvernightBatteryChargePercent: preferredOvernightBatteryChargePercent,
            };
            const todayGeneratedAdvice = getChargingAdvice(todayParams);
            if (!todayGeneratedAdvice) throw new Error("Failed to generate today's advice.");
            setTodayAdvice(todayGeneratedAdvice);
        } catch (err: any) {
            console.error("Error generating today's advice:", err);
             setAdviceError(`Today's Advice Error: ${err.message}`);
             setTodayAdvice(null);
        }

        try {
             if (!tomorrowForecastCalc || tomorrowForecastCalc.errorMessage || !tomorrowForecastCalc.hourlyForecast) throw new Error(tomorrowForecastCalc?.errorMessage || "Tomorrow's solar forecast could not be calculated or hourly data missing.");
            const overnightParams: ChargingAdviceParams = {
                forecast: tomorrowForecastCalc,
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel, // Use current level as starting point for overnight sim
                hourlyConsumptionProfile: hourlyUsage, // Use current profile for tomorrow's base load
                currentHour: 0, // Overnight planning always starts from hour 0 of "tomorrow"
                evNeeds: evNeedsInput,
                adviceType: 'overnight',
                preferredOvernightBatteryChargePercent: preferredOvernightBatteryChargePercent,
            };
            const tomorrowGeneratedAdvice = getChargingAdvice(overnightParams);
            if (!tomorrowGeneratedAdvice) throw new Error("Failed to generate tomorrow's advice.");
            setTomorrowAdvice(tomorrowGeneratedAdvice);
        } catch (err: any) {
             console.error("Error generating tomorrow's advice:", err);
             setAdviceError(prev => prev ? `${prev}\nTomorrow's Advice Error: ${err.message}` : `Tomorrow's Advice Error: ${err.message}`);
             setTomorrowAdvice(null);
        }
    }, [
        isMounted, settings, tariffPeriods, currentBatteryLevel, hourlyUsage, currentHour,
        todayForecastCalc, tomorrowForecastCalc,
        evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh, preferredOvernightBatteryChargePercent,
        weatherLoading, weatherRefetching, isApiSourceSelected
    ]);

    useEffect(() => {
        generateAdvice();
    }, [generateAdvice]);


    const handleSliderChange = (index: number, value: number[]) => {
      const newHourlyUsage = [...hourlyUsage];
      newHourlyUsage[index] = value[0];
      setHourlyUsage(newHourlyUsage);
      const newDailyTotal = newHourlyUsage.reduce((sum, val) => sum + val, 0);
      setDailyConsumption(parseFloat(newDailyTotal.toFixed(2)));
    };

    const distributeDailyConsumption = () => {
      if (dailyConsumption <=0) {
         toast({title: "Invalid Input", description:"Daily consumption must be greater than 0 to distribute.", variant: "destructive"});
         return;
      }
      const avg = dailyConsumption / HOURS_IN_DAY;
      setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
    };

    const applyAverageConsumption = () => {
      if (avgHourlyConsumption <0) {
         toast({title: "Invalid Input", description:"Average hourly consumption must be 0 or greater to apply.", variant: "destructive"});
         return;
      }
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avgHourlyConsumption));
      setDailyConsumption(parseFloat((avgHourlyConsumption * HOURS_IN_DAY).toFixed(2)));
    };

   const renderAdviceCard = (advice: ChargingAdvice | null, title: string, description: string, icon?: React.ReactNode) => {
     if (!isMounted) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
     if (!settings) return null;

     let displayError = adviceError;
     if(isApiSourceSelected && (weatherLoading || weatherRefetching)){
        return (
             <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">{icon}{title} (Auto Forecast)</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading forecast for advice...
                </CardContent>
            </Card>
        )
     }
      if(isApiSourceSelected && !weatherLoading && !weatherRefetching && weatherError){
        displayError = `API Forecast Error: ${weatherError.message}. ${adviceError || ''}`;
     }


     if (displayError) {
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">{icon}{title} ({isApiSourceSelected ? 'Auto' : 'Manual'} Forecast)</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4"/>
                <AlertTitle>Error Generating Advice</AlertTitle>
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
     }
     if (!advice) {
       return (
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">{icon}{title} ({isApiSourceSelected ? 'Auto' : 'Manual'} Forecast)</CardTitle>
             <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
           </CardHeader>
           <CardContent>
             <Alert variant="default">
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Could Not Generate Advice</AlertTitle>
                 <AlertDescription>Unable to provide a recommendation. Please check inputs and settings, or if forecast calculation is pending.</AlertDescription>
             </Alert>
           </CardContent>
         </Card>
       );
     }

     const RecommendationIcon = advice.recommendChargeNow || advice.recommendChargeLater ? BatteryCharging : advice.reason.includes("Sufficient") || advice.reason.includes("Solar") ? Sun : Cloudy;
     let recommendationTitle = `${title} (${isApiSourceSelected ? 'Auto' : 'Manual'} Forecast): `;
     if (advice.recommendChargeNow) recommendationTitle += `Charge/Utilize Grid Now`;
     else if (advice.recommendChargeLater) recommendationTitle += `Prepare for Grid Charging Later`;
     else recommendationTitle += `Avoid Grid Charging / Rely on Solar/Battery`;

     return (
        <Card className={`${advice.recommendChargeNow || advice.recommendChargeLater ? 'border-primary/50 dark:border-primary/40' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl">{icon} {recommendationTitle}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-none p-0">
              <RecommendationIcon className={`h-5 w-5 ${advice.recommendChargeNow || advice.recommendChargeLater ? 'text-primary' : 'text-muted-foreground'}`} />
             <AlertTitle className="ml-7 font-semibold"></AlertTitle>
             <AlertDescription className="ml-7 text-xs sm:text-sm">
               {advice.reason}
               {advice.details && <span className="block mt-1 text-xs text-muted-foreground">{advice.details}</span>}
                {advice.chargeNeededKWh !== undefined && advice.chargeNeededKWh > 0 && (
                  <span className="block mt-1 text-xs text-primary">Est. grid energy for battery: {advice.chargeNeededKWh.toFixed(2)} kWh {advice.chargeWindow && `(${advice.chargeWindow})`}.</span>
                )}
                 {advice.potentialSavingsKWh !== undefined && advice.potentialSavingsKWh > 0 && (
                   <span className="block mt-1 text-xs text-green-600 dark:text-green-400">Potential excess solar/savings: ~{advice.potentialSavingsKWh.toFixed(2)} kWh.</span>
                 )}
                  {advice.evRecommendation && (
                     <span className={cn(
                        "block mt-2 text-xs sm:text-sm font-medium",
                        advice.evRecommendation.includes("Consider") || advice.evRecommendation.includes("Grid") ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                     )}>
                         <Car className="inline h-4 w-4 mr-1"/> EV Charge: {advice.evRecommendation}
                         {advice.evChargeWindow && <span className="text-xs block ml-5 text-muted-foreground">{advice.evChargeWindow}</span>}
                     </span>
                  )}
                  {advice.chargeCostPence !== undefined && advice.chargeCostPence > 0 && (
                    <span className="block mt-1 text-xs text-amber-700 dark:text-amber-500">Est. cost for this charge: {(advice.chargeCostPence / 100).toFixed(2)} GBP.</span>
                  )}
             </AlertDescription>
           </Alert>
          </CardContent>
       </Card>
     );
   };

    const uiMaxBatteryLevel = useMemo(() => {
        if (!isMounted) return DEFAULT_BATTERY_MAX;
        return (settings?.batteryCapacityKWh && settings.batteryCapacityKWh > 0) 
               ? settings.batteryCapacityKWh 
               : DEFAULT_BATTERY_MAX;
    }, [isMounted, settings?.batteryCapacityKWh]);

    const handleBatteryLevelChange = (newLevel: number) => {
        const actualCapacity = settings?.batteryCapacityKWh;
        let cappedLevel = newLevel;

        if (actualCapacity !== undefined && actualCapacity !== null) {
            if (actualCapacity <= 0) {
                cappedLevel = 0;
            } else {
                cappedLevel = Math.max(0, Math.min(actualCapacity, newLevel));
            }
        } else {
            cappedLevel = Math.max(0, Math.min(uiMaxBatteryLevel, newLevel));
        }
        setCurrentBatteryLevel(cappedLevel);
    };
    
    const currentBatteryPercentage = useMemo(() => {
        if (!isMounted || !settings?.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) return 0;
        return Math.round((currentBatteryLevel / settings.batteryCapacityKWh) * 100);
    }, [isMounted, settings?.batteryCapacityKWh, currentBatteryLevel]);


   const displayGeneration = (forecast: CalculatedForecast | null) => {
        if (!forecast) return 'Calculating...';
        if (forecast.errorMessage) return `Error: ${forecast.errorMessage}`;
        if (typeof forecast.dailyTotalGenerationKWh !== 'number' || isNaN(forecast.dailyTotalGenerationKWh)) {
            return 'N/A';
        }
        const conditionText = forecast.weatherCondition ? forecast.weatherCondition.replace(/_/g, ' ') : 'N/A';
        return `${forecast.dailyTotalGenerationKWh.toFixed(2)} kWh (${conditionText})`;
    };

   return (
     <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div className="mb-2 sm:mb-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Smart Charging Advisory</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Optimize battery &amp; EV charging based on your forecast, tariffs, and consumption.</p>
            </div>
             <div className="flex items-center gap-2">
                 <HowToInfo pageKey="advisory" />
                  {isApiSourceSelected && (
                    <Button
                        onClick={() => refetchWeather()}
                        disabled={weatherLoading || weatherRefetching || !isMounted || !settings || !locationAvailable }
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh API Forecast
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
        {isMounted && !isApiSourceSelected && (
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


        {isMounted && !settings && (
             <Alert>
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Configuration Needed</AlertTitle>
                 <AlertDescription>Please configure your system in <a href="/settings" className="underline font-medium">Settings</a> first to get personalized advice.</AlertDescription>
             </Alert>
        )}

         {isMounted && settings && isApiSourceSelected && !locationAvailable && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Location Not Set for API</AlertTitle>
                 <AlertDescription>Location Not Set to source forecast for your address. Please set your address details in <a href="/settings" className="underline font-medium">Settings</a> to use Auto forecast function or change source to Manual Input</AlertDescription>
             </Alert>
        )}
         {isMounted && settings && weatherError && isApiSourceSelected && (
            <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error Loading API Forecast</AlertTitle>
                 <AlertDescription>{weatherError.message}</AlertDescription>
            </Alert>
        )}


      {isMounted && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
           {renderAdviceCard(todayAdvice, "Today's Recommendation", "Based on current conditions and forecast.", <Sun className="h-5 w-5" />)}
           {renderAdviceCard(tomorrowAdvice, "Overnight Charging (for Tomorrow)", "Recommendation based on tomorrow's forecast and overnight tariffs.", <BatteryCharging className="h-5 w-5" />)}
        </div>
      )}


       {isMounted && settings && (
       <Card>
         <CardHeader>
           <CardTitle>Your Energy Inputs</CardTitle>
           <CardDescription>Provide current battery level and typical energy usage for accurate advice.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="batteryLevelSlider" className="flex items-center gap-2">
               <Battery className="h-4 w-4" /> Current Battery Level (kWh)
             </Label>
             <div className="flex items-center gap-2 sm:gap-4 w-full sm:max-w-md">
               <Slider
                 id="batteryLevelSlider"
                 min={0}
                 max={uiMaxBatteryLevel}
                 step={0.1} 
                 value={[currentBatteryLevel]}
                 onValueChange={(value) => handleBatteryLevelChange(value[0])}
                 className="flex-grow"
                 aria-label="Current battery level slider"
               />
               <Input
                 id="batteryLevelInput"
                 type="number"
                 step="0.1"
                 min="0"
                 max={uiMaxBatteryLevel} 
                 value={currentBatteryLevel}
                 onChange={(e) => handleBatteryLevelChange(parseFloat(e.target.value) || 0)}
                 className="w-24"
                 placeholder="e.g., 10.0"
               />
             </div>
              {isMounted && settings?.batteryCapacityKWh && settings.batteryCapacityKWh > 0 ? (
                 <p className="text-xs text-muted-foreground flex items-center gap-1">
                   (<Percent className="h-3 w-3 inline" /> {currentBatteryPercentage}%) (Capacity: {settings.batteryCapacityKWh.toFixed(2)} kWh)
                 </p>
              ) : (
                  <p className="text-xs text-muted-foreground">
                    {isMounted ? 
                        (settings?.batteryCapacityKWh === 0 ? '(Battery capacity set to 0 kWh)' : '(Set Battery Capacity in Settings to see %)') 
                        : ''}
                  </p>
              )}
           </div>

            <div className="space-y-2">
              <Label htmlFor="preferredOvernightCharge" className="flex items-center gap-2">
                <BatteryChargingIcon className="h-4 w-4" /> Preferred Overnight Battery Target
              </Label>
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:max-w-md">
                <Slider
                  id="preferredOvernightCharge"
                  min={0}
                  max={100}
                  step={5}
                  value={[preferredOvernightBatteryChargePercent]}
                  onValueChange={(value) => setPreferredOvernightBatteryChargePercent(value[0])}
                  className="flex-grow"
                  aria-label="Preferred overnight battery charge percentage"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={preferredOvernightBatteryChargePercent}
                  onChange={(e) => setPreferredOvernightBatteryChargePercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="w-20"
                />
                <span className="text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Set how full you want your battery by morning (0-100%). Default is 100%.</p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="dailyConsumption" className="flex items-center gap-2">
                       <Hourglass className="h-4 w-4" /> Estimated Daily Consumption (kWh)
                    </Label>
                    <Input
                       id="dailyConsumption"
                       type="number"
                       step="0.01"
                       min="0"
                       value={dailyConsumption}
                       onChange={(e) => setDailyConsumption(Math.max(0, parseFloat(e.target.value) || 0))}
                       placeholder="e.g., 10.50"
                       className="w-full sm:max-w-xs"
                    />
                </div>
                <Button variant="outline" size="sm" onClick={distributeDailyConsumption} className="w-full md:w-auto">
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
                         placeholder="e.g., 0.40"
                         className="w-full sm:max-w-xs"
                     />
                 </div>
                  <Button variant="outline" size="sm" onClick={applyAverageConsumption} className="w-full md:w-auto">
                     Apply Average to All Hours
                  </Button>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="hourly-consumption">
                <AccordionTrigger>
                  <Label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                    Adjust Hourly Consumption Profile (kWh)
                  </Label>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                     <p className="text-xs text-muted-foreground">Fine-tune expected usage per hour. Total daily consumption updates automatically.</p>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
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
                             max={avgHourlyConsumption * 5 > 0 ? avgHourlyConsumption * 5 : 2} // Ensure max is always > 0
                             step={0.01}
                             value={[usage]}
                             onValueChange={(value) => handleSliderChange(index, value)}
                             className="flex-grow"
                             aria-label={`Hourly consumption slider for hour ${index}`}
                           />
                            <span className="text-xs font-mono w-10 text-right">{usage.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
         </CardContent>
       </Card>
       )}

        {isMounted && settings && (
       <Card>
         <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                 <Car className="h-5 w-5"/> EV Charging Preferences
             </CardTitle>
             <CardDescription className="text-xs sm:text-sm">
                 Set your EV charging needs to integrate them into recommendations (values are saved automatically).
             </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="evChargeRequiredSlider" className="flex items-center gap-2">
                    Charge Required (kWh)
                </Label>
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:max-w-md">
                    <Slider
                        id="evChargeRequiredSlider"
                        min={0}
                        max={MAX_EV_CHARGE_REQUIRED_SLIDER}
                        step={0.5}
                        value={[evChargeRequiredKWh]}
                        onValueChange={(value) => setEvChargeRequiredKWh(value[0])}
                        className="flex-grow"
                        aria-label="EV charge required slider"
                    />
                    <Input
                        id="evChargeRequiredInput"
                        type="number"
                        step="0.1"
                        min="0"
                        max={MAX_EV_CHARGE_REQUIRED_SLIDER}
                        value={evChargeRequiredKWh}
                        onChange={(e) => setEvChargeRequiredKWh(Math.max(0, Math.min(MAX_EV_CHARGE_REQUIRED_SLIDER, parseFloat(e.target.value) || 0)))}
                        className="w-24"
                        placeholder="e.g., 40.0"
                    />
                </div>
                 <p className="text-xs text-muted-foreground">
                    Set how much energy your EV needs. Default is 0 kWh.
                 </p>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                     <Label htmlFor="evChargeBy">Charge By Time (HH:MM)</Label>
                     <Input
                         id="evChargeBy"
                         type="time"
                         value={evChargeByTime}
                         onChange={(e) => setEvChargeByTime(e.target.value)}
                         className="w-full"
                     />
                 </div>
                  <div className="space-y-1">
                     <Label htmlFor="evMaxRate">Max Charge Rate (kW)</Label>
                     <Input
                         id="evMaxRate"
                         type="number"
                         step="0.1"
                         min="0.1"
                         placeholder={`e.g., ${DEFAULT_EV_MAX_CHARGE_RATE.toFixed(1)}`}
                         value={evMaxChargeRateKWh}
                         onChange={(e) => setEvMaxChargeRateKWh(Math.max(0.1, parseFloat(e.target.value) || DEFAULT_EV_MAX_CHARGE_RATE))}
                         className="w-full"
                     />
                 </div>
             </div>
             <p className="text-xs text-muted-foreground">
                 Set required kWh to 0 if no EV charge is needed. Values are saved as you type.
             </p>
         </CardContent>
       </Card>
       )}

       {isMounted && settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Forecast & Configuration Used</CardTitle>
             <CardDescription className="text-xs sm:text-sm">Summary of the data used to generate the current advice ({isApiSourceSelected ? 'Auto' : 'Manual'} Forecast).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <p><strong>Today's Est. Generation:</strong> {displayGeneration(todayForecastCalc)}</p>
                     <p><strong>Tomorrow's Est. Generation:</strong> {displayGeneration(tomorrowForecastCalc)}</p>
                 </div>
                  <div>
                     <p><strong>Battery Capacity:</strong> {settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh.toFixed(2)} kWh` : 'Not Set'}</p>
                     <p><strong>Current Battery Input:</strong> {currentBatteryLevel.toFixed(2)} kWh ({currentBatteryPercentage}%)</p>
                     <p><strong>Est. Daily Consumption Input:</strong> {dailyConsumption.toFixed(2)} kWh</p>
                  </div>
              </div>
              {evChargeRequiredKWh > 0 && (
                 <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                     <p><strong>EV Charge Need:</strong> {evChargeRequiredKWh.toFixed(2)} kWh by {evChargeByTime || 'N/A'} (Max rate: {evMaxChargeRateKWh.toFixed(1)} kW)</p>
                 </div>
              )}
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
              <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on your forecast inputs, system settings, tariff periods, and current consumption inputs. Recommendations are estimates.</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                 <Clock className="h-3 w-3"/>
                 Current Hour (for Today's advice): {isMounted && currentHour !== null ? `${currentHour.toString().padStart(2,'0')}:00` : 'Loading...'}
             </p>
          </CardContent>
        </Card>
        )}
     </div>
   );
 }
