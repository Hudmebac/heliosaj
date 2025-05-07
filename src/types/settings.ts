
export interface UserSettings {
  location: string; // User-friendly location string (e.g., "Lochgelly, UK")
  latitude?: number; // Optional: Derived from location or direct input
  longitude?: number; // Optional: Derived from location or direct input
  propertyDirection: string; // Stores the selected orientation key/value e.g. "South", "North-East"
  propertyDirectionFactor?: number; // Stores the numeric factor for the selected direction
  inputMode: 'Panels' | 'TotalPower';
  panelCount?: number; // Optional, used if inputMode is 'Panels'
  panelWatts?: number; // Optional, used if inputMode is 'Panels'
  totalKWp?: number; // Optional, used if inputMode is 'TotalPower'
  batteryCapacityKWh?: number; // Made optional as not everyone has a battery
  systemEfficiency?: number; // Optional: 0 to 1 (e.g., 0.85 for 85%) - defaults can be used if not set
  dailyConsumptionKWh?: number; // Optional: Average daily household energy consumption
  avgHourlyConsumptionKWh?: number; // Optional: Average hourly household energy consumption
  hourlyUsageProfile?: number[]; // Optional: Array of 24 numbers for hourly consumption

  // EV Charging Preferences
  evChargeRequiredKWh?: number; // How much energy the car needs
  evChargeByTime?: string; // HH:MM format, when the car needs to be charged by
  evMaxChargeRateKWh?: number; // Max power the charger can deliver per hour (default 7.5)
  lastKnownBatteryLevelKWh?: number; // Added to store last known battery level from advisory

  monthlyGenerationFactors?: number[]; // Array of 12 numbers, one for each month (0=Jan, 11=Dec)
  selectedWeatherSource?: string; // ID of the selected weather source
}

export interface TariffPeriod {
  id: string; // unique identifier, e.g., uuid or timestamp based
  name: string; // e.g., "Night Saver", "Standard Rate"
  startTime: string; // HH:MM format (e.g., "00:00")
  endTime: string; // HH:MM format (e.g., "05:00")
  isCheap: boolean; // True if this is considered an off-peak/cheap period
  rate?: number; // Optional: Cost per kWh during this period
}

export interface ManualDayForecast {
  date: string; // YYYY-MM-DD, not editable by user, set programmatically
  sunrise: string; // HH:MM
  sunset: string; // HH:MM
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';
}

export interface ManualForecastInput {
  today: ManualDayForecast;
  tomorrow: ManualDayForecast;
}

export interface PropertyDirectionInfo {
  value: string;
  label: string;
  factor: number;
  notes?: string;
}

export const propertyDirectionOptions: PropertyDirectionInfo[] = [
  { value: 'South', label: 'South (Factor: 1.00)', factor: 1.00, notes: "Optimal. Receives the most direct sunlight throughout the day, year-round." },
  { value: 'South-West', label: 'South-West (Factor: ~0.95)', factor: 0.95, notes: "Excellent. Captures strong midday and afternoon sun." },
  { value: 'South-East', label: 'South-East (Factor: ~0.95)', factor: 0.95, notes: "Excellent. Captures strong morning and midday sun." },
  { value: 'West', label: 'West (Factor: ~0.82)', factor: 0.82, notes: "Good. Captures strong afternoon and evening sun." },
  { value: 'East', label: 'East (Factor: ~0.82)', factor: 0.82, notes: "Good. Captures strong morning sun." },
  { value: 'North-West', label: 'North-West (Factor: ~0.60)', factor: 0.60, notes: "Fair to Poor. Receives some direct sun late in the day during summer." },
  { value: 'North-East', label: 'North-East (Factor: ~0.60)', factor: 0.60, notes: "Fair to Poor. Receives some direct sun early in the day during summer." },
  { value: 'North', label: 'North (Factor: ~0.43)', factor: 0.43, notes: "Poor. Receives virtually no direct sunlight. Relies on diffuse light." },
  { value: 'Flat Roof', label: 'Flat Roof (Angled South, Factor: ~0.90)', factor: 0.90, notes: "Assumes panels are optimally angled (e.g., towards South)." },
];

// Helper function to get factor by direction value
export const getFactorByDirectionValue = (value: string): number | undefined => {
  const option = propertyDirectionOptions.find(opt => opt.value === value);
  return option?.factor;
};
