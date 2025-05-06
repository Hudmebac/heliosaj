
export interface UserSettings {
  location: string; // User-friendly location string (e.g., "Lochgelly, UK")
  latitude?: number; // Optional: Derived from location or direct input
  longitude?: number; // Optional: Derived from location or direct input
  propertyDirection: 'North Facing' | 'South Facing' | 'East Facing' | 'West Facing' | 'Flat Roof';
  inputMode: 'Panels' | 'TotalPower';
  panelCount?: number; // Optional, used if inputMode is 'Panels'
  panelWatts?: number; // Optional, used if inputMode is 'Panels'
  totalKWp?: number; // Optional, used if inputMode is 'TotalPower'
  batteryCapacityKWh?: number; // Made optional as not everyone has a battery
  systemEfficiency?: number; // Optional: 0 to 1 (e.g., 0.85 for 85%) - defaults can be used if not set
  dailyConsumptionKWh?: number; // Optional: Average daily household energy consumption
  avgHourlyConsumptionKWh?: number; // Optional: Average hourly household energy consumption

  // EV Charging Preferences
  evChargeRequiredKWh?: number; // How much energy the car needs
  evChargeByTime?: string; // HH:MM format, when the car needs to be charged by
  evMaxChargeRateKWh?: number; // Max power the charger can deliver per hour (default 7.5)
  lastKnownBatteryLevelKWh?: number; // Added to store last known battery level from advisory

  monthlyGenerationFactors?: number[]; // Array of 12 numbers, one for each month (0=Jan, 11=Dec)
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

