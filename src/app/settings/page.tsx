
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings, TariffPeriod } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CalendarDays, HelpCircle as HelpCircleIcon, BarChart, Hourglass, Clock, BatteryCharging as BatteryChargingIcon, Percent, Zap, InfoIcon, CheckCircle, Trash2, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { propertyDirectionOptions, getFactorByDirectionValue, type PropertyDirectionInfo } from '@/types/settings';
import { Switch } from '@/components/ui/switch'; // Added for Tariff isCheap toggle
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HowToInfo } from '@/components/how-to-info';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined; 
  };
  boundingbox: string[];
}

interface AddressLookupResult {
  place_id: number;
  address: string; 
  lat?: number;
  lng?: number;
}

async function lookupAddressesByPostcode(postcode: string): Promise<AddressLookupResult[]> {
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q: postcode,
    format: 'json',
    addressdetails: '1', 
    countrycodes: 'gb', 
    limit: '10', 
  });

  try {
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' } 
    });

    if (!response.ok) {
      let errorMsg = `Address lookup failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        errorMsg += ` Details: ${errorData?.error?.message || response.statusText}`;
      } catch (e) {/* ignore */}
      throw new Error(errorMsg);
    }

    const data: NominatimResult[] = await response.json();
    if (!Array.isArray(data)) {
        console.warn("Received non-array data from address lookup:", data);
        if (typeof data === 'object' && data !== null && (data as NominatimResult).place_id) {
            return [{
                place_id: (data as NominatimResult).place_id,
                address: (data as NominatimResult).display_name,
                lat: parseFloat((data as NominatimResult).lat),
                lng: parseFloat((data as NominatimResult).lon),
            }];
        }
        throw new Error("Received invalid data format from address lookup service.");
    }
    const postcodeResults = data.filter(result => result.address?.postcode && result.address.postcode.replace(/\s+/g, '') === postcode.replace(/\s+/g, ''));
    if (postcodeResults.length === 0 && data.length > 0) {
        console.warn(`No exact postcode matches for ${postcode}, returning broader results.`);
        return data.map(item => ({
            place_id: item.place_id,
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
        }));
    }

    return postcodeResults.map(item => ({
      place_id: item.place_id,
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

  } catch (error) {
    console.error("Nominatim lookup error:", error);
    if (error instanceof Error) {
       throw new Error(`Address lookup failed: ${error.message}`);
    } else {
       throw new Error("An unknown error occurred during address lookup.");
    }
  }
}

const defaultMonthlyFactors = [
  0.3, 0.4, 0.6, 0.8, 1.0, 1.1, 1.0, 0.9, 0.7, 0.5, 0.35, 0.25
];

const settingsSchema = z.object({
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  propertyDirection: z.string().min(1, { message: "Please select a property direction." }),
  propertyDirectionFactor: z.coerce.number().optional(),
  panelCount: z.coerce.number().int().positive().optional(),
  panelWatts: z.coerce.number().int().positive().optional(),
  totalKWp: z.coerce.number().positive({ message: "Total System Power (kWp) must be positive if provided." }).optional(),
  batteryCapacityKWh: z.coerce.number().nonnegative().optional(),
  batteryMaxChargeRateKWh: z.coerce.number().positive().optional(),
  preferredOvernightBatteryChargePercent: z.coerce.number().min(0).max(100).optional(),
  systemEfficiency: z.coerce.number().min(0).max(1).optional(),
  dailyConsumptionKWh: z.coerce.number().positive().optional(),
  avgHourlyConsumptionKWh: z.coerce.number().positive().optional(),
  hourlyUsageProfile: z.array(z.coerce.number().nonnegative()).length(24).optional(),
  selectedWeatherSource: z.string().optional(),
  evChargeRequiredKWh: z.coerce.number().nonnegative().optional(),
  evChargeByTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:MM)" }).optional().or(z.literal('')),
  evMaxChargeRateKWh: z.coerce.number().positive().optional(),
  monthlyGenerationFactors: z.array(z.coerce.number().min(0).max(2)).length(12).optional(),
});

const HOURS_IN_DAY = 24;
const SOUTH_DIRECTION_INFO = propertyDirectionOptions.find(opt => opt.value === 'South') || propertyDirectionOptions[0];


export default function SettingsPage() {
  const [storedSettings, setStoredSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const { toast } = useToast();
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<AddressLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedAddressValue, setSelectedAddressValue] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDirectionInfo, setSelectedDirectionInfo] = useState<PropertyDirectionInfo | null>(SOUTH_DIRECTION_INFO);
  const [currentHour, setCurrentHour] = useState<number | null>(null);
  const [calculatedKWpFromPanels, setCalculatedKWpFromPanels] = useState<number | undefined>(undefined);

  // Tariff state and handlers
  const [tariffPeriods, setTariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newIsCheap, setNewIsCheap] = useState(false);
  const [newRate, setNewRate] = useState<number | undefined>(undefined);

  const form = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      location: '',
      propertyDirection: SOUTH_DIRECTION_INFO.value,
      propertyDirectionFactor: SOUTH_DIRECTION_INFO.factor,
      systemEfficiency: 0.85,
      selectedWeatherSource: 'open-meteo',
      dailyConsumptionKWh: 10,
      avgHourlyConsumptionKWh: 0.4,
      hourlyUsageProfile: Array(HOURS_IN_DAY).fill(0.4),
      evChargeRequiredKWh: 0,
      evChargeByTime: '07:00',
      evMaxChargeRateKWh: 7.5,
      monthlyGenerationFactors: [...defaultMonthlyFactors],
      preferredOvernightBatteryChargePercent: 100,
      panelCount: undefined,
      panelWatts: undefined,
      totalKWp: undefined,
      batteryCapacityKWh: undefined,
      batteryMaxChargeRateKWh: 5,
    },
    mode: 'onChange',
  });

  const watchedPanelCount = form.watch('panelCount');
  const watchedPanelWatts = form.watch('panelWatts');
  const watchedSource = form.watch('selectedWeatherSource');

  useEffect(() => {
    if (watchedPanelCount && watchedPanelWatts && watchedPanelCount > 0 && watchedPanelWatts > 0) {
      const calculatedKWp = parseFloat(((watchedPanelCount * watchedPanelWatts) / 1000).toFixed(2));
      setCalculatedKWpFromPanels(calculatedKWp);
    } else {
      setCalculatedKWpFromPanels(undefined);
    }
  }, [watchedPanelCount, watchedPanelWatts]);

  useEffect(() => {
    setIsMounted(true);
    setCurrentHour(new Date().getHours());
    const timer = setInterval(() => {
        setCurrentHour(new Date().getHours());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

   useEffect(() => {
     if(isMounted && storedSettings) {
      const factorsToSet = storedSettings.monthlyGenerationFactors && storedSettings.monthlyGenerationFactors.length === 12
        ? storedSettings.monthlyGenerationFactors
        : [...defaultMonthlyFactors];

      const hourlyProfileToSet = storedSettings.hourlyUsageProfile && storedSettings.hourlyUsageProfile.length === HOURS_IN_DAY
        ? storedSettings.hourlyUsageProfile
        : Array(HOURS_IN_DAY).fill(storedSettings.avgHourlyConsumptionKWh || 0.4);

       form.reset({
         ...storedSettings,
         propertyDirection: storedSettings.propertyDirection || SOUTH_DIRECTION_INFO.value,
         propertyDirectionFactor: storedSettings.propertyDirectionFactor ?? SOUTH_DIRECTION_INFO.factor,
         monthlyGenerationFactors: factorsToSet,
         hourlyUsageProfile: hourlyProfileToSet,
         selectedWeatherSource: storedSettings.selectedWeatherSource || 'open-meteo',
         preferredOvernightBatteryChargePercent: storedSettings.preferredOvernightBatteryChargePercent ?? 100,
         batteryMaxChargeRateKWh: storedSettings.batteryMaxChargeRateKWh ?? 5,
       });
       
       if (storedSettings.location && storedSettings.latitude && storedSettings.longitude) {
          const matchingAddress = addresses.find(addr => addr.lat === storedSettings.latitude && addr.lng === storedSettings.longitude);
          setSelectedAddressValue(matchingAddress ? matchingAddress.place_id.toString() : storedSettings.location);
       } else if (storedSettings.location) {
         setSelectedAddressValue(storedSettings.location);
       } else {
          setSelectedAddressValue(undefined);
       }
        const currentDirection = propertyDirectionOptions.find(opt => opt.value === (storedSettings.propertyDirection || SOUTH_DIRECTION_INFO.value));
        setSelectedDirectionInfo(currentDirection || SOUTH_DIRECTION_INFO);

     } else if (isMounted) {
        form.reset({
         location: '',
         latitude: undefined,
         longitude: undefined,
         propertyDirection: SOUTH_DIRECTION_INFO.value,
         propertyDirectionFactor: SOUTH_DIRECTION_INFO.factor,
         panelCount: undefined,
         panelWatts: undefined,
         totalKWp: undefined,
         batteryCapacityKWh: undefined,
         batteryMaxChargeRateKWh: 5,
         systemEfficiency: 0.85,
         selectedWeatherSource: 'open-meteo',
         dailyConsumptionKWh: 10,
         avgHourlyConsumptionKWh: 0.4,
         hourlyUsageProfile: Array(HOURS_IN_DAY).fill(0.4),
         evChargeRequiredKWh: 0,
         evChargeByTime: '07:00',
         evMaxChargeRateKWh: 7.5,
         monthlyGenerationFactors: [...defaultMonthlyFactors],
         preferredOvernightBatteryChargePercent: 100,
       });
       setSelectedAddressValue(undefined);
       setSelectedDirectionInfo(SOUTH_DIRECTION_INFO);
     }
   }, [storedSettings, form, isMounted, addresses]);


   useEffect(() => {
       setAddresses([]);
       setLookupError(null);
   }, [postcode]);


  const onSubmit = (data: UserSettings) => {
    const saveData: UserSettings = { ...data };
    
    const numericFields: (keyof UserSettings)[] = [
        'latitude', 'longitude', 'panelCount', 'panelWatts', 'totalKWp',
        'batteryCapacityKWh', 'batteryMaxChargeRateKWh', 'systemEfficiency', 'dailyConsumptionKWh',
        'avgHourlyConsumptionKWh', 'evChargeRequiredKWh', 'evMaxChargeRateKWh',
        'propertyDirectionFactor', 'preferredOvernightBatteryChargePercent'
    ];
    numericFields.forEach(field => {
       if (saveData[field] === '' || saveData[field] === null || isNaN(Number(saveData[field]))) {
            (saveData as any)[field] = undefined;
        } else {
            (saveData as any)[field] = Number(saveData[field]);
        }
    });
    if (!saveData.evChargeByTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(saveData.evChargeByTime)) {
        saveData.evChargeByTime = undefined;
    }

    if (saveData.monthlyGenerationFactors) {
        saveData.monthlyGenerationFactors = saveData.monthlyGenerationFactors.map(factor =>
            (factor === null || factor === undefined || isNaN(Number(factor))) ? 1.0 : Number(factor)
        );
    } else {
        saveData.monthlyGenerationFactors = [...defaultMonthlyFactors];
    }

    if (saveData.hourlyUsageProfile) {
        saveData.hourlyUsageProfile = saveData.hourlyUsageProfile.map(usage =>
            (usage === null || usage === undefined || isNaN(Number(usage))) ? 0 : Number(usage)
        );
    } else {
        saveData.hourlyUsageProfile = Array(HOURS_IN_DAY).fill(saveData.avgHourlyConsumptionKWh || 0.4);
    }

    if (selectedDirectionInfo && data.propertyDirection === selectedDirectionInfo.value) {
        saveData.propertyDirectionFactor = selectedDirectionInfo.factor;
    } else {
        const direction = propertyDirectionOptions.find(opt => opt.value === data.propertyDirection);
        saveData.propertyDirectionFactor = direction ? direction.factor : SOUTH_DIRECTION_INFO.factor;
    }
    saveData.selectedWeatherSource = data.selectedWeatherSource || 'open-meteo';
    saveData.preferredOvernightBatteryChargePercent = data.preferredOvernightBatteryChargePercent ?? 100;


    setStoredSettings(saveData);
    toast({
      title: "Settings Saved",
      description: "Your solar system configuration has been updated.",
    });
  };

  const handlePostcodeLookup = async () => {
    if (!postcode) {
      setLookupError("Please enter a postcode.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setAddresses([]);
    setSelectedAddressValue(undefined);
    form.setValue('location', '');
    form.setValue('latitude', undefined);
    form.setValue('longitude', undefined);

    try {
      const results = await lookupAddressesByPostcode(postcode.trim());
      if (results.length === 0) {
           setLookupError("No addresses found for this postcode via Nominatim. Try a nearby or broader postcode, or enter details manually.");
      } else {
          setAddresses(results);
      }
    } catch (error) {
        setLookupError(error instanceof Error ? error.message : "Address lookup failed. Please check the postcode or try again later.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddressSelect = (selectedValue: string) => {
      const selectedData = addresses.find(addr => addr.place_id.toString() === selectedValue);
      if (selectedData) {
        setSelectedAddressValue(selectedData.place_id.toString());
        form.setValue('location', selectedData.address, { shouldValidate: true });
        form.setValue('latitude', selectedData.lat, { shouldValidate: true });
        form.setValue('longitude', selectedData.lng, { shouldValidate: true });
        setLookupError(null);
      }
  };

  const handleDirectionChange = (value: string) => {
    const direction = propertyDirectionOptions.find(opt => opt.value === value);
    if (direction) {
      form.setValue('propertyDirection', direction.value, { shouldValidate: true });
      form.setValue('propertyDirectionFactor', direction.factor, { shouldValidate: true });
      setSelectedDirectionInfo(direction);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleHourlySliderChange = (index: number, value: number[]) => {
    const currentHourlyProfile = form.getValues('hourlyUsageProfile') || Array(HOURS_IN_DAY).fill(0);
    const newHourlyProfile = [...currentHourlyProfile];
    newHourlyProfile[index] = value[0];
    form.setValue('hourlyUsageProfile', newHourlyProfile, { shouldValidate: true, shouldDirty: true });

    const newDailyTotal = newHourlyProfile.reduce((sum, val) => sum + val, 0);
    form.setValue('dailyConsumptionKWh', parseFloat(newDailyTotal.toFixed(2)), { shouldValidate: true, shouldDirty: true });
  };

  const distributeDailyConsumption = () => {
    const dailyConsumption = form.getValues('dailyConsumptionKWh');
    if (dailyConsumption === undefined || dailyConsumption <= 0) {
        toast({ title: "Invalid Input", description: "Daily consumption must be greater than 0 to distribute.", variant: "destructive" });
        return;
    }
    const avg = dailyConsumption / HOURS_IN_DAY;
    form.setValue('avgHourlyConsumptionKWh', parseFloat(avg.toFixed(2)), { shouldValidate: true, shouldDirty: true });
    form.setValue('hourlyUsageProfile', Array(HOURS_IN_DAY).fill(avg), { shouldValidate: true, shouldDirty: true });
  };

  const applyAverageConsumption = () => {
    const avgHourlyConsumption = form.getValues('avgHourlyConsumptionKWh');
    if (avgHourlyConsumption === undefined || avgHourlyConsumption < 0) {
        toast({ title: "Invalid Input", description: "Average hourly consumption must be 0 or greater to apply.", variant: "destructive" });
        return;
    }
    form.setValue('hourlyUsageProfile', Array(HOURS_IN_DAY).fill(avgHourlyConsumption), { shouldValidate: true, shouldDirty: true });
    form.setValue('dailyConsumptionKWh', parseFloat((avgHourlyConsumption * HOURS_IN_DAY).toFixed(2)), { shouldValidate: true, shouldDirty: true });
  };

  const applyCalculatedKWp = () => {
    if (calculatedKWpFromPanels !== undefined) {
      form.setValue('totalKWp', calculatedKWpFromPanels, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Applied Calculated Power",
        description: `${calculatedKWpFromPanels.toFixed(2)} kWp has been set as Total System Power.`,
      });
    }
  };

  const watchedHourlyProfile = form.watch('hourlyUsageProfile') || Array(HOURS_IN_DAY).fill(0);
  const watchedAvgHourlyConsumption = form.watch('avgHourlyConsumptionKWh') || 0.4;
  const sliderMax = Math.max(1, watchedAvgHourlyConsumption * 3, 0.5);


  // Tariff Management Functions
  const isValidTime = (time: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

  const handleAddPeriod = () => {
    if (!newPeriodName || !newStartTime || !newEndTime) {
      toast({
        title: "Missing Information",
        description: "Please provide a name, start time, and end time for the tariff period.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidTime(newStartTime) || !isValidTime(newEndTime)) {
      toast({
        title: "Invalid Time Format",
        description: "Please use HH:MM format for tariff times (e.g., 00:00, 14:30).",
        variant: "destructive",
      });
      return;
    }

    // Basic overlap check
    const overlap = tariffPeriods.some(p => {
      const pStart = parseInt(p.startTime.split(':')[0]) * 60 + parseInt(p.startTime.split(':')[1]);
      const pEnd = parseInt(p.endTime.split(':')[0]) * 60 + parseInt(p.endTime.split(':')[1]);
      const newStart = parseInt(newStartTime.split(':')[0]) * 60 + parseInt(newStartTime.split(':')[1]);
      const pDuration = pEnd > pStart ? pEnd - pStart : (24 * 60 - pStart) + pEnd;
      return newStart >= pStart && newStart < (pStart + pDuration);
    });

    if (overlap) {
      toast({
        title: "Potential Overlap",
        description: "The new tariff period might overlap with an existing one. Please review.",
        variant: "destructive",
      });
      return;
    }

    const newPeriod: TariffPeriod = {
      id: Date.now().toString(),
      name: newPeriodName,
      startTime: newStartTime,
      endTime: newEndTime,
      isCheap: newIsCheap,
      rate: newRate,
    };

    setTariffPeriods([...tariffPeriods, newPeriod]);
    setNewPeriodName('');
    setNewStartTime('');
    setNewEndTime('');
    setNewIsCheap(false);
    setNewRate(undefined);

    toast({
      title: "Tariff Period Added",
      description: `"${newPeriod.name}" has been saved.`,
    });
  };

  const handleRemovePeriod = (id: string) => {
    setTariffPeriods(tariffPeriods.filter(p => p.id !== id));
    toast({
      title: "Tariff Period Removed",
      description: "The selected period has been deleted.",
    });
  };


  if (!isMounted) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold">System Configuration</h1>
         <HowToInfo pageKey="settings" />
      </div>

    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Configure your solar panel system and location details. This information is used for forecast calculations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

             <div className="space-y-2 p-4 border rounded-md bg-muted/50">
               <h3 className="text-lg font-medium mb-2">Location Lookup</h3>
                 <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                   <div className="flex-grow space-y-1 w-full sm:w-auto">
                     <Label htmlFor="postcode">Enter Postcode (UK)</Label>
                     <Input
                       id="postcode"
                       placeholder="e.g., KY4 0BD or SW1A 0AA"
                       value={postcode}
                       onChange={(e) => setPostcode(e.target.value)}
                       className="max-w-xs"
                       aria-label="Postcode input for address lookup"
                     />
                   </div>
                   <Button
                     type="button"
                     onClick={handlePostcodeLookup}
                     disabled={lookupLoading || !postcode}
                     variant="secondary"
                     className="w-full sm:w-auto"
                     aria-label="Find addresses for entered postcode"
                   >
                     {lookupLoading ? (
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     ) : (
                       <Search className="mr-2 h-4 w-4" />
                     )}
                     Find Address
                   </Button>
                 </div>

                 {lookupError && (
                   <Alert variant="destructive" className="mt-2">
                      <AlertTitle>Lookup Error</AlertTitle>
                     <AlertDescription>{lookupError}</AlertDescription>
                   </Alert>
                 )}

               {addresses.length > 0 && !lookupLoading && (
                    <div className="space-y-1 mt-2">
                       <Label htmlFor="addressSelect">Select Address</Label>
                      <Select
                         value={selectedAddressValue}
                         onValueChange={handleAddressSelect}
                         aria-label="Select an address from the lookup results"
                       >
                         <SelectTrigger id="addressSelect">
                           <SelectValue placeholder="Choose from found addresses..." />
                         </SelectTrigger>
                         <SelectContent>
                           {addresses.map((addr) => (
                             <SelectItem key={addr.place_id} value={addr.place_id.toString()}>
                               {addr.address}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
               )}
                 <p className="text-xs text-muted-foreground mt-2">Address lookup powered by <a href="https://nominatim.org/" target="_blank" rel="noopener noreferrer" className="underline">Nominatim</a> & OpenStreetMap.</p>
             </div>


            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selected Location / Manual Entry</FormLabel>
                  <FormControl>
                    <Input placeholder="Select address above or enter location manually (e.g., city)" {...field} />
                  </FormControl>
                  <FormDescription>Your selected address or a manual location entry (used for display and as fallback if no coords).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude (Decimal)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Filled by lookup or enter manually" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude (Decimal)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Filled by lookup or enter manually" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
              <FormDescription>Coordinates are crucial for solar calculations. Ensure they are accurate if entered manually or if lookup is approximate.</FormDescription>


            <FormField
              control={form.control}
              name="propertyDirection"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Property/Panel Direction</FormLabel>
                    <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}>
                         <HelpCircleIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-sm font-semibold mb-1">Panel Direction Factors:</p>
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                            {propertyDirectionOptions.map(opt => (
                                <li key={opt.value}><strong>{opt.label.split('(')[0].trim()}:</strong> {opt.notes}</li>
                            ))}
                        </ul>
                        <p className="text-xs mt-2">These factors adjust estimated generation based on panel orientation relative to South (1.00).</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                   <Select
                        onValueChange={(value) => {
                           handleDirectionChange(value);
                           field.onChange(value);
                        }}
                        value={field.value}
                        defaultValue={SOUTH_DIRECTION_INFO.value}
                    >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facing direction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {propertyDirectionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Approximate direction your main solar panels face. Factor applied: {selectedDirectionInfo?.factor.toFixed(2) ?? 'N/A'}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-medium">Solar Panel System Details</h3>
                <p className="text-sm text-muted-foreground">
                    Input panel details to estimate total system power. This estimate can then be applied to the "Total System Power (kWp)" field below, or you can enter your system's official rating directly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="panelCount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Number of Panels</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 18" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="panelWatts"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Max Power per Panel (Watts)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 405" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                {calculatedKWpFromPanels !== undefined && (
                    <div className="mt-2 p-3 border border-dashed border-primary/50 rounded-md bg-primary/5 space-y-2">
                        <div className="flex items-center gap-2">
                            <InfoIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div>
                                <p className="text-sm text-primary font-medium">
                                    Calculated from panel details: {calculatedKWpFromPanels.toFixed(2)} kWp
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    This is an estimate. Your system's official rating might differ.
                                </p>
                            </div>
                        </div>
                        <Button 
                            type="button" 
                            onClick={applyCalculatedKWp} 
                            variant="outline" 
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply to Total System Power
                        </Button>
                    </div>
                )}
            </div>

            <FormField
              control={form.control}
              name="totalKWp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total System Power (kWp)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g., 7.20" 
                      {...field} 
                      value={field.value ?? ''} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} 
                    />
                  </FormControl>
                   <FormDescription>
                     Enter the Kilowatt-peak (kWp) rating of your entire solar array (e.g., from your installation documents). This is the primary value used for forecasts.
                   </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="batteryCapacityKWh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><BatteryChargingIcon className="h-4 w-4"/>Battery Capacity (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 19.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                      </FormControl>
                      <FormDescription>Total usable capacity. Leave blank if no battery.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="batteryMaxChargeRateKWh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Zap className="h-4 w-4"/>Battery Max Charge Rate (kW)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 5.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                      </FormControl>
                      <FormDescription>Max power battery can charge at. Default 5kW.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="preferredOvernightBatteryChargePercent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1"><Percent className="h-4 w-4" />Overnight Battery Target (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" min="0" max="100" placeholder="e.g., 90" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                            </FormControl>
                            <FormDescription>Target charge level for overnight (0-100%). Default 100%.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>


            <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-medium">Consumption Estimates (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="dailyConsumptionKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Hourglass className="h-4 w-4" />Daily Consumption (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 10.50" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} className="max-w-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={distributeDailyConsumption} className="w-full md:w-auto">
                        Distribute Evenly to Hourly
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="avgHourlyConsumptionKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><BarChart className="h-4 w-4" />Avg. Hourly Consumption (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 0.40" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} className="max-w-xs"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <Button type="button" variant="outline" size="sm" onClick={applyAverageConsumption} className="w-full md:w-auto">
                        Apply Average to All Hours
                    </Button>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="hourly-consumption-profile">
                    <AccordionTrigger>
                      <Label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                        Adjust Hourly Consumption Profile (kWh)
                      </Label>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-2 space-y-3">
                        <p className="text-xs text-muted-foreground">Fine-tune expected usage per hour. Total daily consumption updates automatically when sliders are used.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
                          {watchedHourlyProfile.map((usage, index) => (
                            <div key={index} className="space-y-1">
                              <Label
                                htmlFor={`hour-profile-${index}`}
                                className={cn(
                                  "text-xs",
                                  currentHour === index ? 'text-primary font-semibold' : 'text-muted-foreground'
                                )}
                              >
                                {`${index.toString().padStart(2, '0')}:00`}
                                {currentHour === index ? ' (Now)' : ''}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Slider
                                  id={`hour-profile-${index}`}
                                  min={0}
                                  max={sliderMax}
                                  step={0.01}
                                  value={[usage]}
                                  onValueChange={(value) => handleHourlySliderChange(index, value)}
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
                <FormDescription>
                    Providing these helps refine charging advice on the Advisory page. They are not directly used for solar generation forecast but are saved with your settings.
                </FormDescription>
            </div>


            <FormField
              control={form.control}
              name="systemEfficiency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Efficiency Factor (Optional)</FormLabel>
                  <FormControl>
                     <Input type="number" step="0.01" min="0.1" max="1" placeholder="e.g., 0.85 for 85%" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormDescription>Overall efficiency including inverter, wiring, panel degradation etc. (0.1 to 1.0). Affects generation estimates. Default is 0.85 if left blank.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="btn-silver w-full sm:w-auto">Save General Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>

    <Card>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="monthly-efficiency">
          <AccordionTrigger className="px-6 py-3 hover:no-underline">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5"/> Manage Time of Year Efficiency
              </CardTitle>
              <CardDescription className="text-left mt-1">
                Adjust the relative generation factor for each month if using 'Manual Input' source.
                Current month: {isMounted ? format(new Date(), "MMMM") : ""}.
              </CardDescription>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-2">
             {watchedSource === 'manual' ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {monthNames.map((monthName, index) => (
                        <FormField
                          key={monthName}
                          control={form.control}
                          name={`monthlyGenerationFactors.${index}` as `monthlyGenerationFactors.${number}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={isMounted && index === new Date().getMonth() ? 'text-primary font-semibold' : ''}>
                                {monthName} Factor
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="2"
                                  placeholder="e.g., 1.00"
                                  {...field}
                                  value={field.value ?? ''}
                                  onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormDescription>
                      These factors adjust the baseline solar generation estimate for seasonality when using 'Manual Input' source.
                      A factor of 1.00 means average generation for that month, 0.50 means 50%, 1.20 means 120%.
                    </FormDescription>
                    <Button type="submit" className="btn-silver w-full sm:w-auto">Save Monthly Factors</Button>
                  </form>
                </Form>
              ) : (
                <p className="text-sm text-muted-foreground">
                    Monthly generation factors are only applicable when the weather source is set to 'Manual Input'.
                    For API-based sources like Open-Meteo, seasonal variations are inherently part of the detailed forecast data provided by the API.
                </p>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>

    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Tariff Periods</CardTitle>
            <CardDescription>Define your electricity supplier's tariff periods (e.g., peak, off-peak). This helps with smart charging advice.</CardDescription>
          </div>
          <HowToInfo pageKey="tariffs" />
        </CardHeader>
        <CardContent className="space-y-4">
           {!isMounted ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading tariff periods...</span>
              </div>
           ) : tariffPeriods.length === 0 ? (
             <p className="text-muted-foreground">No tariff periods defined yet. Add your first period below.</p>
          ) : (
             <ul className="space-y-3">
              {tariffPeriods.map((period) => (
                <li key={period.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md bg-muted/50">
                  <div className="flex-grow mb-2 sm:mb-0">
                    <p className="font-semibold">{period.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {period.startTime} - {period.endTime}
                      {period.rate !== undefined && ` (${period.rate} p/kWh)`}
                      {period.isCheap && <span className="ml-2 text-green-600 dark:text-green-400">(Cheap Rate)</span>}
                    </p>
                  </div>
                   <Button variant="ghost" size="sm" onClick={() => handleRemovePeriod(period.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4 mr-1"/> Remove
                   </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
         <CardContent className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Add New Tariff Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="periodName">Period Name</Label>
                <Input id="periodName" placeholder="e.g., Night Saver, Peak" value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} />
              </div>
               <div className="space-y-1">
                 <Label htmlFor="rate">Rate (pence/kWh, Optional)</Label>
                 <Input id="rate" type="number" step="0.01" placeholder="e.g., 7.5" value={newRate ?? ''} onChange={(e) => setNewRate(e.target.value ? parseFloat(e.target.value) : undefined)} />
               </div>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <Label htmlFor="startTime">Start Time (HH:MM)</Label>
                 <Input id="startTime" type="time" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
               </div>
               <div className="space-y-1">
                 <Label htmlFor="endTime">End Time (HH:MM)</Label>
                 <Input id="endTime" type="time" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
               </div>
             </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch id="isCheap" checked={newIsCheap} onCheckedChange={setNewIsCheap} />
                <Label htmlFor="isCheap">This is a cheap/off-peak rate period</Label>
              </div>
             <Button onClick={handleAddPeriod} className="btn-silver mt-4">
                <PlusCircle className="h-4 w-4 mr-2"/> Add Period
             </Button>
        </CardContent>
      </Card>

    </div>
    </TooltipProvider>
  );
}

