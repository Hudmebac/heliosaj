
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ManualForecastInput, ManualDayForecast } from '@/types/settings';
import { useToast } from '@/hooks/use-toast';
import { ForecastInfo, sunriseSunsetData, getApproximateSunriseSunset } from '@/components/forecast-info';
import { addDays, format, parseISO } from 'date-fns';

interface ManualForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentForecast: ManualForecastInput;
  onSave: (updatedForecast: ManualForecastInput) => void;
}

export function ManualForecastModal({ isOpen, onClose, currentForecast, onSave }: ManualForecastModalProps) {
  const [editableForecast, setEditableForecast] = useState<ManualForecastInput>(currentForecast);
  const [selectedCityForTimesModal, setSelectedCityForTimesModal] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    // Ensure dates are current when modal opens or currentForecast changes
    // And sync editableForecast with currentForecast prop when it changes or modal opens
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowDateStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    setEditableForecast(prev => ({
        today: {
            ...currentForecast.today, // Base on incoming prop
            date: todayDateStr, // Always ensure date is current
            // If prop's date is today, use its values, else use defaults from prop but with today's date
            sunrise: currentForecast.today.date === todayDateStr ? currentForecast.today.sunrise : prev.today.sunrise,
            sunset: currentForecast.today.date === todayDateStr ? currentForecast.today.sunset : prev.today.sunset,
            condition: currentForecast.today.date === todayDateStr ? currentForecast.today.condition : prev.today.condition,
        },
        tomorrow: {
            ...currentForecast.tomorrow, // Base on incoming prop
            date: tomorrowDateStr, // Always ensure date is current
            sunrise: currentForecast.tomorrow.date === tomorrowDateStr ? currentForecast.tomorrow.sunrise : prev.tomorrow.sunrise,
            sunset: currentForecast.tomorrow.date === tomorrowDateStr ? currentForecast.tomorrow.sunset : prev.tomorrow.sunset,
            condition: currentForecast.tomorrow.date === tomorrowDateStr ? currentForecast.tomorrow.condition : prev.tomorrow.condition,
        }
    }));
  }, [isOpen, currentForecast]);


  const handleSave = () => {
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
    if (editableForecast.today.sunrise >= editableForecast.today.sunset) {
      toast({ title: "Invalid Times for Today", description: "Sunrise time must be before sunset time.", variant: "destructive" });
      return;
    }
    if (editableForecast.tomorrow.sunrise >= editableForecast.tomorrow.sunset) {
      toast({ title: "Invalid Times for Tomorrow", description: "Sunrise time must be before sunset time.", variant: "destructive" });
      return;
    }
    onSave(editableForecast);
    toast({ title: "Forecast Updated", description: "Manual weather forecast has been saved." });
    onClose();
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Manual Weather Forecast</DialogTitle>
          <DialogDescription>
            Input sunrise, sunset, and weather conditions for today and tomorrow.
            Or, select a city to pre-fill approximate sunrise/sunset times.
            Refer to sites like <a href="https://weather.com/en-GB/weather/today" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">weather.com</a> for current conditions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="city-time-select-modal-comp">Apply Approx. Times from City</Label>
            <Select value={selectedCityForTimesModal} onValueChange={handleCityTimeSelectModal}>
              <SelectTrigger id="city-time-select-modal-comp">
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
                <div className="text-center mb-2">
                  <h3 className="font-bold text-lg capitalize">{dayKey === 'today' ? 'Today' : 'Tomorrow'}</h3>
                  <p className="text-muted-foreground">
                    {format(parseISO(editableForecast[dayKey].date), 'EEEE')}
                  </p>
                  <p className="text-muted-foreground">{format(parseISO(editableForecast[dayKey].date), 'dd/MM/yyyy')}</p>
                </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`${dayKey}-sunrise-modal`}>Sunrise (HH:MM)</Label>
                  <Input
                    id={`${dayKey}-sunrise-modal`}
                    type="time"
                    value={editableForecast[dayKey].sunrise}
                    onChange={(e) => setEditableForecast(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], sunrise: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${dayKey}-sunset-modal`}>Sunset (HH:MM)</Label>
                  <Input
                    id={`${dayKey}-sunset-modal`}
                    type="time"
                    value={editableForecast[dayKey].sunset}
                    onChange={(e) => setEditableForecast(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], sunset: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${dayKey}-condition-modal`}>Weather Condition</Label>
                <Select
                  value={editableForecast[dayKey].condition}
                  onValueChange={(value) => setEditableForecast(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], condition: value as ManualDayForecast['condition'] } }))}
                >
                  <SelectTrigger id={`${dayKey}-condition-modal`}>
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Forecast</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
