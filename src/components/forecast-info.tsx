
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

export interface MonthData {
  month: string;
  sunrise: string;
  sunset: string;
}

export interface CitySunriseSunsetData {
  city: string;
  data: MonthData[];
}

export const sunriseSunsetData: CitySunriseSunsetData[] = [
  {
    city: "London, England",
    data: [
      { month: "January", sunrise: "07:55 GMT", sunset: "16:20 GMT" },
      { month: "February", sunrise: "07:15 GMT", sunset: "17:10 GMT" },
      { month: "March", sunrise: "06:15 GMT", sunset: "18:00 GMT" },
      { month: "April", sunrise: "06:10 BST", sunset: "19:50 BST" },
      { month: "May", sunrise: "05:15 BST", sunset: "20:35 BST" },
      { month: "June", sunrise: "04:45 BST", sunset: "21:15 BST" },
      { month: "July", sunrise: "05:00 BST", sunset: "21:10 BST" },
      { month: "August", sunrise: "05:45 BST", sunset: "20:25 BST" },
      { month: "September", sunrise: "06:30 BST", sunset: "19:20 BST" },
      { month: "October", sunrise: "07:20 BST", sunset: "18:10 BST" },
      { month: "November", sunrise: "07:10 GMT", sunset: "16:15 GMT" },
      { month: "December", sunrise: "07:55 GMT", sunset: "15:50 GMT" },
    ],
  },
  {
    city: "Manchester, England",
    data: [
      { month: "January", sunrise: "08:10 GMT", sunset: "16:20 GMT" },
      { month: "February", sunrise: "07:25 GMT", sunset: "17:15 GMT" },
      { month: "March", sunrise: "06:25 GMT", sunset: "18:05 GMT" },
      { month: "April", sunrise: "06:20 BST", sunset: "20:00 BST" },
      { month: "May", sunrise: "05:20 BST", sunset: "20:45 BST" },
      { month: "June", sunrise: "04:45 BST", sunset: "21:30 BST" },
      { month: "July", sunrise: "05:00 BST", sunset: "21:20 BST" },
      { month: "August", sunrise: "05:50 BST", sunset: "20:35 BST" },
      { month: "September", sunrise: "06:40 BST", sunset: "19:30 BST" },
      { month: "October", sunrise: "07:30 BST", sunset: "18:20 BST" },
      { month: "November", sunrise: "07:25 GMT", sunset: "16:15 GMT" },
      { month: "December", sunrise: "08:10 GMT", sunset: "15:55 GMT" },
    ],
  },
  {
    city: "Edinburgh, Scotland",
    data: [
      { month: "January", sunrise: "08:30 GMT", sunset: "16:10 GMT" },
      { month: "February", sunrise: "07:40 GMT", sunset: "17:10 GMT" },
      { month: "March", sunrise: "06:35 GMT", sunset: "18:05 GMT" },
      { month: "April", sunrise: "06:25 BST", sunset: "20:05 BST" },
      { month: "May", sunrise: "05:20 BST", sunset: "20:55 BST" },
      { month: "June", sunrise: "04:30 BST", sunset: "21:45 BST" },
      { month: "July", sunrise: "04:50 BST", sunset: "21:35 BST" },
      { month: "August", sunrise: "05:40 BST", sunset: "20:45 BST" },
      { month: "September", sunrise: "06:35 BST", sunset: "19:35 BST" },
      { month: "October", sunrise: "07:30 BST", sunset: "18:20 BST" },
      { month: "November", sunrise: "07:30 GMT", sunset: "16:10 GMT" },
      { month: "December", sunrise: "08:25 GMT", sunset: "15:45 GMT" },
    ],
  },
  {
    city: "Cardiff, Wales",
    data: [
      { month: "January", sunrise: "08:05 GMT", sunset: "16:30 GMT" },
      { month: "February", sunrise: "07:25 GMT", sunset: "17:20 GMT" },
      { month: "March", sunrise: "06:25 GMT", sunset: "18:10 GMT" },
      { month: "April", sunrise: "06:20 BST", sunset: "20:00 BST" },
      { month: "May", sunrise: "05:25 BST", sunset: "20:45 BST" },
      { month: "June", sunrise: "04:55 BST", sunset: "21:25 BST" },
      { month: "July", sunrise: "05:10 BST", sunset: "21:20 BST" },
      { month: "August", sunrise: "05:55 BST", sunset: "20:35 BST" },
      { month: "September", sunrise: "06:40 BST", sunset: "19:30 BST" },
      { month: "October", sunrise: "07:30 BST", sunset: "18:20 BST" },
      { month: "November", sunrise: "07:20 GMT", sunset: "16:25 GMT" },
      { month: "December", sunrise: "08:05 GMT", sunset: "16:00 GMT" },
    ],
  },
  {
    city: "Belfast, Northern Ireland",
    data: [
      { month: "January", sunrise: "08:30 GMT", sunset: "16:30 GMT" },
      { month: "February", sunrise: "07:40 GMT", sunset: "17:25 GMT" },
      { month: "March", sunrise: "06:40 GMT", sunset: "18:20 GMT" },
      { month: "April", sunrise: "06:30 BST", sunset: "20:15 BST" },
      { month: "May", sunrise: "05:30 BST", sunset: "21:05 BST" },
      { month: "June", sunrise: "04:50 BST", sunset: "21:50 BST" },
      { month: "July", sunrise: "05:10 BST", sunset: "21:40 BST" },
      { month: "August", sunrise: "06:00 BST", sunset: "20:50 BST" },
      { month: "September", sunrise: "06:50 BST", sunset: "19:45 BST" },
      { month: "October", sunrise: "07:45 BST", sunset: "18:30 BST" },
      { month: "November", sunrise: "07:40 GMT", sunset: "16:25 GMT" },
      { month: "December", sunrise: "08:30 GMT", sunset: "16:00 GMT" },
    ],
  },
];

