
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
        <p>The Dashboard provides an at-a-glance overview of your solar energy generation.</p>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Location Display:</strong> Shows the location your forecast is based on (from Settings).</li>
          <li><strong>Weather Source Dropdown (Header):</strong> Select "Open-Meteo" for API-driven forecasts or "Manual Input" to enter your own sunrise/sunset and weather conditions. The selected source impacts all forecast-dependent features.</li>
          <li><strong>Refresh/Edit Forecast Button:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li>If "Open-Meteo" is selected, this button refreshes the API data. It's disabled if location details are missing in Settings.</li>
              <li>If "Manual Input" is selected, this button opens a dialog to edit today's and tomorrow's forecast details (sunrise, sunset, condition).</li>
            </ul>
          </li>
          <li><strong>Chart Type Selector:</strong> Choose between Bar, Line, or Area charts to visualize hourly generation.</li>
          <li><strong>Today/Tomorrow Forecast Cards:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
                <li>Displays total estimated solar generation (kWh) for the day.</li>
                <li>Shows the weather condition (e.g., Sunny, Cloudy) from the selected source.</li>
                <li>Indicates sunrise and sunset times.</li>
                <li>For "Open-Meteo" source, maximum temperature for the day is also shown.</li>
                <li>The chart visualizes estimated generation (kWh) per hour. Hover over data points for specific values. X-axis shows hours with generation, Y-axis shows kWh.</li>
            </ul>
          </li>
          <li><strong>Week Ahead (Open-Meteo Source Only):</strong> Shows a condensed 7-day forecast overview, including estimated daily generation, if using the Open-Meteo source and viewing on a non-mobile device.</li>
          <li><strong>Alerts:</strong> If critical settings (like location for API or system power) are missing, alerts will guide you to the Settings page.</li>
        </ul>
        <p><strong>Tip:</strong> For accurate forecasts, ensure your system settings (especially location and total system power) are correctly configured. If using "Manual Input", keep your forecast details updated via the "Edit Manual Forecast" button.</p>
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
          <li><strong>Location Lookup & Manual Entry:</strong> Use the postcode lookup (UK only) to find your address and automatically populate latitude/longitude. Alternatively, enter location name and coordinates manually. Accurate coordinates are vital for the Open-Meteo source.</li>
          <li><strong>Property/Panel Direction:</strong> Select the direction your main solar panels face. This applies a generation factor. Hover over the help icon for details.</li>
          <li><strong>Solar Panel System Details:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li>You can input your "Number of Panels" and "Max Power per Panel (Watts)". This will show a "Calculated from panel details" value.</li>
              <li>Click "Apply to Total System Power" to use this calculated value in the "Total System Power (kWp)" field.</li>
              <li>Alternatively, directly enter your system's official "Total System Power (kWp)" rating. This kWp value is crucial for all forecast calculations.</li>
            </ul>
          </li>
          <li><strong>Battery Details:</strong> Enter your battery's "Capacity (kWh)", "Max Charge Rate (kW)", and your "Preferred Overnight Battery Target (%)". These are essential for charging advice.</li>
          <li><strong>Consumption Estimates (Optional):</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li>Input your "Daily Consumption (kWh)" and "Average Hourly Consumption (kWh)".</li>
              <li>Use the buttons to distribute daily totals evenly or apply averages to the hourly profile.</li>
              <li>Expand "Adjust Hourly Consumption Profile" to fine-tune usage for each hour using sliders. This data is used by the Advisory page.</li>
            </ul>
          </li>
          <li><strong>System Efficiency Factor (Optional):</strong> Set an overall efficiency (0.1-1.0) for your system. Defaults to 0.85 (85%) if left blank.</li>
        </ul>
        <h3 className="font-semibold text-foreground pt-2">Manage Time of Year Efficiency (Manual Source Only):</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>This section is collapsible. If you use the "Manual Input" weather source (selected in the header), you can adjust the relative generation factor for each month here. These factors are NOT used if "Open-Meteo" source is active.</li>
        </ul>
         <h3 className="font-semibold text-foreground pt-2">Manage Tariff Periods:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li>Define your electricity tariff periods: name, start/end times, rate (optional), and mark if it's a "cheap/off-peak" period. This is crucial for the Smart Charging Advisory.</li>
          <li>Use the "Add New Tariff Period" form to add entries. Existing periods can be removed.</li>
        </ul>
        <p><strong>Remember to click "Save General Settings" or "Save Monthly Factors" (if applicable) after making changes in the respective sections. Tariff periods are saved automatically when added/removed.</strong></p>
      </div>
    ),
  },
  advisory: {
    title: "How to Use the Smart Charging Advisory",
    description: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>The Advisory page helps you optimize battery and EV charging based on your forecast (from the selected source), defined tariffs, and energy consumption patterns.</p>
        <h3 className="font-semibold text-foreground pt-2">Key Sections & Inputs:</h3>
        <ul className="list-disc list-inside space-y-1 pl-4">
          <li><strong>Refresh/Edit Forecast Button:</strong> Depending on the source selected in the header, this button refreshes API data or opens the manual forecast editor. Accurate forecast data is critical.</li>
          <li><strong>Recommendations (Today & Overnight):</strong> These cards provide direct advice:
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Today's Recommendation:</strong> Considers current time, solar forecast for today, your consumption, battery state, EV needs, and active/upcoming cheap tariffs for today.</li>
              <li><strong>Overnight Charging (for Tomorrow):</strong> Focuses on charging strategy for the upcoming night based on tomorrow's solar forecast, your overnight battery target, EV needs for the next morning, and overnight cheap tariffs.</li>
              <li>Recommendations will indicate whether to charge from the grid (now or later), rely on solar, or if current battery levels are sufficient. Estimated costs and charge windows for grid charging are provided if applicable.</li>
            </ul>
          </li>
          <li><strong>Your Energy Inputs:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Current Battery Level (kWh):</strong> Input your battery's current state of charge. Percentage and total capacity (from Settings) are shown.</li>
              <li><strong>Preferred Overnight Battery Target (%):</strong> Set your desired battery charge level by the next morning.</li>
              <li><strong>Consumption (Daily/Hourly):</strong> Define your household energy usage. You can set a daily total and distribute it, set an average hourly, or fine-tune each hour using the collapsible "Adjust Hourly Consumption Profile" sliders.</li>
            </ul>
          </li>
          <li><strong>EV Charging Preferences:</strong>
            <ul className="list-disc list-inside space-y-1 pl-6">
              <li><strong>Charge Required (kWh):</strong> Amount of energy your EV needs. Set to 0 if no EV charge is needed.</li>
              <li><strong>Charge By Time (HH:MM):</strong> Deadline by which the EV needs to be charged.</li>
              <li><strong>Max Charge Rate (kW):</strong> Your EV charger's maximum power output.</li>
            </ul>
          </li>
          <li><strong>Forecast & Configuration Used:</strong> Summarizes the key data points (estimated generation, battery details, cheap tariffs) currently being used to generate the advice.</li>
        </ul>
        <p><strong>How it Works:</strong> The system calculates expected solar generation, compares it against your hourly consumption and EV needs, and factors in your battery's state, capacity, target charge, along with cheap tariff times, to provide recommendations on when and how much to charge from the grid or utilize solar/battery power.</p>
        <p><strong>Tip:</strong> For the most accurate advice, ensure all your System Settings are correct. Regularly update your "Current Battery Level" and consumption inputs on this page. If using "Manual Input" for weather, keep that forecast current.</p>
      </div>
    ),
  },
  tariffs: { // This key is used for the HowToInfo trigger within the Tariff Management card in settings.
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
          <li><strong>Rate (pence/kWh, Optional):</strong> Enter the cost per kilowatt-hour for this period, if known. This helps in cost estimations.</li>
          <li><strong>Start Time (HH:MM):</strong> The time the period begins (e.g., 00:30 for 12:30 AM).</li>
          <li><strong>End Time (HH:MM):</strong> The time the period ends (e.g., 05:30 for 5:30 AM). For periods that cross midnight, ensure the times correctly represent the duration (e.g., Start: 23:00, End: 07:00 for an overnight tariff).</li>
          <li><strong>"This is a cheap/off-peak rate period" Switch:</strong> Toggle this ON if this tariff period offers cheaper electricity. This is the primary flag the Advisory page uses for optimization.</li>
          <li><strong>Add Period Button:</strong> Click to save the new tariff period. Periods are saved to local storage automatically.</li>
        </ul>
        <p><strong>Tip:</strong> Accurately defining your cheap/off-peak periods is key for the Advisory page to give useful recommendations about grid charging. Ensure start and end times correctly define the period boundaries.</p>
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

