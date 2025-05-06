
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

interface HowToInfoProps {
  pageKey: 'dashboard' | 'settings' | 'advisory' | 'tariffs';
}

const pageInfo: Record<HowToInfoProps['pageKey'], { title: string; description: React.ReactNode }> = {
  dashboard: {
    title: "How to Interpret the Dashboard",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>The Dashboard provides an at-a-glance overview of your solar energy generation based on your manual forecast inputs.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Location Display:</strong> Shows the location your forecast is based on (from Settings).</li>
          <li><strong>Edit Manual Forecast:</strong> Click this button to update sunrise/sunset times and weather conditions for today and tomorrow. This directly impacts the generation estimates.</li>
          <li><strong>Today/Tomorrow Forecast Cards:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
                <li>Shows the total estimated solar generation (kWh) for the day.</li>
                <li>Displays the weather condition you set (e.g., Sunny, Cloudy).</li>
                <li>Indicates the sunrise and sunset times you entered.</li>
                <li>The bar chart visualizes estimated generation (kWh) per hour. Hover over bars for specific values.</li>
            </ul>
          </li>
          <li><strong>Week Ahead:</strong> This section currently shows placeholders. Future updates may enable more detailed weekly forecasts.</li>
          <li><strong>Alerts:</strong> If your system settings are incomplete, an alert will guide you to the Settings page.</li>
        </ul>
        <p><strong>Tip:</strong> Accurate manual forecast inputs (sunrise, sunset, condition) are crucial for meaningful dashboard data. Use the "Edit Manual Forecast" to keep this up-to-date.</p>
      </div>
    ),
  },
  settings: {
    title: "How to Manage System Settings",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This page allows you to configure all aspects of your solar energy system for accurate calculations.</p>
        <h3 className="font-semibold text-foreground pt-2">General Settings:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Location Lookup:</strong> Enter your UK postcode and click "Find Address" to automatically populate location and coordinates. Select your specific address from the dropdown.</li>
          <li><strong>Manual Location/Coordinates:</strong> If lookup fails or for non-UK locations, manually enter a location name, latitude, and longitude. Accurate coordinates are vital.</li>
          <li><strong>Property/Panel Direction:</strong> Select the direction your main solar panels face. Hover over the help icon for details on how different directions impact generation factors.</li>
          <li><strong>Solar Panel Power Input Mode:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>By Panel Details:</strong> Enter the number of panels and the max power (Watts) of each individual panel.</li>
              <li><strong>By Total System Power:</strong> Enter the total kilowatt-peak (kWp) rating of your entire solar array.</li>
            </ul>
          </li>
          <li><strong>Battery Storage Capacity (kWh, Optional):</strong> Enter the total usable capacity of your battery if you have one. Leave blank if not.</li>
          <li><strong>Consumption Estimates (Optional):</strong> Input your average daily and hourly household energy consumption. This is primarily used on the Advisory page.</li>
          <li><strong>System Efficiency Factor (Optional):</strong> Adjust the overall efficiency of your system (e.g., 0.85 for 85%). This accounts for inverter losses, wiring, panel age, etc. Defaults to 0.85 if blank.</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Manage Time of Year Efficiency:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>Adjust the relative generation factor for each month to account for seasonal variations (e.g., shorter days in winter). Default values are provided as estimates. A factor of 1.0 is average, 0.5 is 50% of average, etc. The current month is highlighted.</li>
        </ul>
        <p><strong>Remember to click "Save General Settings" or "Save Monthly Factors" after making changes in the respective sections.</strong></p>
      </div>
    ),
  },
  advisory: {
    title: "How to Use the Smart Charging Advisory",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>The Advisory page helps you optimize battery and EV charging based on your manual forecast, defined tariffs, and energy consumption patterns.</p>
        <h3 className="font-semibold text-foreground pt-2">Key Sections & Inputs:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Edit Manual Forecast:</strong> Update today's and tomorrow's weather conditions, sunrise, and sunset times here. This is critical for the advice.</li>
          <li><strong>Recommendations (Today & Overnight):</strong> These cards at the top provide direct advice on whether to charge your battery or EV from the grid, rely on solar, or prepare for later charging. They consider your forecast, battery level, EV needs, and tariff periods.</li>
          <li><strong>Your Energy Inputs:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Current Battery Level (kWh):</strong> Input your battery's current charge. The percentage and capacity (from Settings) are shown for reference.</li>
              <li><strong>Estimated Daily Consumption (kWh):</strong> Your total expected energy use for a day. Click "Distribute Evenly" to spread this across all hours.</li>
              <li><strong>Average Hourly Consumption (kWh):</strong> The average amount you use per hour. Click "Apply Average" to set all hours to this value.</li>
              <li><strong>Adjust Hourly Consumption Profile (Collapsible):</strong> Expand this section to fine-tune your expected energy usage for each specific hour using sliders. The current hour is highlighted.</li>
            </ul>
          </li>
          <li><strong>EV Charging Preferences:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Charge Required (kWh):</strong> Amount of energy your EV needs.</li>
              <li><strong>Charge By Time (HH:MM):</strong> Deadline for EV charging.</li>
              <li><strong>Max Charge Rate (kW):</strong> Your EV charger's maximum power output.</li>
            </ul>
          </li>
          <li><strong>Forecast & Configuration Used:</strong> Summarizes the key data points currently being used to generate the advice, such as estimated generation, battery details, and defined cheap tariff periods.</li>
        </ul>
        <p><strong>How it Works:</strong> The system calculates expected solar generation, compares it against your hourly consumption profile and EV needs, and factors in your battery's state and capacity, along with cheap tariff times, to provide recommendations.</p>
        <p><strong>Tip:</strong> Regularly update your manual forecast, current battery level, and hourly consumption for the most accurate advice. Ensure your tariff periods are correctly defined on the Tariffs page.</p>
      </div>
    ),
  },
  tariffs: {
    title: "How to Manage Energy Tariffs",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>This page allows you to define different electricity tariff periods from your supplier. This information is crucial for the Smart Charging Advisory to determine the most cost-effective times to charge your battery or EV from the grid.</p>
        <h3 className="font-semibold text-foreground pt-2">Managing Tariff Periods:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Existing Periods:</strong> Any tariff periods you've already added are listed here, showing their name, time range, rate (if entered), and whether they are marked as a "Cheap Rate".</li>
          <li><strong>Remove a Period:</strong> Click the "Remove" button next to a period to delete it.</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Adding a New Tariff Period:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Period Name:</strong> Give the period a descriptive name (e.g., "Night Saver", "Peak Rate", "Economy 7 Off-Peak").</li>
          <li><strong>Rate (pence/kWh, Optional):</strong> Enter the cost per kilowatt-hour for this period, if known. This helps in more detailed cost-saving calculations (though current advice primarily uses the "cheap" flag).</li>
          <li><strong>Start Time (HH:MM):</strong> The time the period begins (e.g., 00:30 for 12:30 AM).</li>
          <li><strong>End Time (HH:MM):</strong> The time the period ends (e.g., 05:30 for 5:30 AM). For periods that cross midnight, ensure the times correctly represent the duration (e.g., Start: 23:00, End: 07:00 for an overnight tariff).</li>
          <li><strong>"This is a cheap/off-peak rate period" Switch:</strong> Toggle this ON if this tariff period offers cheaper electricity (e.g., Economy 7, EV tariffs). This is the primary flag the Advisory page uses.</li>
          <li><strong>Add Period Button:</strong> Click to save the new tariff period.</li>
        </ul>
        <p><strong>Understanding Tariffs (UK Example):</strong> The section below provides general information about common UK energy tariff types. Refer to this for context, but always check your supplier's specific details.</p>
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
