
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

// Interface for Nominatim API response structure
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
    [key: string]: string | undefined; // Allow for other address parts
  };
  boundingbox: string[];
}

// Define the structure for address lookup results
interface AddressLookupResult {
  place_id: number; // Added place_id for unique key
  address: string;
  lat?: number;
  lng?: number;
}


// Nominatim address lookup function
async function lookupAddressesByPostcode(postcode: string): Promise<AddressLookupResult[]> {
  console.log(`Looking up postcode: ${postcode}`);
  const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  // Limit to GB for better results, request address details
  const params = new URLSearchParams({
    q: postcode,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'gb', // Focus search on Great Britain
    limit: '10', // Limit results
  });

  try {
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        // Optional: Add a custom User-Agent if needed for identification
        // 'User-Agent': 'HelioHeggieApp/1.0 (your-contact-email@example.com)'
      }
    });

    if (!response.ok) {
      // Handle HTTP errors
      console.error(`Nominatim API Error ${response.status}: ${response.statusText}`);
      let errorMsg = `Address lookup failed with status ${response.status}.`;
      try {
        const errorData = await response.json();
        errorMsg += ` Details: ${errorData?.error?.message || response.statusText}`;
      } catch (e) {
        // Ignore if error response is not JSON
      }
      throw new Error(errorMsg);
    }

    const data: NominatimResult[] = await response.json();

    if (!Array.isArray(data)) {
        console.error("Nominatim response was not an array:", data);
        throw new Error("Received invalid data format from address lookup service.");
    }

    // Filter results that seem to be primarily postcode-based (sometimes Nominatim returns wider areas)
    const postcodeResults = data.filter(result => result.address?.postcode && result.address.postcode.replace(/\s+/g, '') === postcode.replace(/\s+/g, ''));

    if (postcodeResults.length === 0 && data.length > 0) {
        console.warn("No exact postcode match, returning broader results.");
        // Fallback to general results if no specific postcode match
        return data.map(item => ({
            place_id: item.place_id, // Include place_id
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon), // Nominatim uses 'lon'
        }));
    }


    // Map the response to the expected format
    return postcodeResults.map(item => ({
      place_id: item.place_id, // Include place_id
      address: item.display_name, // Use the full display name
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon), // Nominatim uses 'lon'
    }));

  } catch (error) {
    console.error("Error fetching from Nominatim:", error);
    // Re-throw specific error messages
    if (error instanceof Error) {
       throw new Error(`Address lookup failed: ${error.message}`);
    } else {
       throw new Error("An unknown error occurred during address lookup.");
    }
  }
}


// Enhanced Zod schema for validation
const settingsSchema = z.object({
  location: z.string().min(3, { message: "Location must be at least 3 characters." }),
  latitude: z.coerce.number().optional(), // Use coerce for string-to-number conversion
  longitude: z.coerce.number().optional(),
  propertyDirection: z.enum(['North Facing', 'South Facing', 'East Facing', 'West Facing', 'Flat Roof']),
  inputMode: z.enum(['Panels', 'TotalPower']),
  panelCount: z.coerce.number().int().positive().optional(), // Optional and must be positive integer
  panelWatts: z.coerce.number().int().positive().optional(), // Optional and must be positive integer
  totalKWp: z.coerce.number().positive().optional(), // Optional and must be positive float/number
  batteryCapacityKWh: z.coerce.number().nonnegative().optional(), // Optional and non-negative
  systemEfficiency: z.coerce.number().min(0).max(1).optional(), // Optional, between 0 and 1
  selectedWeatherSource: z.string().optional(), // Added weather source
  dailyConsumptionKWh: z.coerce.number().positive().optional(), // Optional daily usage
  avgHourlyConsumptionKWh: z.coerce.number().positive().optional(), // Optional hourly usage
  // EV Charging Preferences (added here for completeness, might be set elsewhere)
  evChargeRequiredKWh: z.coerce.number().nonnegative().optional(),
  evChargeByTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:MM)" }).optional(),
  evMaxChargeRateKWh: z.coerce.number().positive().optional(),
}).refine(data => {
    // If inputMode is 'Panels', panelCount and panelWatts are required
    if (data.inputMode === 'Panels') {
      return data.panelCount !== undefined && data.panelWatts !== undefined;
    }
    return true;
  }, {
    message: "Panel Count and Watts per Panel are required when 'By Panel' is selected.",
    path: ["panelCount"], // You can associate the error with a specific field or make it general
  }).refine(data => {
    // If inputMode is 'TotalPower', totalKWp is required
    if (data.inputMode === 'TotalPower') {
      return data.totalKWp !== undefined;
    }
    return true;
  }, {
    message: "Total System Power (kWp) is required when 'By Total Power' is selected.",
    path: ["totalKWp"],
});


