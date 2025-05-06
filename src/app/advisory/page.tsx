
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, BatteryCharging, Cloudy, Sun, AlertCircle, Settings as SettingsIcon, BarChart, Battery, Hourglass, Clock, Car, RefreshCw, Percent, Edit3, HelpCircle } from 'lucide-react';
import { useLocalStorage, useManualForecast } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod, ManualDayForecast, ManualForecastInput } from '@/types/settings';
import { calculateSolarGeneration, type CalculatedForecast } from '@/lib/solar-calculations';
import { getChargingAdvice, type ChargingAdviceParams, type ChargingAdvice } from '@/lib/charging-advice';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ForecastInfo, sunriseSunsetData, getApproximateSunriseSunset } from '@/components/forecast-info';
import { addDays } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HowToInfo } from '@/components/how-to-info';

const HOURS_IN_DAY = 24;
const DEFAULT_BATTERY_MAX = 100; // Used as a fallback if settings.batteryCapacityKWh is not set
const DEFAULT_EV_MAX_CHARGE_RATE = 7.5; // Default EV charge rate in kW

export default function AdvisoryPage() {
    const [settings, setSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
    const [tariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
    const [manualForecast, setManualForecast] = useManualForecast();

    const [tomorrowAdvice, setTomorrowAdvice] = useState<ChargingAdvice | null>(null);
    const [todayAdvice, setTodayAdvice] = useState<ChargingAdvice | null>(null);
    const [adviceError, setAdviceError] = useState<string | null>(null);
    const [tomorrowForecastCalc, setTomorrowForecastCalc] = useState<CalculatedForecast | null>(null);
    const [todayForecastCalc, setTodayForecastCalc] = useState<CalculatedForecast | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [currentHour, setCurrentHour] = useState<number | null>(null);
    const { toast } = useToast();

    const [currentBatteryLevel, setCurrentBatteryLevel] = useState<number>(0);
    const [hourlyUsage, setHourlyUsage] = useState<number[]>(() => Array(HOURS_IN_DAY).fill(0.4));
    const [dailyConsumption, setDailyConsumption] = useState<number>(10);
    const [avgHourlyConsumption, setAvgHourlyConsumption] = useState<number>(0.4);

    const [evChargeRequiredKWh, setEvChargeRequiredKWh] = useState<number>(0);
    const [evChargeByTime, setEvChargeByTime] = useState<string>('07:00');
    const [evMaxChargeRateKWh, setEvMaxChargeRateKWh] = useState<number>(DEFAULT_EV_MAX_CHARGE_RATE);

    const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
    const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(manualForecast);
    const [selectedCityForTimesModal, setSelectedCityForTimesModal] = useState<string>("");


    useEffect(() => {
      setIsMounted(true);
      setCurrentHour(new Date().getHours());

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
        const lastKnown = settings.lastKnownBatteryLevelKWh;
        const batteryCapacity = settings.batteryCapacityKWh ?? 0;
        setCurrentBatteryLevel(lastKnown !== undefined && lastKnown !== null && batteryCapacity > 0 ? Math.max(0, Math.min(batteryCapacity, lastKnown)) : 0);
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
    }, [settings, isMounted]); // Removed hourlyUsage from deps to avoid re-init on every slider change

    useEffect(() => {
      setEditableForecast(manualForecast);
    }, [manualForecast]);


    useEffect(() => {
       if (!isMounted) return;
       const timer = setInterval(() => {
         setCurrentHour(new Date().getHours());
       }, 60 * 1000);
       return () => clearInterval(timer);
     }, [isMounted]);

     useEffect(() => {
       if (isMounted && settings) {
           const handler = setTimeout(() => {
               setSettings(prev => ({
                   ...(prev!),
                   evChargeRequiredKWh: evChargeRequiredKWh,
                   evChargeByTime: evChargeByTime,
                   evMaxChargeRateKWh: evMaxChargeRateKWh,
                   lastKnownBatteryLevelKWh: currentBatteryLevel, // Save current battery level
                   // Save consumption preferences too
                   dailyConsumptionKWh: dailyConsumption,
                   avgHourlyConsumptionKWh: avgHourlyConsumption,
                   // Note: Saving full hourlyUsage profile to localStorage might be too much / too frequent.
                   // Consider if this level of persistence is needed or if daily/avg is enough.
               }));
           }, 1000); // Debounce saving
           return () => clearTimeout(handler);
       }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh, currentBatteryLevel, dailyConsumption, avgHourlyConsumption, isMounted, settings, setSettings]);

    const handleSliderChange = (index: number, value: number[]) => {
      const newHourlyUsage = [...hourlyUsage];
      newHourlyUsage[index] = value[0];
      setHourlyUsage(newHourlyUsage);
      const newDailyTotal = newHourlyUsage.reduce((sum, val) => sum + val, 0);
      setDailyConsumption(parseFloat(newDailyTotal.toFixed(2)));
    };

    const distributeDailyConsumption = () => {
      const avg = dailyConsumption / HOURS_IN_DAY;
      setAvgHourlyConsumption(parseFloat(avg.toFixed(2)));
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avg));
    };

    const applyAverageConsumption = () => {
      setHourlyUsage(Array(HOURS_IN_DAY).fill(avgHourlyConsumption));
      setDailyConsumption(parseFloat((avgHourlyConsumption * HOURS_IN_DAY).toFixed(2)));
    };

    useEffect(() => {
        if (!isMounted || !settings || currentHour === null) {
             setTodayAdvice(null);
             setTomorrowAdvice(null);
             setTodayForecastCalc(null);
             setTomorrowForecastCalc(null);
             setAdviceError(null);
             if (isMounted && !settings) setAdviceError("Please configure your system in Settings first.");
            return;
        }
         setAdviceError(null);

        if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
             setAdviceError("Battery capacity not set. This is required for charging advice.");
            return;
        }

        const todayCalculated = calculateSolarGeneration(manualForecast.today, settings);
        const tomorrowCalculated = calculateSolarGeneration(manualForecast.tomorrow, settings);

        setTodayForecastCalc(todayCalculated);
        setTomorrowForecastCalc(tomorrowCalculated);

         const evNeeds = {
             chargeRequiredKWh: evChargeRequiredKWh ?? 0,
             chargeByHour: evChargeByTime ? parseInt(evChargeByTime.split(':')[0]) : 7,
             maxChargeRateKWh: evMaxChargeRateKWh ?? DEFAULT_EV_MAX_CHARGE_RATE,
         };

        try {
            const todayParams: ChargingAdviceParams = {
                forecast: todayCalculated,
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel,
                hourlyConsumptionProfile: hourlyUsage,
                currentHour: currentHour,
                evNeeds: evNeeds,
                adviceType: 'today',
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
            const overnightParams: ChargingAdviceParams = {
                forecast: tomorrowCalculated, // Use tomorrow's forecast for overnight advice
                settings: settings,
                tariffPeriods: tariffPeriods,
                currentBatteryLevelKWh: currentBatteryLevel, // Base overnight on current battery
                hourlyConsumptionProfile: hourlyUsage, // Use the same profile for planning
                currentHour: currentHour, // Pass current hour to help determine start of "overnight" window
                evNeeds: evNeeds,
                adviceType: 'overnight',
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
        manualForecast,
        evChargeRequiredKWh, evChargeByTime, evMaxChargeRateKWh
    ]);

    const handleForecastModalSave = () => {
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
      setManualForecast(editableForecast);
      setIsForecastModalOpen(false);
      toast({
        title: "Forecast Updated",
        description: "Manual weather forecast has been saved.",
      });
    };

   const handleCityTimeSelectModal = (cityName: string) => {
        setSelectedCityForTimesModal(cityName);
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


   const renderAdviceCard = (advice: ChargingAdvice | null, title: string, description: string, icon?: React.ReactNode) => {
     if (!isMounted) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
     if (!settings) return null; // Main settings alert will cover this
     if (adviceError && adviceError.toLowerCase().includes(title.split(':')[0].toLowerCase())) {
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4"/>
                <AlertTitle>Error Generating Advice</AlertTitle>
                <AlertDescription>{adviceError.split('\n').find(line => line.toLowerCase().includes(title.split(':')[0].toLowerCase())) || adviceError}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
     }
     if (!advice) {
       return (
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
             <CardDescription>{description}</CardDescription>
           </CardHeader>
           <CardContent>
             <Alert variant="default">
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Could Not Generate Advice</AlertTitle>
                 <AlertDescription>Unable to provide a recommendation. Please check inputs and settings.</AlertDescription>
             </Alert>
           </CardContent>
         </Card>
       );
     }

     const RecommendationIcon = advice.recommendChargeNow || advice.recommendChargeLater ? BatteryCharging : advice.reason.includes("Sufficient") || advice.reason.includes("Solar") ? Sun : Cloudy;
     let recommendationTitle = title + ": ";
     if (advice.recommendChargeNow) recommendationTitle += `Charge/Utilize Grid Now`;
     else if (advice.recommendChargeLater) recommendationTitle += `Prepare for Grid Charging Later`;
     else recommendationTitle += `Avoid Grid Charging / Rely on Solar/Battery`;

     return (
        <Card className={`${advice.recommendChargeNow || advice.recommendChargeLater ? 'border-primary/50 dark:border-primary/40' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">{icon} {recommendationTitle}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-none p-0"> {/* Removed border for nested Alert, added padding to CardContent */}
              <RecommendationIcon className={`h-5 w-5 ${advice.recommendChargeNow || advice.recommendChargeLater ? 'text-primary' : 'text-muted-foreground'}`} />
             <AlertTitle className="ml-7 font-semibold">{/* Title moved to CardHeader */}</AlertTitle>
             <AlertDescription className="ml-7">
               {advice.reason}
               {advice.details && <span className="block mt-1 text-xs text-muted-foreground">{advice.details}</span>}
                {advice.chargeNeededKWh !== undefined && advice.chargeNeededKWh > 0 && (
                  <span className="block mt-1 text-xs text-primary">Est. grid energy for battery: {advice.chargeNeededKWh.toFixed(1)} kWh {advice.chargeWindow && `(${advice.chargeWindow})`}.</span>
                )}
                 {advice.potentialSavingsKWh !== undefined && advice.potentialSavingsKWh > 0 && (
                   <span className="block mt-1 text-xs text-green-600 dark:text-green-400">Potential excess solar/savings: ~{advice.potentialSavingsKWh.toFixed(1)} kWh.</span>
                 )}
                  {advice.evRecommendation && (
                     <span className={cn(
                        "block mt-2 text-sm font-medium",
                        advice.evRecommendation.includes("Consider") || advice.evRecommendation.includes("Grid") ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"
                     )}>
                         <Car className="inline h-4 w-4 mr-1"/> EV Charge: {advice.evRecommendation}
                         {advice.evChargeWindow && <span className="text-xs block ml-5 text-muted-foreground">{advice.evChargeWindow}</span>}
                     </span>
                  )}
             </AlertDescription>
           </Alert>
          </CardContent>
       </Card>
     );
   };

    const batteryMaxInput = isMounted ? (settings?.batteryCapacityKWh ?? DEFAULT_BATTERY_MAX) : DEFAULT_BATTERY_MAX;
    const sliderMax = isMounted ? Math.max(2, avgHourlyConsumption * 5, 1) : 2;
    const currentBatteryPercentage = useMemo(() => {
        if (!isMounted || !settings?.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) return 0;
        return Math.round((currentBatteryLevel / settings.batteryCapacityKWh) * 100);
    }, [isMounted, settings?.batteryCapacityKWh, currentBatteryLevel]);

   return (
     <div className="space-y-6">
       <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold">Smart Charging Advisory</h1>
                <p className="text-muted-foreground">Optimize battery & EV charging based on your manual forecast, tariffs, and consumption.</p>
            </div>
            <div className="flex items-center gap-2">
             <HowToInfo pageKey="advisory" />
             <Dialog open={isForecastModalOpen} onOpenChange={setIsForecastModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!isMounted || !settings}>
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
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                   <div className="space-y-2">
                        <Label htmlFor="city-time-select-modal">Apply Approx. Times from City</Label>
                        <Select value={selectedCityForTimesModal} onValueChange={handleCityTimeSelectModal}>
                            <SelectTrigger id="city-time-select-modal">
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
                    {(['today', 'tomorrow'] as const).map((dayKey) => (
                        <div key={dayKey} className="space-y-3 p-3 border rounded-md">
                          <h3 className="font-semibold text-lg capitalize">{dayKey} ({editableForecast[dayKey].date})</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`${dayKey}-sunrise-adv`}>Sunrise (HH:MM)</Label>
                              <Input
                                id={`${dayKey}-sunrise-adv`}
                                type="time"
                                value={editableForecast[dayKey].sunrise}
                                onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunrise: e.target.value}}))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`${dayKey}-sunset-adv`}>Sunset (HH:MM)</Label>
                              <Input
                                id={`${dayKey}-sunset-adv`}
                                type="time"
                                value={editableForecast[dayKey].sunset}
                                onChange={(e) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], sunset: e.target.value}}))}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${dayKey}-condition-adv`}>Weather Condition</Label>
                            <Select
                              value={editableForecast[dayKey].condition}
                              onValueChange={(value) => setEditableForecast(prev => ({...prev, [dayKey]: {...prev[dayKey], condition: value as ManualDayForecast['condition']}}))}
                            >
                              <SelectTrigger id={`${dayKey}-condition-adv`}>
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
                      ))}
                      <div className="mt-4 border-t pt-4">
                        <ForecastInfo />
                      </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsForecastModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleForecastModalSave}>Save Forecast</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
       </div>

        {isMounted && !settings && (
             <Alert>
                 <SettingsIcon className="h-4 w-4" />
                 <AlertTitle>Configuration Needed</AlertTitle>
                 <AlertDescription>Please configure your system in <a href="/settings" className="underline font-medium">Settings</a> first to get personalized advice.</AlertDescription>
             </Alert>
        )}

      {/* Recommendations Section - Moved to Top */}
      {isMounted && settings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
           {renderAdviceCard(todayAdvice, "Today's Recommendation", "Based on current conditions and today's manual forecast.", <Sun className="h-5 w-5" />)}
           {renderAdviceCard(tomorrowAdvice, "Overnight Charging (for Tomorrow)", "Recommendation based on tomorrow's manual forecast and overnight tariffs.", <BatteryCharging className="h-5 w-5" />)}
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
             />
              {isMounted && settings?.batteryCapacityKWh && settings.batteryCapacityKWh > 0 ? (
                 <p className="text-xs text-muted-foreground flex items-center gap-1">
                   (<Percent className="h-3 w-3 inline" /> {currentBatteryPercentage}%) (Capacity: {settings.batteryCapacityKWh} kWh)
                 </p>
              ) : (
                  <p className="text-xs text-muted-foreground">{isMounted ? '(Set Battery Capacity in Settings to see %)' : ''}</p>
              )}
           </div>

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
                         placeholder="e.g., 0.4"
                         className="max-w-xs"
                     />
                 </div>
                  <Button variant="outline" size="sm" onClick={applyAverageConsumption} className="w-full md:w-auto">
                     Apply Average to All Hours
                  </Button>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="hourly-consumption">
                <AccordionTrigger>
                  <Label className="flex items-center gap-2 text-base">
                    Adjust Hourly Consumption Profile (kWh)
                  </Label>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2 space-y-3">
                     <p className="text-xs text-muted-foreground">Fine-tune expected usage per hour. Total daily consumption updates automatically.</p>
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
                             max={sliderMax}
                             step={0.1}
                             value={[usage]}
                             onValueChange={(value) => handleSliderChange(index, value)}
                             className="flex-grow"
                             aria-label={`Hourly consumption slider for hour ${index}`}
                           />
                            <span className="text-xs font-mono w-8 text-right">{usage.toFixed(1)}</span>
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
             <CardTitle className="flex items-center gap-2">
                 <Car className="h-5 w-5"/> EV Charging Preferences
             </CardTitle>
             <CardDescription>
                 Set your EV charging needs to integrate them into recommendations (values are saved automatically).
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
                     />
                 </div>
                 <div className="space-y-1">
                     <Label htmlFor="evChargeBy">Charge By Time (HH:MM)</Label>
                     <Input
                         id="evChargeBy"
                         type="time"
                         value={evChargeByTime}
                         onChange={(e) => setEvChargeByTime(e.target.value)}
                     />
                 </div>
                  <div className="space-y-1">
                     <Label htmlFor="evMaxRate">Max Charge Rate (kW)</Label>
                     <Input
                         id="evMaxRate"
                         type="number"
                         step="0.1"
                         min="0.1"
                         placeholder={`e.g., ${DEFAULT_EV_MAX_CHARGE_RATE}`}
                         value={evMaxChargeRateKWh}
                         onChange={(e) => setEvMaxChargeRateKWh(Math.max(0.1, parseFloat(e.target.value) || DEFAULT_EV_MAX_CHARGE_RATE))}
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
            <CardTitle>Forecast & Configuration Used</CardTitle>
             <CardDescription>Summary of the data used to generate the current advice.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                     <p><strong>Today's Est. Generation:</strong> {todayForecastCalc ? `${todayForecastCalc.dailyTotalGenerationKWh.toFixed(2)} kWh (${todayForecastCalc.weatherCondition.replace('_',' ') || 'N/A'})` : 'N/A'}</p>
                     <p><strong>Tomorrow's Est. Generation:</strong> {tomorrowForecastCalc ? `${tomorrowForecastCalc.dailyTotalGenerationKWh.toFixed(2)} kWh (${tomorrowForecastCalc.weatherCondition.replace('_',' ') || 'N/A'})` : 'N/A'}</p>
                 </div>
                  <div>
                     <p><strong>Battery Capacity:</strong> {settings?.batteryCapacityKWh ? `${settings.batteryCapacityKWh} kWh` : 'Not Set'}</p>
                     <p><strong>Current Battery Input:</strong> {currentBatteryLevel.toFixed(1)} kWh ({currentBatteryPercentage}%)</p>
                     <p><strong>Est. Daily Consumption Input:</strong> {dailyConsumption.toFixed(1)} kWh</p>
                  </div>
              </div>
              {evChargeRequiredKWh > 0 && (
                 <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                     <p><strong>EV Charge Need:</strong> {evChargeRequiredKWh} kWh by {evChargeByTime || 'N/A'} (Max rate: {evMaxChargeRateKWh} kW)</p>
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
              <p className="text-xs text-muted-foreground pt-2">Advice accuracy depends on your manual forecast inputs, system settings, tariff periods, and current consumption inputs. Recommendations are estimates.</p>
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