// Helper function to extract HH:MM from "HH:MM TZ" string
const extractTime = (timeWithTz: string): string => {
  return timeWithTz.split(' ')[0];
};

export const getApproximateSunriseSunset = (cityName: string, date: Date): { sunrise: string; sunset: string } | null => {
  const cityData = sunriseSunsetData.find(c => c.city === cityName);
  if (!cityData) return null;

  const monthName = format(date, 'MMMM');
  const monthEntry = cityData.data.find(m => m.month === monthName);

  if (!monthEntry) {
    // Fallback to the closest month or just a default if exact month not found (should not happen with full data)
    console.warn(`Month data for ${monthName} in ${cityName} not found. Using first available.`);
    const fallbackEntry = cityData.data[0];
    return {
      sunrise: extractTime(fallbackEntry.sunrise),
      sunset: extractTime(fallbackEntry.sunset),
    };
  }

  return {
    sunrise: extractTime(monthEntry.sunrise),
    sunset: extractTime(monthEntry.sunset),
  };
};


export function ForecastInfo() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Approximate Sunrise & Sunset Times (UK)</h2>
      <p className="text-sm text-muted-foreground">
        Below are typical sunrise and sunset times for various cities. GMT is used during winter months, and BST (British Summer Time, GMT+1) during summer months. These are general guides; for precise times for a specific date and location, use online tools like:
      </p>
      <ul className="list-disc list-inside text-sm space-y-1 pl-4">
        <li><a href="https://www.timeanddate.com/sun/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Time and Date</a></li>
        <li><a href="https://www.metoffice.gov.uk/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Met Office</a> (often includes sunrise/sunset in local forecasts)</li>
      </ul>

      <Accordion type="single" collapsible className="w-full">
        {sunriseSunsetData.map((cityData) => (
          <AccordionItem value={cityData.city} key={cityData.city}>
            <AccordionTrigger>{cityData.city}</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Sunrise (Local)</TableHead>
                    <TableHead>Sunset (Local)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityData.data.map((monthEntry) => (
                    <TableRow key={`${cityData.city}-${monthEntry.month}`}>
                      <TableCell>{monthEntry.month}</TableCell>
                      <TableCell>{monthEntry.sunrise}</TableCell>
                      <TableCell>{monthEntry.sunset}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

    