export default function SettingsPage() {
  const [storedSettings, setStoredSettings] = useLocalStorage<UserSettings | null>('userSettings', null);
  const { toast } = useToast();
  // Keep track of the current input mode to conditionally render fields
  const [currentInputMode, setCurrentInputMode] = useState<'Panels' | 'TotalPower'>(storedSettings?.inputMode || 'Panels');

  // State for postcode lookup
  const [postcode, setPostcode] = useState<string>('');
  const [addresses, setAddresses] = useState<AddressLookupResult[]>([]); // Use the new type
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedAddressValue, setSelectedAddressValue] = useState<string | undefined>(undefined); // Stores the selected display_name


  const form = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: storedSettings || {
      location: '',
      propertyDirection: 'South Facing',
      inputMode: 'Panels',
      systemEfficiency: 0.85, // Default efficiency
      selectedWeatherSource: 'open-meteo', // Default weather source
      // Default EV settings if not present
      evChargeRequiredKWh: 0,
      evChargeByTime: '07:00',
      evMaxChargeRateKWh: 7.5,
    },
    mode: 'onChange', // Validate on change for better UX
  });

   // Update local state when form's inputMode changes
   const watchedInputMode = form.watch('inputMode');
   useEffect(() => {
     setCurrentInputMode(watchedInputMode);
   }, [watchedInputMode]);


  // Reset form values if storedSettings changes (e.g., loaded from localStorage after initial render)
  useEffect(() => {
    if (storedSettings) {
      form.reset(storedSettings);
      setCurrentInputMode(storedSettings.inputMode);
       // If stored settings have a location, pre-fill selectedAddressValue for the dropdown display
       if (storedSettings.location) {
         setSelectedAddressValue(storedSettings.location);
         // Check if the stored location is among the current lookup results (if any)
         const existsInLookup = addresses.some(addr => addr.address === storedSettings.location);
         if (!existsInLookup && addresses.length > 0) {
             // If it's not in the current lookup list (e.g., postcode changed), reset the visual selection
             // but keep the form value until a new selection is made.
             // If postcode changes, clearing addresses makes more sense (handled below).
         }

       } else {
          setSelectedAddressValue(undefined);
       }
    } else {
       // Ensure all fields are reset to defaults if no stored settings
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
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings, form.reset]); // Addresses not needed here, postcode effect handles clearing


    // Clear address list and selection when postcode changes
   useEffect(() => {
       setAddresses([]);
       setSelectedAddressValue(undefined);
       setLookupError(null); // Also clear errors
   }, [postcode]);


  const onSubmit = (data: UserSettings) => {
    // Calculate the missing power value based on the input mode
    if (data.inputMode === 'Panels' && data.panelCount && data.panelWatts) {
      data.totalKWp = parseFloat(((data.panelCount * data.panelWatts) / 1000).toFixed(2));
    }
    // No else if needed to clear panelCount/panelWatts for TotalPower mode,
    // as the form structure conditionally renders them, so they shouldn't be submitted anyway.
    // We should ensure they are cleared *before* saving though.

    // Prepare data for saving: ensure only relevant power fields are saved
    const saveData: UserSettings = { ...data }; // Clone data

    if (saveData.inputMode === 'Panels') {
       // Keep calculated totalKWp? Yes, might be useful.
      // saveData.totalKWp = undefined; // Optional: clear if strictly only storing input method fields
    } else if (saveData.inputMode === 'TotalPower') {
      saveData.panelCount = undefined; // Explicitly clear panel details
      saveData.panelWatts = undefined;
    }

    // Ensure optional number fields are numbers or undefined, not empty strings
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
    // Ensure EV time is saved correctly or undefined
    if (!saveData.evChargeByTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(saveData.evChargeByTime)) {
        saveData.evChargeByTime = undefined;
    }


    setStoredSettings(saveData);
    toast({
      title: "Settings Saved",
      description: "Your solar system configuration has been updated.",
    });
    console.log("Saved settings:", saveData);
  };

  const handlePostcodeLookup = async () => {
    if (!postcode) {
      setLookupError("Please enter a postcode.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setAddresses([]); // Clear previous results
     setSelectedAddressValue(undefined); // Clear visual selection
     // Clear form fields related to address before lookup
    form.setValue('location', '');
    form.setValue('latitude', undefined);
    form.setValue('longitude', undefined);


    try {
      const results = await lookupAddressesByPostcode(postcode.trim()); // Use the new Nominatim function
      if (results.length === 0) {
           setLookupError("No addresses found for this postcode via Nominatim.");
      } else {
          setAddresses(results);
      }

    } catch (error) {
        console.error("Postcode lookup failed:", error);
        setLookupError(error instanceof Error ? error.message : "Address lookup failed. Please check the postcode or try again later.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle selection from the address dropdown
  const handleAddressSelect = (selectedValue: string) => {
      // The selectedValue is the 'address' string (display_name)
      const selectedData = addresses.find(addr => addr.address === selectedValue);
      setSelectedAddressValue(selectedValue); // Update visual selection state

      if (selectedData) {
        form.setValue('location', selectedData.address, { shouldValidate: true });
        form.setValue('latitude', selectedData.lat, { shouldValidate: true });
        form.setValue('longitude', selectedData.lng, { shouldValidate: true });
        setLookupError(null); // Clear postcode-specific errors
      }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure your solar panel system and location details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Postcode Lookup Section */}
             <div className="space-y-2 p-4 border rounded-md bg-muted/50">
               <h3 className="text-lg font-medium mb-2">Location Lookup</h3>
                 <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                   <div className="flex-grow space-y-1 w-full sm:w-auto">
                     <Label htmlFor="postcode">Enter Postcode</Label>
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
                         value={selectedAddressValue} // Controlled by state
                         onValueChange={handleAddressSelect}
                         aria-label="Select an address from the lookup results"
                       >
                         <SelectTrigger id="addressSelect">
                           <SelectValue placeholder="Choose from found addresses..." />
                         </SelectTrigger>
                         <SelectContent>
                           {/* Use place_id as the key */}
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


             {/* Location (now potentially filled by lookup) */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selected Location / Manual Entry</FormLabel>
                  <FormControl>
                     {/* Allow editing */}
                    <Input placeholder="Select address above or enter location manually" {...field} />
                  </FormControl>
                  <FormDescription>Your selected address or a manual location entry (used for display).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Optional Lat/Lon */}
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
              <FormDescription>Coordinates are used for precise weather data. Ensure they are accurate if entered manually.</FormDescription>


            {/* Property Direction */}
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
                  <FormDescription>Approximate direction your panels face (most crucial for solar estimation).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Input Mode */}
            <FormField
                control={form.control}
                name="inputMode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Power Input Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setCurrentInputMode(value as 'Panels' | 'TotalPower');
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


             {/* Conditional Fields based on inputMode */}
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
                     <FormDescription>Kilowatt-peak rating of your entire system (e.g., from your installation documents).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            {/* Battery Capacity */}
            <FormField
              control={form.control}
              name="batteryCapacityKWh"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery Storage Capacity (kWh, Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 19" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)}/>
                  </FormControl>
                  <FormDescription>Total usable capacity of your battery system, if you have one.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Consumption Settings */}
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
                <p className="text-xs text-muted-foreground mt-2">Providing these helps refine charging advice.</p>
            </div>


             {/* System Efficiency */}
            <FormField
              control={form.control}
              name="systemEfficiency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Efficiency Factor (Optional)</FormLabel>
                  <FormControl>
                     <Input type="number" step="0.01" min="0.1" max="1" placeholder="e.g., 0.85 for 85%" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                  </FormControl>
                  <FormDescription>Overall efficiency including inverter, wiring etc. (0.1 to 1.0). Affects generation estimates. Default is 0.85 if left blank.</FormDescription>
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
