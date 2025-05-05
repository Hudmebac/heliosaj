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
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedSettings, form.reset]);


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


  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure your solar panel system and location details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., City, Country or Postcode" {...field} />
                  </FormControl>
                  <FormDescription>Used to fetch weather data. Be specific for accuracy.</FormDescription>
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
                      <FormLabel>Latitude (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="e.g., 51.5074" {...field} value={field.value ?? ''} />
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
                      <FormLabel>Longitude (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="e.g., -0.1278" {...field} value={field.value ?? ''} />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
             </div>
              <FormDescription>Provide coordinates for precise location if known.</FormDescription>


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
