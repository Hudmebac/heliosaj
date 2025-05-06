
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
import { Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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


const settingsSchema = z.object({
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  latitude: z.coerce.number().optional(), // Made optional as it can be derived
  longitude: z.coerce.number().optional(), // Made optional as it can be derived
  propertyDirection: z.enum(['North Facing', 'South Facing', 'East Facing', 'West Facing', 'Flat Roof']),
  inputMode: z.enum(['Panels', 'TotalPower']),
  panelCount: z.coerce.number().int().positive().optional(),
  panelWatts: z.coerce.number().int().positive().optional(),
  totalKWp: z.coerce.number().positive().optional(),
  batteryCapacityKWh: z.coerce.number().nonnegative().optional(),
  systemEfficiency: z.coerce.number().min(0).max(1).optional(), // 0.0 to 1.0
  dailyConsumptionKWh: z.coerce.number().positive().optional(),
  avgHourlyConsumptionKWh: z.coerce.number().positive().optional(),
  selectedWeatherSource: z.string().optional(), // Added for weather source selection
  // EV fields already in UserSettings, ensure they are included here if form manages them
  evChargeRequiredKWh: z.coerce.number().nonnegative().optional(),
  evChargeByTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:MM)" }).optional().or(z.literal('')),
  evMaxChargeRateKWh: z.coerce.number().positive().optional(),
}).refine(data => {
    if (data.inputMode === 'Panels') {
      return data.panelCount !== undefined && data.panelWatts !== undefined;
    }
    return true;
  }, {
    message: "Panel Count and Watts per Panel are required when 'By Panel' is selected.",
    path: ["panelCount"], // Or apply to a general form error
  }).refine(data => {
    if (data.inputMode === 'TotalPower') {
      return data.totalKWp !== undefined;
    }
    return true;
  }, {
    message: "Total System Power (kWp) is required when 'By Total Power' is selected.",
    path: ["totalKWp"], // Or apply to a general form error
});


