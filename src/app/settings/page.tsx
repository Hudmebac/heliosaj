
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components

// Mock address lookup function - Replace with actual API call
async function lookupAddressesByPostcode(postcode: string): Promise<Array<{ address: string; lat?: number; lng?: number }>> {
  console.log(`Simulating lookup for postcode: ${postcode}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basic validation and mock responses
  const cleanedPostcode = postcode.toUpperCase().replace(/\s+/g, '');
  if (cleanedPostcode === 'KY40BD') {
    return [
      { address: "1 Random Street, Lochgelly, KY4 0BD", lat: 56.135, lng: -3.327 },
      { address: "3 Random Street, Lochgelly, KY4 0BD", lat: 56.136, lng: -3.328 },
      { address: "5 Random Street, Lochgelly, KY4 0BD", lat: 56.137, lng: -3.329 },
    ];
  } else if (cleanedPostcode === 'SW1A0AA') {
      return [
          { address: "House of Commons, London, SW1A 0AA", lat: 51.500, lng: -0.124 },
          { address: "Westminster Hall, London, SW1A 0AA", lat: 51.501, lng: -0.125 }
      ]
  } else if (cleanedPostcode.startsWith('ERROR')) {
      throw new Error("Simulated API error during lookup.");
  }
  else {
    return []; // No addresses found
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
  const [addresses, setAddresses] = useState<Array<{ address: string; lat?: number; lng?: number }>>([]);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
   const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined);


  const form = useForm<UserSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: storedSettings || {
      location: '',
      propertyDirection: 'South Facing',
      inputMode: 'Panels',
      systemEfficiency: 0.85, // Default efficiency
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
       // If stored settings have a location, pre-fill selectedAddress for the dropdown display
       if (storedSettings.location) {
         setSelectedAddress(storedSettings.location);
         // Check if the stored location is among the current lookup results (if any)
         const existsInLookup = addresses.some(addr => addr.address === storedSettings.location);
         if (!existsInLookup && addresses.length > 0) {
             // If it's not in the current lookup list (e.g., postcode changed), reset the visual selection
             // but keep the form value until a new selection is made.
              // Consider if you want to automatically add the stored location to the list if postcode matches? Might be complex.
              // For now, just handle the visual state of the Select.
              // This might need refinement based on desired UX.
              // If postcode changes, clearing addresses makes more sense.
         }

       } else {
          setSelectedAddress(undefined);
       }
    } else {
       setSelectedAddress(undefined);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings, form.reset]); // Keep addresses dependency? Maybe not needed here


    // Clear address list and selection when postcode changes
   useEffect(() => {
       setAddresses([]);
       setSelectedAddress(undefined);
       setLookupError(null); // Also clear errors
   }, [postcode]);


  const onSubmit = (data: UserSettings) => {
    // Calculate the missing power value based on the input mode
    if (data.inputMode === 'Panels' && data.panelCount && data.panelWatts) {
      data.totalKWp = parseFloat(((data.panelCount * data.panelWatts) / 1000).toFixed(2));
    } else if (data.inputMode === 'TotalPower' && data.totalKWp && data.panelCount && data.panelWatts) {
       // Clear panel details if total power is the source of truth for this save
      // data.panelCount = undefined;
      // data.panelWatts = undefined;
      // OR Calculate approximate panel watts if count is known? Decided against complexity for now.
    }

    // Clear irrelevant fields based on input mode before saving
     if (data.inputMode === 'Panels') {
      // data.totalKWp = undefined; // Keep calculated value? Or clear? Keep for now.
    } else if (data.inputMode === 'TotalPower') {
      data.panelCount = undefined;
      data.panelWatts = undefined;
    }


    setStoredSettings(data);
    toast({
      title: "Settings Saved",
      description: "Your solar system configuration has been updated.",
    });
    console.log("Saved settings:", data);
  };

  const handlePostcodeLookup = async () => {
    if (!postcode) {
      setLookupError("Please enter a postcode.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setAddresses([]); // Clear previous results
     setSelectedAddress(undefined); // Clear visual selection
     // Clear form fields related to address before lookup? Optional, maybe better to wait for selection.
    // form.setValue('location', '');
    // form.setValue('latitude', undefined);
    // form.setValue('longitude', undefined);


    try {
      const results = await lookupAddressesByPostcode(postcode);
      if (results.length === 0) {
           setLookupError("No addresses found for this postcode.");
      } else {
          setAddresses(results);
      }

    } catch (error) {
        console.error("Postcode lookup failed:", error);
        setLookupError(error instanceof Error ? error.message : "Address lookup failed. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddressSelect = (selectedValue: string) => {
      // The selectedValue is the 'address' string from the results
      const selectedData = addresses.find(addr => addr.address === selectedValue);
       setSelectedAddress(selectedValue); // Update visual selection state

      if (selectedData) {
        form.setValue('location', selectedData.address, { shouldValidate: true });
        // Only set lat/lng if the lookup provided them
        if (selectedData.lat !== undefined) {
          form.setValue('latitude', selectedData.lat, { shouldValidate: true });
        }
        if (selectedData.lng !== undefined) {
          form.setValue('longitude', selectedData.lng, { shouldValidate: true });
        }
        // Clear postcode-specific errors after successful selection
         setLookupError(null);
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
                       placeholder="e.g., KY4 0BD"
                       value={postcode}
                       onChange={(e) => setPostcode(e.target.value)}
                       className="max-w-xs"
                     />
                   </div>
                   <Button
                     type="button"
                     onClick={handlePostcodeLookup}
                     disabled={lookupLoading || !postcode}
                     variant="secondary"
                     className="w-full sm:w-auto"
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
                     <AlertDescription>{lookupError}</AlertDescription>
                   </Alert>
                 )}

               {addresses.length > 0 && !lookupLoading && (
                    <div className="space-y-1 mt-2">
                       <Label htmlFor="addressSelect">Select Address</Label>
                      <Select
                         value={selectedAddress} // Controlled by state
                         onValueChange={handleAddressSelect}
                       >
                         <SelectTrigger id="addressSelect">
                           <SelectValue placeholder="Choose from found addresses..." />
                         </SelectTrigger>
                         <SelectContent>
                           {addresses.map((addr, index) => (
                             <SelectItem key={index} value={addr.address}>
                               {addr.address}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
               )}
             </div>


             {/* Location (now potentially filled by lookup) */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selected Location / Manual Entry</FormLabel>
                  <FormControl>
                     {/* Make this read-only if filled by lookup? Or allow manual override? */}
                     {/* For now, allow editing but it will be overwritten by new selection */}
                    <Input placeholder="Select address above or enter manually" {...field} />
                  </FormControl>
                  <FormDescription>Your selected address or a manual location entry.</FormDescription>
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
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Filled by lookup or enter manually" {...field} value={field.value ?? ''} />
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
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="Filled by lookup or enter manually" {...field} value={field.value ?? ''} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
              <FormDescription>Coordinates are used for precise weather data.</FormDescription>


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
                  <FormDescription>Approximate direction your panels face.</FormDescription>
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
                        <Input type="number" placeholder="e.g., 18" {...field} value={field.value ?? ''} />
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
                        <Input type="number" placeholder="e.g., 405" {...field} value={field.value ?? ''}/>
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
                      <Input type="number" step="0.1" placeholder="e.g., 7.2" {...field} value={field.value ?? ''} />
                    </FormControl>
                     <FormDescription>Kilowatt-peak rating of your entire system.</FormDescription>
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
                  <FormLabel>Battery Storage Capacity (kWh)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="e.g., 19 (Optional)" {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormDescription>Total usable capacity of your battery system.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* System Efficiency */}
            <FormField
              control={form.control}
              name="systemEfficiency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Efficiency (Optional)</FormLabel>
                  <FormControl>
                     <Input type="number" step="0.01" min="0" max="1" placeholder="e.g., 0.85 for 85%" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription>Overall efficiency including inverter, wiring etc. (0.0 to 1.0). Default is 0.85.</FormDescription>
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
