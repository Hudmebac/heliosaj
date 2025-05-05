
'use client';

import React, { useState, useEffect } from 'react'; // Import useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { TariffPeriod } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react'; // Import Loader2

export default function TariffPage() {
  const [tariffPeriods, setTariffPeriods] = useLocalStorage<TariffPeriod[]>('tariffPeriods', []);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false); // Add isMounted state

  // State for the form to add a new period
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newIsCheap, setNewIsCheap] = useState(false);
  const [newRate, setNewRate] = useState<number | undefined>(undefined);

  // Set mounted state on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

 const isValidTime = (time: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

  const handleAddPeriod = () => {
    if (!newPeriodName || !newStartTime || !newEndTime) {
      toast({
        title: "Missing Information",
        description: "Please provide a name, start time, and end time.",
        variant: "destructive",
      });
      return;
    }

     if (!isValidTime(newStartTime) || !isValidTime(newEndTime)) {
      toast({
        title: "Invalid Time Format",
        description: "Please use HH:MM format for times (e.g., 00:00, 14:30).",
        variant: "destructive",
      });
      return;
    }

    // Basic overlap check (can be more sophisticated)
    // This simple check only looks if the new period *starts* within an existing one
     const overlap = tariffPeriods.some(p => {
       // Convert times to minutes since midnight for comparison
       const pStart = parseInt(p.startTime.split(':')[0]) * 60 + parseInt(p.startTime.split(':')[1]);
       const pEnd = parseInt(p.endTime.split(':')[0]) * 60 + parseInt(p.endTime.split(':')[1]);
       const newStart = parseInt(newStartTime.split(':')[0]) * 60 + parseInt(newStartTime.split(':')[1]);
       // Handle overnight periods simply for now
       const pDuration = pEnd > pStart ? pEnd - pStart : (24*60 - pStart) + pEnd;
       return newStart >= pStart && newStart < (pStart + pDuration); // Very basic check
     });

     if (overlap) {
       toast({
        title: "Potential Overlap",
        description: "The new period might overlap with an existing one. Please review.",
        variant: "destructive", // Use destructive to draw attention
      });
      // Return or allow adding anyway? For now, return.
      return;
     }


    const newPeriod: TariffPeriod = {
      id: Date.now().toString(), // Simple unique ID
      name: newPeriodName,
      startTime: newStartTime,
      endTime: newEndTime,
      isCheap: newIsCheap,
      rate: newRate,
    };

    setTariffPeriods([...tariffPeriods, newPeriod]);

    // Reset form
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


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Energy Tariffs</h1>

      <Card>
        <CardHeader>
          <CardTitle>Manage Tariff Periods</CardTitle>
          <CardDescription>Define your electricity supplier's tariff periods (e.g., peak, off-peak). This helps with smart charging advice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           {!isMounted ? ( // Show loading state before hydration is complete
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
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Add New Tariff Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Static Info Section (Phase 1) */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Tariffs (UK Example)</CardTitle>
           <CardDescription>Energy tariffs can vary. Here are some common types:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p><strong>Standard Variable Tariff (SVT):</strong> Prices fluctuate based on wholesale energy costs, often capped by Ofgem's price cap. No fixed end date.</p>
          <p><strong>Fixed Rate Tariff:</strong> You pay a fixed price per unit (kWh) of energy for a set period (e.g., 12 or 24 months). Protects against price rises but you won't benefit from falls.</p>
          <p><strong>Time-of-Use Tariffs (e.g., Economy 7/10, EV Tariffs):</strong> Offer cheaper electricity during specific off-peak hours (usually overnight). Ideal for those who can shift usage (like charging EVs or batteries) to these times. Requires a smart meter.</p>
           <p><strong>Smart/Tracker Tariffs:</strong> Prices can change very frequently (sometimes half-hourly) based on wholesale market prices. Can offer savings if you actively manage usage but involves risk.</p>
           <p><strong>Export Tariffs (e.g., Smart Export Guarantee - SEG):</strong> If you generate excess solar power, your supplier might pay you for exporting it to the grid. Rates vary significantly between suppliers.</p>
            <p><strong>Note:</strong> Always check specific details with energy suppliers. Adding your periods above helps the app give better advice.</p>
        </CardContent>
      </Card>
    </div>
  );
}