export default function SettingsPage() {
  const [storedSettings, setStoredSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const { toast } = useToast();
  const [currentInputMode, setCurrentInputMode] = useState<'Panels' | 'TotalPower'>(storedSettings?.inputMode || 'Panels');
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<AddressLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedAddressValue, setSelectedAddressValue] = useState<string | undefined>(undefined);


  const form = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: storedSettings || {
      location: '',
      // latitude and longitude will be set by lookup or manually
      propertyDirection: 'South Facing',
      inputMode: 'Panels',
      systemEfficiency: 0.85, // Default efficiency
      selectedWeatherSource: 'open-meteo', // Default to Open-Meteo
      // Default EV settings (can be adjusted by user)
      evChargeRequiredKWh: 0,
      evChargeByTime: '07:00',
      evMaxChargeRateKWh: 7.5,
    },
    mode: 'onChange', // Validate on change for better UX
  });

   // Watch for changes in inputMode to conditionally render fields
   const watchedInputMode = form.watch('inputMode');
   useEffect(() => {
     if(watchedInputMode) {
      setCurrentInputMode(watchedInputMode);
     }
   }, [watchedInputMode]);

  // Effect to reset form when storedSettings change (e.g., on initial load)
  useEffect(() => {
    if (storedSettings) {
      form.reset(storedSettings);
      if(storedSettings.inputMode) {
        setCurrentInputMode(storedSettings.inputMode);
      }
       // If location exists, pre-select it in the dropdown if it came from a previous lookup
       // This is tricky because addresses list is ephemeral. Better to just set the text field.
       if (storedSettings.location) {
         setSelectedAddressValue(storedSettings.location); // This might not match if list isn't populated
       } else {
          setSelectedAddressValue(undefined);
       }
    } else {
       // Reset to initial defaults if no settings are stored
       form.reset({
         location: '',
         latitude: undefined,
         longitude: undefined,
         propertyDirection: 'South Facing',
         inputMode: 'Panels',
         panelCount: undefined,
         panelWatts: undefined,
         totalKWp: undefined,
         batteryCapacityKWh: undefined,
         systemEfficiency: 0.85,
         selectedWeatherSource: 'open-meteo',
         dailyConsumptionKWh: undefined,
         avgHourlyConsumptionKWh: undefined,
         evChargeRequiredKWh: 0,
         evChargeByTime: '07:00',
         evMaxChargeRateKWh: 7.5,
       });
       setSelectedAddressValue(undefined);
    }
  }, [storedSettings, form]); // form.reset was removed as per react-hook-form docs, form itself is stable


   // Clear address list and selection when postcode changes
   useEffect(() => {
       setAddresses([]);
       setSelectedAddressValue(undefined); // Clear selection display
       setLookupError(null); // Clear previous errors
       // Optionally, clear location/lat/lng fields in form if postcode changes and no selection made yet
       // form.setValue('location', '');
       // form.setValue('latitude', undefined);
       // form.setValue('longitude', undefined);
   }, [postcode]);


  const onSubmit = (data: UserSettings) => {
    // Calculate totalKWp if inputMode is 'Panels'
    if (data.inputMode === 'Panels' && data.panelCount && data.panelWatts) {
      data.totalKWp = parseFloat(((data.panelCount * data.panelWatts) / 1000).toFixed(2));
    }

    // Create a clean object to save, ensuring numeric types and handling undefined for optional fields
    const saveData: UserSettings = { ...data };

    // If mode is TotalPower, clear panel specific fields if they exist
    if (saveData.inputMode === 'TotalPower') {
      saveData.panelCount = undefined;
      saveData.panelWatts = undefined;
    }

    // Ensure numeric fields are numbers or undefined, not empty strings or NaN
    const numericFields: (keyof UserSettings)[] = [
        'latitude', 'longitude', 'panelCount', 'panelWatts', 'totalKWp',
        'batteryCapacityKWh', 'systemEfficiency', 'dailyConsumptionKWh',
        'avgHourlyConsumptionKWh', 'evChargeRequiredKWh', 'evMaxChargeRateKWh'
    ];
    numericFields.forEach(field => {
       if (saveData[field] === '' || saveData[field] === null || isNaN(Number(saveData[field]))) {
            (saveData as any)[field] = undefined;
        } else {
            (saveData as any)[field] = Number(saveData[field]);
        }
    });
    // Ensure evChargeByTime is valid or undefined
    if (!saveData.evChargeByTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(saveData.evChargeByTime)) {
        saveData.evChargeByTime = undefined;
    }


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
    setAddresses([]); // Clear previous results
    setSelectedAddressValue(undefined); // Clear selection
    form.setValue('location', ''); // Clear form fields
    form.setValue('latitude', undefined);
    form.setValue('longitude', undefined);

    try {
      const results = await lookupAddressesByPostcode(postcode.trim());
      if (results.length === 0) {
           setLookupError("No addresses found for this postcode via Nominatim. Try a nearby or broader postcode, or enter details manually.");
      } else {
          setAddresses(results);
          // Do not auto-select here, let user pick or confirm
      }
    } catch (error) {
        // error.message should be user-friendly from lookupAddressesByPostcode
        setLookupError(error instanceof Error ? error.message : "Address lookup failed. Please check the postcode or try again later.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddressSelect = (selectedValue: string) => {
      // selectedValue is the 'display_name' which is unique enough for selection key
      const selectedData = addresses.find(addr => addr.address === selectedValue);
      setSelectedAddressValue(selectedValue); // For the Select component's controlled value

      if (selectedData) {
        form.setValue('location', selectedData.address, { shouldValidate: true });
        form.setValue('latitude', selectedData.lat, { shouldValidate: true });
        form.setValue('longitude', selectedData.lng, { shouldValidate: true });
        setLookupError(null); // Clear error if selection is successful
      }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure your solar panel system and location details. This information is used for forecast calculations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

             {/* Postcode Lookup Section */}
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
                     variant="secondary" // Or your preferred variant
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
                         value={selectedAddressValue} // Controlled by state
                         onValueChange={handleAddressSelect} // Function to update form fields
                         aria-label="Select an address from the lookup results"
                       >
                         <SelectTrigger id="addressSelect">
                           <SelectValue placeholder="Choose from found addresses..." />
                         </SelectTrigger>
                         <SelectContent>
                           {addresses.map((addr) => (
                             <SelectItem key={addr.place_id} value={addr.address}>
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
                  <FormLabel>Property/Panel Direction</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select facing direction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="South Facing">South Facing</SelectItem>
                      <SelectItem value="North Facing">North Facing</SelectItem>
                      <SelectItem value="East Facing">East Facing</SelectItem>
                      <SelectItem value="West Facing">West Facing</SelectItem>
                      <SelectItem value="Flat Roof">Flat Roof</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Approximate direction your main solar panels face.</FormDescription>
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
                          setCurrentInputMode(value as 'Panels' | 'TotalPower'); // Update state for conditional rendering
                        }}
                        defaultValue={field.value}
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
                      <Input type="number" step="0.1" placeholder="e.g., 7.2" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                    </FormControl>
                     <FormDescription>Kilowatt-peak rating of your entire solar array (e.g., from your installation documents).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="batteryCapacityKWh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery Storage Capacity (kWh, Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 19" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                  </FormControl>
                  <FormDescription>Total usable capacity of your battery system. Leave blank if no battery.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consumption Estimates Section (Optional but recommended for Advisory) */}
            <div className="space-y-2 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-medium mb-2">Consumption Estimates (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <FormField
                      control={form.control}
                      name="dailyConsumptionKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avg. Daily Consumption (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 10.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                          </FormControl>
                           <FormDescription>Your typical daily household energy usage.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   <FormField
                      control={form.control}
                      name="avgHourlyConsumptionKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avg. Hourly Consumption (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 0.4" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                          </FormControl>
                          <FormDescription>Average energy used per hour (can be estimated from daily).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Providing these helps refine charging advice on the Advisory page. They are not directly used for solar generation forecast.</p>
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

            <Button type="submit" className="btn-silver w-full sm:w-auto">Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

