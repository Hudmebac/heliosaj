
import * as z from 'zod';

export const settingsSchema = z.object({
  location: z.string().min(1, { message: "Location is required." }).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  propertyDirection: z.string().min(1, { message: "Please select a property direction." }),
  propertyDirectionFactor: z.coerce.number().optional(),
  panelCount: z.coerce.number().int().positive().optional(),
  panelWatts: z.coerce.number().int().positive().optional(),
  totalKWp: z.coerce.number().positive({ message: "Total System Power (kWp) must be positive." }).optional(),
  batteryCapacityKWh: z.coerce.number().nonnegative().optional(),
  batteryMaxChargeRateKWh: z.coerce.number().positive().optional(),
  preferredOvernightBatteryChargePercent: z.coerce.number().min(0).max(100).optional(),
  systemEfficiency: z.coerce.number().min(0.1).max(1, "Efficiency must be between 0.1 (10%) and 1.0 (100%)").optional(),
  dailyConsumptionKWh: z.coerce.number().nonnegative().optional(),
  avgHourlyConsumptionKWh: z.coerce.number().nonnegative().optional(),
  hourlyUsageProfile: z.array(z.coerce.number().nonnegative()).length(24).optional(),
  selectedWeatherSource: z.string().optional(),
  evChargeRequiredKWh: z.coerce.number().nonnegative().optional(),
  evChargeByTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format (HH:MM)" }).optional().or(z.literal('')),
  evMaxChargeRateKWh: z.coerce.number().positive().optional(),
  monthlyGenerationFactors: z.array(z.coerce.number().min(0).max(2)).length(12).optional(),
  // inputMode is handled internally by component state, not part of persisted settings schema directly
  // lastKnownBatteryLevelKWh is also handled by component state / useEffect in advisory
});


export interface UserSettings extends z.infer<typeof settingsSchema> {
  inputMode?: 'Panels' | 'TotalPower'; // This is managed by component state but might be useful if ever persisted
  lastKnownBatteryLevelKWh?: number; // This is managed by component state but might be useful if ever persisted
}


export const tariffPeriodSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Tariff name is required." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid start time format (HH:MM)." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid end time format (HH:MM)." }),
  isCheap: z.boolean(),
  rate: z.coerce.number().nonnegative().optional(),
});

export const tariffPeriodsSchema = z.array(tariffPeriodSchema);

export interface TariffPeriod extends z.infer<typeof tariffPeriodSchema> {}


export type ManualForecastCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';

export interface ManualDayForecast {
  date: string; // YYYY-MM-DD, not editable by user, set programmatically
  sunrise: string; // HH:MM
  sunset: string; // HH:MM
  condition: ManualForecastCondition;
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
  { value: 'South', label: 'South (Factor: 1.00)', factor: 1.00, notes: "Optimal. (Factor Range: 1.00)" },
  { value: 'South-West', label: 'South-West (Factor: ~0.95)', factor: 0.95, notes: "Excellent. Captures strong midday and afternoon sun. (Factor Range: 0.92 - 0.97)" },
  { value: 'South-East', label: 'South-East (Factor: ~0.95)', factor: 0.95, notes: "Excellent. Captures strong morning and midday sun. (Factor Range: 0.92 - 0.97)" },
  { value: 'West', label: 'West (Factor: ~0.82)', factor: 0.82, notes: "Good. Captures strong afternoon and evening sun. (Factor Range: 0.78 - 0.85)" },
  { value: 'East', label: 'East (Factor: ~0.82)', factor: 0.82, notes: "Good. Captures strong morning sun. (Factor Range: 0.78 - 0.85)" },
  { value: 'North-West', label: 'North-West (Factor: ~0.60)', factor: 0.60, notes: "Fair to Poor. Some direct sun late in summer. (Factor Range: 0.55 - 0.65)" },
  { value: 'North-East', label: 'North-East (Factor: ~0.60)', factor: 0.60, notes: "Fair to Poor. Some direct sun early in summer. (Factor Range: 0.55 - 0.65)" },
  { value: 'North', label: 'North (Factor: ~0.43)', factor: 0.43, notes: "Poor. Relies on diffuse light. (Factor Range: 0.35 - 0.50)" },
  { value: 'Flat Roof', label: 'Flat Roof (Angled South, Factor: ~0.90)', factor: 0.90, notes: "Assumes panels are optimally angled (e.g., towards South)." },
];

export const SOUTH_DIRECTION_INFO: PropertyDirectionInfo = propertyDirectionOptions.find(opt => opt.value === 'South')!;

export const defaultMonthlyFactors: number[] = [
    0.4, 0.5, 0.7, 0.9, 1.0, 1.1, 1.0, 0.9, 0.7, 0.5, 0.4, 0.3,
];


export const getFactorByDirectionValue = (value: string): number | undefined => {
  const option = propertyDirectionOptions.find(opt => opt.value === value);
  return option?.factor;
};
