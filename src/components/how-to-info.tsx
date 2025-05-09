
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

interface HowToInfoProps {
  pageKey: 'dashboard' | 'settings' | 'advisory' | 'tariffs'; // Keep 'tariffs' if a specific section help is needed
}

const pageInfo: Record<HowToInfoProps['pageKey'], { title: string; description: React.ReactNode }> = {
  dashboard: {
    title: "How to Interpret the Dashboard",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>The Dashboard provides an at-a-glance overview of your solar energy generation based on your forecast inputs and selected source.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Location Display:</strong> Shows the location your forecast is based on (from Settings).</li>
          <li><strong>Weather Source Dropdown (Header):</strong> Select "Open-Meteo" for API-driven forecasts or "Manual Input" to enter your own.</li>
          <li><strong>Refresh/Edit Forecast Button:</strong> Depending on the source, this button allows you to refresh API data or open the manual forecast editor.</li>
          <li><strong>Today/Tomorrow Forecast Cards:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
                <li>Shows the total estimated solar generation (kWh) for the day.</li>
                <li>Displays the weather condition (e.g., Sunny, Cloudy).</li>
                <li>Indicates the sunrise and sunset times.</li>
                <li>For API source, max temperature is also shown.</li>
                <li>The chart visualizes estimated generation (kWh) per hour. Hover over bars for specific values.</li>
            </ul>
          </li>
          <li><strong>Week Ahead (API Source Only):</strong> Shows a condensed forecast for the next 7 days if using Open-Meteo.</li>
          <li><strong>Alerts:</strong> If settings are incomplete or location is needed for API, alerts will guide you.</li>
        </ul>
        <p><strong>Tip:</strong> Ensure your system settings are accurate. For "Manual Input", keep forecast details up-to-date for meaningful data.</p>
      </div>
    ),
  },
  settings: {
    title: "How to Manage System Configuration",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This page allows you to configure all aspects of your solar energy system and energy tariffs for accurate calculations and advice.</p>
        <h3 className="font-semibold text-foreground pt-2">General Settings:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Location Lookup & Manual Entry:</strong> Use postcode lookup (UK) or enter location/coordinates manually. Accurate coordinates are vital.</li>
          <li><strong>Property/Panel Direction:</strong> Select your panels' orientation. Factors adjust generation estimates.</li>
          <li><strong>Solar Panel System Details:</strong> Input panel count and wattage to estimate total kWp, then apply it, or enter your official Total System Power (kWp) directly. This is key for forecasts.</li>
          <li><strong>Battery Details:</strong> Enter capacity (kWh), max charge rate (kW), and preferred overnight charge percentage.</li>
          <li><strong>Consumption Estimates:</strong> Input daily/average hourly use, or fine-tune the hourly profile. Used for advisory.</li>
          <li><strong>System Efficiency Factor:</strong> Overall system efficiency (0.1-1.0, default 0.85).</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Manage Time of Year Efficiency (Manual Source Only):</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>Adjust monthly generation factors if using "Manual Input" weather source. API sources handle seasonality.</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Manage Tariff Periods:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>Define your electricity tariff periods (name, start/end times, rate, cheap status). Crucial for charging advice.</li>
          <li>See the "How To" guide within the Tariff Management card for more specific help on tariffs.</li>
        </ul>
        <p><strong>Remember to click "Save General Settings" or relevant save buttons after making changes.</strong></p>
      </div>
    ),
  },
  advisory: {
    title: "How to Use the Smart Charging Advisory",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>The Advisory page helps you optimize battery and EV charging based on your forecast, defined tariffs, and energy consumption patterns.</p>
        <h3 className="font-semibold text-foreground pt-2">Key Sections & Inputs:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Refresh/Edit Forecast Button:</strong> Updates API data or opens manual forecast editor, critical for advice accuracy.</li>
          <li><strong>Recommendations (Today & Overnight):</strong> These cards provide advice on grid charging for your battery/EV, considering solar, battery level, EV needs, and tariffs.</li>
          <li><strong>Your Energy Inputs:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Current Battery Level (kWh):</strong> Input your battery's current charge.</li>
              <li><strong>Preferred Overnight Battery Target:</strong> Set your desired battery charge percentage by morning.</li>
              <li><strong>Consumption (Daily/Hourly):</strong> Define your household energy use. Fine-tune with hourly sliders.</li>
            </ul>
          </li>
          <li><strong>EV Charging Preferences:</strong> Specify charge needed (kWh), charge-by time, and max charge rate.</li>
          <li><strong>Forecast & Configuration Used:</strong> Summarizes data used for current advice.</li>
        </ul>
        <p><strong>Tip:</strong> Regularly update your forecast (if manual), current battery level, and consumption for accurate advice. Ensure tariff periods are correct in Settings.</p>
      </div>
    ),
  },
  tariffs: { // This key can still be used for a HowToInfo trigger placed specifically within the Tariff Card in settings.
    title: "How to Manage Energy Tariffs",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This section within Settings allows you to define different electricity tariff periods from your supplier. This information is crucial for the Smart Charging Advisory to determine the most cost-effective times to charge your battery or EV from the grid.</p>
        <h3 className="font-semibold text-foreground pt-2">Managing Tariff Periods:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Existing Periods:</strong> Any tariff periods you've already added are listed here, showing their name, time range, rate (if entered), and whether they are marked as a "Cheap Rate".</li>
          <li><strong>Remove a Period:</strong> Click the "Remove" button next to a period to delete it.</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Adding a New Tariff Period:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Period Name:</strong> Give the period a descriptive name (e.g., "Night Saver", "Peak Rate", "Economy 7 Off-Peak").</li>
          <li><strong>Rate (pence/kWh, Optional):</strong> Enter the cost per kilowatt-hour for this period, if known.</li>
          <li><strong>Start Time (HH:MM):</strong> The time the period begins.</li>
          <li><strong>End Time (HH:MM):</strong> The time the period ends.</li>
          <li><strong>"This is a cheap/off-peak rate period" Switch:</strong> Toggle ON if this tariff period offers cheaper electricity.</li>
          <li><strong>Add Period Button:</strong> Click to save the new tariff period.</li>
        </ul>
        <p><strong>Tip:</strong> Accurately defining your cheap/off-peak periods is key for the Advisory page to give useful recommendations about grid charging.</p>
      </div>
    ),
  },
};


export function HowToInfo({ pageKey }: HowToInfoProps) {
  const { title, description } = pageInfo[pageKey];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={`How to use ${pageKey} page`}>
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

