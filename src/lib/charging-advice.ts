import type { CalculatedForecast } from './solar-calculations';
import type { UserSettings, TariffPeriod } from '@/types/settings';

export interface AdviceResult {
  recommendCharge: boolean;
  reason: string;
  details?: string; // Optional extra context
}

/**
 * Generates advice on whether to charge a battery from the grid during cheap periods.
 *
 * @param forecastTomorrow The calculated solar generation forecast for the next day.
 * @param userSettings The user's system settings, including battery capacity.
 * @param cheapTariffs An array of tariff periods defined as 'cheap'.
 * @returns An AdviceResult object with the recommendation and reasoning.
 */
export function getChargingAdvice(
  forecastTomorrow: CalculatedForecast,
  userSettings: UserSettings,
  cheapTariffs: TariffPeriod[]
): AdviceResult {

  if (!userSettings.batteryCapacityKWh || userSettings.batteryCapacityKWh <= 0) {
    return {
      recommendCharge: false,
      reason: "Cannot provide advice: Battery capacity not set or invalid.",
    };
  }

  if (cheapTariffs.length === 0) {
     return {
      recommendCharge: false,
      reason: "Cannot provide advice: No cheap tariff periods defined.",
    };
  }

  // --- Core Logic ---
  const batteryCapacity = userSettings.batteryCapacityKWh;
  const forecastedGeneration = forecastTomorrow.dailyTotalGenerationKWh;

  // Threshold: How much of the battery capacity do we expect solar to fill?
  // If forecast is less than, say, 80% of battery capacity, grid charging might be good.
  const chargeThresholdPercentage = 0.8; // Recommend charging if forecast is below 80% of battery capacity
  const generationThreshold = batteryCapacity * chargeThresholdPercentage;

    let reason = "";
    let details = `Tomorrow's forecast: ${forecastedGeneration.toFixed(1)} kWh. Battery: ${batteryCapacity} kWh.`;
    const cheapPeriodsExist = cheapTariffs.length > 0;
    const cheapPeriodTimes = cheapTariffs.map(p => `${p.startTime}-${p.endTime}`).join(', ');


  if (forecastedGeneration < generationThreshold) {
        reason = `Low solar forecast (${forecastedGeneration.toFixed(1)} kWh) expected tomorrow, less than ${chargeThresholdPercentage*100}% of your battery capacity (${generationThreshold.toFixed(1)} kWh).`;
        if (cheapPeriodsExist) {
             return {
                recommendCharge: true,
                reason: reason + ` Consider charging during your cheap tariff window (${cheapPeriodTimes}).`,
                 details: details
            };
        } else {
             return {
                recommendCharge: false, // Cannot recommend charging without cheap periods
                reason: reason + ` However, no cheap tariff periods are defined.`,
                 details: details
            };
        }

  } else {
     reason = `High solar forecast (${forecastedGeneration.toFixed(1)} kWh) expected tomorrow, likely sufficient to charge your battery (${batteryCapacity} kWh).`;
     return {
        recommendCharge: false,
        reason: reason + " Grid charging tonight is likely unnecessary.",
        details: details
    };
  }

  // Note: This logic is simplified. It doesn't consider:
  // - Current battery charge level (requires integration or estimation)
  // - Expected household consumption during the day (reduces energy available for battery charging)
  // - Specific tariff rates (just assumes 'cheap' is worth using if solar is low)
  // - Weather variability within the day
}
