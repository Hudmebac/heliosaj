
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserSettings } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, CalendarDays, HelpCircle as HelpCircleIcon, BarChart, Hourglass, Clock, BatteryCharging as BatteryChargingIcon, Percent } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { propertyDirectionOptions, getFactorByDirectionValue, type PropertyDirectionInfo } from '@/types/settings';
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

// Define Nominatim API result structure (simplified for address selection)
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
    [key: string]: string | undefined; // For other address components
  };
  boundingbox: string[];
}

interface AddressLookupResult {
  place_id: number;
  address: string; // display_name from Nominatim
  lat?: number;
  lng?: number;
}

// Function to lookup addresses by postcode using Nominatim
async function lookupAddressesByPostcode(postcode: string): Promise<AddressLookupResult[]> {
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q: postcode,
    format: 'json',
    addressdetails: '1', // Include address breakdown
    countrycodes: 'gb', // Focus on UK addresses, adjust if needed
    limit: '10', // Limit results
  });

  try {
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'Accept': 'application/json' } // Nominatim prefers JSON
    });

    if (!response.ok) {
      let errorMsg = `Address lookup failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        errorMsg += ` Details: ${errorData?.error?.message || response.statusText}`;
      } catch (e) {/* ignore if error data parsing fails */}
      throw new Error(errorMsg);
    }

    const data: NominatimResult[] = await response.json();
    if (!Array.isArray(data)) {
        // Nominatim might return a single object if only one result, or error
        console.warn("Received non-array data from address lookup:", data);
        if (typeof data === 'object' && data !== null && (data as NominatimResult).place_id) {
             // Handle single result case by wrapping in an array
            return [{
                place_id: (data as NominatimResult).place_id,
                address: (data as NominatimResult).display_name,
                lat: parseFloat((data as NominatimResult).lat),
                lng: parseFloat((data as NominatimResult).lon),
            }];
        }
        throw new Error("Received invalid data format from address lookup service.");
    }

    // Filter results to ensure they are relevant to the searched postcode
    // This helps if Nominatim returns broader results for a partial postcode
    const postcodeResults = data.filter(result => result.address?.postcode && result.address.postcode.replace(/\s+/g, '') === postcode.replace(/\s+/g, ''));

    // If strict postcode filtering yields no results, but original query did, return original (broader) results
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
  0.3, // Jan
  0.4, // Feb
  0.6, // Mar
  0.8, // Apr
  1.0, // May
  1.1, // Jun
  1.0, // Jul
  0.9, // Aug
  0.7, // Sep
  0.5, // Oct
  0.35, // Nov
  0.25  // Dec
];

const settingsSchema = z.object({
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  latitude: z.coerce.number().optional(), // Made optional as it can be derived
  longitude: z.coerce.number().optional(), // Made optional as it can be derived
  propertyDirection: z.string().min(1, { message: "Please select a property direction." }), // Changed from enum
  propertyDirectionFactor: z.coerce.number().optional(), // Added to store the factor
  inputMode: z.enum(['Panels', 'TotalPower']),
  panelCount: z.coerce.number().int().positive().optional(),
  panelWatts: z.coerce.number().int().positive().optional(),
  totalKWp: z.coerce.number().positive().optional(),
  batteryCapacityKWh: z.coerce.number().nonnegative().optional(),
  preferredOvernightBatteryChargePercent: z.coerce.number().min(0).max(100).optional(),
  systemEfficiency: z.coerce.number().min(0).max(1).optional(), // 0.0 to 1.0
  dailyConsumptionKWh: z.coerce.number().positive().optional(),
  avgHourlyConsumptionKWh: z.coerce.number().positive().optional(),
  hourlyUsageProfile: z.array(z.coerce.number().nonnegative()).length(24).optional(),
  selectedWeatherSource: z.string().optional(),
  evChargeRequiredKWh: z.coerce.number().nonnegative().optional(),
  evChargeByTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:MM)" }).optional().or(z.literal('')),
  evMaxChargeRateKWh: z.coerce.number().positive().optional(),
  monthlyGenerationFactors: z.array(z.coerce.number().min(0).max(2)).length(12).optional(),
}).refine(data => {
    if (data.inputMode === 'Panels') {
      return data.panelCount !== undefined && data.panelWatts !== undefined;
    }
    return true;
  }, {
    message: "Panel Count and Watts per Panel are required when 'By Panel' is selected.",
    path: ["panelCount"],
  }).refine(data => {
    if (data.inputMode === 'TotalPower') {
      return data.totalKWp !== undefined;
    }
    return true;
  }, {
    message: "Total System Power (kWp) is required when 'By Total Power' is selected.",
    path: ["totalKWp"],
});

const HOURS_IN_DAY = 24;
const SOUTH_DIRECTION_INFO = propertyDirectionOptions.find(opt => opt.value === 'South') || propertyDirectionOptions[0];


export default function SettingsPage() {
  const [storedSettings, setStoredSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const { toast } = useToast();
  const [currentInputMode, setCurrentInputMode] = useState<'Panels' | 'TotalPower'>('Panels');
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<AddressLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedAddressValue, setSelectedAddressValue] = useState<string | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDirectionInfo, setSelectedDirectionInfo] = useState<PropertyDirectionInfo | null>(SOUTH_DIRECTION_INFO);
  const [currentHour, setCurrentHour] = useState<number | null>(null);


  const form = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      location: '',
      propertyDirection: SOUTH_DIRECTION_INFO.value, 
      propertyDirectionFactor: SOUTH_DIRECTION_INFO.factor,
      inputMode: 'Panels',
      systemEfficiency: 0.85,
      selectedWeatherSource: 'manual', // Default to manual forecast
      dailyConsumptionKWh: 10,
      avgHourlyConsumptionKWh: 0.4,
      hourlyUsageProfile: Array(HOURS_IN_DAY).fill(0.4), // Default hourly usage
      evChargeRequiredKWh: 0,
      evChargeByTime: '07:00',
      evMaxChargeRateKWh: 7.5,
      monthlyGenerationFactors: [...defaultMonthlyFactors],
      preferredOvernightBatteryChargePercent: 100,
    },
    mode: 'onChange',
  });

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
         selectedWeatherSource: storedSettings.selectedWeatherSource || 'manual',
         preferredOvernightBatteryChargePercent: storedSettings.preferredOvernightBatteryChargePercent ?? 100,
       });
       setCurrentInputMode(storedSettings.inputMode || 'Panels');
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
         inputMode: 'Panels',
         panelCount: undefined,
         panelWatts: undefined,
         totalKWp: undefined,
         batteryCapacityKWh: undefined,
         systemEfficiency: 0.85,
         selectedWeatherSource: 'manual',
         dailyConsumptionKWh: 10,
         avgHourlyConsumptionKWh: 0.4,
         hourlyUsageProfile: Array(HOURS_IN_DAY).fill(0.4),
         evChargeRequiredKWh: 0,
         evChargeByTime: '07:00',
         evMaxChargeRateKWh: 7.5,
         monthlyGenerationFactors: [...defaultMonthlyFactors],
         preferredOvernightBatteryChargePercent: 100,
       });
       setCurrentInputMode('Panels');
       setSelectedAddressValue(undefined);
       setSelectedDirectionInfo(SOUTH_DIRECTION_INFO);
     }
   }, [storedSettings, form, isMounted, addresses]);


   useEffect(() => {
       setAddresses([]);
       setLookupError(null);
   }, [postcode]);


  const onSubmit = (data: UserSettings) => {
    if (data.inputMode === 'Panels' && data.panelCount && data.panelWatts) {
      data.totalKWp = parseFloat(((data.panelCount * data.panelWatts) / 1000).toFixed(2));
    }

    const saveData: UserSettings = { ...data };
    if (saveData.inputMode === 'TotalPower') {
      saveData.panelCount = undefined;
      saveData.panelWatts = undefined;
    }

    const numericFields: (keyof UserSettings)[] = [
        'latitude', 'longitude', 'panelCount', 'panelWatts', 'totalKWp',
        'batteryCapacityKWh', 'systemEfficiency', 'dailyConsumptionKWh',
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
    } else { // Ensure factor is set if direction changed but not through handler
        const direction = propertyDirectionOptions.find(opt => opt.value === data.propertyDirection);
        saveData.propertyDirectionFactor = direction ? direction.factor : SOUTH_DIRECTION_INFO.factor;
    }
    saveData.selectedWeatherSource = data.selectedWeatherSource || 'manual';
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

  const watchedHourlyProfile = form.watch('hourlyUsageProfile') || Array(HOURS_IN_DAY).fill(0);
  const watchedAvgHourlyConsumption = form.watch('avgHourlyConsumptionKWh') || 0.4;
  const sliderMax = Math.max(1, watchedAvgHourlyConsumption * 3, 0.5);

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


            <FormField
                control={form.control}
                name="inputMode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Solar Panel Power Input Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={value => {
                          field.onChange(value);
                          setCurrentInputMode(value as 'Panels' | 'TotalPower');
                        }}
                        value={field.value} 
                        defaultValue={currentInputMode}
                        className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Panels" />
                          </FormControl>
                          <FormLabel className="font-normal">By Panel Details</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="TotalPower" />
                          </FormControl>
                          <FormLabel className="font-normal">By Total System Power</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />

            {currentInputMode === 'Panels' && (
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
            )}

            {currentInputMode === 'TotalPower' && (
              <FormField
                control={form.control}
                name="totalKWp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total System Power (kWp)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 7.20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                    </FormControl>
                     <FormDescription>Kilowatt-peak rating of your entire solar array (e.g., from your installation documents).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batteryCapacityKWh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><BatteryChargingIcon className="h-4 w-4"/>Battery Capacity (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g., 19.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                      </FormControl>
                      <FormDescription>Total usable capacity of your battery system. Leave blank if no battery.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="preferredOvernightBatteryChargePercent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1"><Percent className="h-4 w-4" />Preferred Overnight Battery Target (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" min="0" max="100" placeholder="e.g., 90" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                            </FormControl>
                            <FormDescription>Target charge level for overnight charging (0-100%). Default 100%.</FormDescription>
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
                Adjust the relative generation factor for each month. Default values are estimates.
                Current month: {format(new Date(), "MMMM")}.
              </CardDescription>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-2"> 
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
                            <FormLabel className={index === new Date().getMonth() ? 'text-primary font-semibold' : ''}>
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
                    These factors adjust the baseline solar generation estimate for seasonality.
                    A factor of 1.00 means average generation for that month, 0.50 means 50%, 1.20 means 120%.
                  </FormDescription>
                  <Button type="submit" className="btn-silver w-full sm:w-auto">Save Monthly Factors</Button>
                </form>
              </Form>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
    </div>
    </TooltipProvider>
  );
}

