import type { UserSettings, TariffPeriod } from '@/types/settings';
import type { CalculatedForecast } from './solar-calculations'; // Assuming this contains solar generation data

export interface EVNeeds {
  chargeRequiredKWh: number;
  chargeByHour: number; // Hour of the day (0-23) by which charging should complete
  maxChargeRateKWh: number; // Max power the EV can draw per hour
}

export interface ChargingAdviceParams {
  forecast: CalculatedForecast; // Solar generation forecast for the relevant day
  settings: UserSettings;
  tariffPeriods: TariffPeriod[];
  currentBatteryLevelKWh: number;
  hourlyConsumptionProfile: number[]; // Array of 24 numbers, kWh per hour for household
  currentHour: number; // Current hour of the day (0-23) - for 'today' advice type
  evNeeds: EVNeeds;
  adviceType: 'today' | 'overnight'; // 'today' for immediate/daytime, 'overnight' for planning next day's needs
  preferredOvernightBatteryChargePercent: number; // Target battery SOC by morning (0-100)
}

export interface ChargingAdvice {
  recommendChargeNow: boolean; // True if immediate grid charging (battery/EV) is advised
  recommendChargeLater: boolean; // True if grid charging later (e.g., overnight) is advised
  reason: string; // Main explanation for the advice
  details?: string; // Additional context or secondary reasons
  chargeNeededKWh?: number; // Estimated kWh needed from grid for the battery
  chargeWindow?: string; // Suggested time window for grid charging, e.g., "01:00 - 04:00 (Tomorrow)"
  potentialSavingsKWh?: number; // Estimated solar kWh that could offset grid usage or be exported
  evRecommendation?: string; // Specific advice string for EV charging
  evChargeWindow?: string; // Suggested time window for EV grid charging
  chargeCostPence?: number; // Estimated cost for the recommended grid charge (battery + EV)
}

const PRICE_CAP_DEFAULT_RATE_PENCE = 28.62; // Fallback rate if tariff rate is missing

// Helper to parse HH:MM to minutes since midnight
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to format minutes since midnight to HH:MM
const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

function isHourInPeriod(hour: number, period: TariffPeriod): boolean {
  const periodStartMinutes = parseTime(period.startTime);
  const periodEndMinutes = parseTime(period.endTime);
  const currentHourStartMinutes = hour * 60;

  if (periodStartMinutes <= periodEndMinutes) { // Period does not cross midnight
    return currentHourStartMinutes >= periodStartMinutes && currentHourStartMinutes < periodEndMinutes;
  } else { // Period crosses midnight
    return currentHourStartMinutes >= periodStartMinutes || currentHourStartMinutes < periodEndMinutes;
  }
}

export function getChargingAdvice(params: ChargingAdviceParams): ChargingAdvice | null {
  const {
    forecast,
    settings,
    tariffPeriods,
    currentBatteryLevelKWh,
    hourlyConsumptionProfile,
    currentHour,
    evNeeds,
    adviceType,
    preferredOvernightBatteryChargePercent,
  } = params;

  if (!settings.batteryCapacityKWh || settings.batteryCapacityKWh <= 0) {
    return {
      recommendChargeNow: false, recommendChargeLater: false,
      reason: "Battery capacity not set in settings. Cannot provide charging advice.",
    };
  }
  if (!forecast.hourlyForecast || forecast.hourlyForecast.length === 0) {
    return {
      recommendChargeNow: false, recommendChargeLater: false,
      reason: "Hourly solar forecast data is unavailable.",
      details: forecast.errorMessage || "No hourly forecast to base advice on."
    };
  }

  const batteryCapacity = settings.batteryCapacityKWh;
  const batteryMaxChargeRate = settings.batteryMaxChargeRateKWh || batteryCapacity; // Assume can charge full capacity in 1 hr if not set
  const targetBatterySOC = preferredOvernightBatteryChargePercent / 100;
  const targetBatteryLevelKWh = batteryCapacity * targetBatterySOC;

  let simulatedBatteryKWh = currentBatteryLevelKWh;
  let totalGridChargeForBatteryKWh = 0;
  let totalGridChargeForEVKWh = 0;
  let totalChargeCostPence = 0;
  
  let batteryChargeWindowParts: string[] = [];
  let evChargeWindowParts: string[] = [];

  const cheapTariffs = tariffPeriods.filter(p => p.isCheap).sort((a,b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
  
  const planningStartHour = adviceType === 'today' ? currentHour : 0;
  const planningEndHour = adviceType === 'today' ? 24 : 24; // Simulate through the end of today or the full next day

  // EV charging needs planning
  let remainingEVChargeKWh = evNeeds.chargeRequiredKWh;
  let evChargeDeadlineHour = evNeeds.chargeByHour;
  if (adviceType === 'overnight' && evNeeds.chargeByHour <= planningStartHour) {
    // If planning for overnight, and EV charge by time is early morning, it's for "tomorrow"
    evChargeDeadlineHour = evNeeds.chargeByHour + 24; // Adjust deadline to be within the overnight planning window
  }


  // Simulate hourly flow
  for (let hourOffset = 0; hourOffset < (planningEndHour - planningStartHour); hourOffset++) {
    const hour = (planningStartHour + hourOffset) % 24;
    const absoluteHourInPlanning = planningStartHour + hourOffset; // For EV deadline check over midnight

    const solarThisHour = forecast.hourlyForecast.find(h => parseInt(h.time.split(':')[0]) === hour)?.estimatedGenerationWh / 1000 || 0;
    const consumptionThisHour = hourlyConsumptionProfile[hour] || 0;
    
    let netEnergy = solarThisHour - consumptionThisHour;
    let batteryChange = netEnergy;

    // Attempt to meet EV demand first from solar/battery
    if (remainingEVChargeKWh > 0 && absoluteHourInPlanning < evChargeDeadlineHour) {
      const evChargeThisHourMax = Math.min(remainingEVChargeKWh, evNeeds.maxChargeRateKWh);
      
      if (netEnergy >= evChargeThisHourMax) { // Solar covers EV + consumption
        netEnergy -= evChargeThisHourMax; // EV takes from net solar
        remainingEVChargeKWh -= evChargeThisHourMax;
        batteryChange = netEnergy; // Remaining net goes to battery
      } else if (netEnergy > 0 && netEnergy < evChargeThisHourMax) { // Solar covers some EV
        remainingEVChargeKWh -= netEnergy;
        batteryChange = 0; // All net solar went to EV
        // Remaining EV demand might be met by battery or grid
        const evStillNeeds = evChargeThisHourMax - netEnergy;
        if (simulatedBatteryKWh >= evStillNeeds) {
            simulatedBatteryKWh -= evStillNeeds;
            remainingEVChargeKWh -= evStillNeeds;
            batteryChange -= evStillNeeds; // Account for battery discharge for EV
        } // Grid for EV handled below
      } else { // netEnergy <= 0, solar doesn't cover consumption, EV needs battery or grid
          // if (simulatedBatteryKWh >= evChargeThisHourMax) {
          //    simulatedBatteryKWh -= evChargeThisHourMax;
          //    remainingEVChargeKWh -= evChargeThisHourMax;
          //    batteryChange -= evChargeThisHourMax;
          // } // Grid for EV handled below
      }
    }
    
    // Update battery based on solar/consumption/EV discharge from battery
    simulatedBatteryKWh += batteryChange;
    simulatedBatteryKWh = Math.max(0, Math.min(batteryCapacity, simulatedBatteryKWh));

    // Grid charging for EV (if still needed and cheap or deadline approaching)
    if (remainingEVChargeKWh > 0 && absoluteHourInPlanning < evChargeDeadlineHour) {
        const isCheapEVHour = cheapTariffs.find(p => isHourInPeriod(hour, p));
        // Force charge if last few hours before deadline and still needs significant charge
        const hoursToDeadline = evChargeDeadlineHour - absoluteHourInPlanning;
        const forceEVCharge = hoursToDeadline > 0 && (remainingEVChargeKWh / evNeeds.maxChargeRateKWh) >= hoursToDeadline;

        if (isCheapEVHour || (forceEVCharge && adviceType === 'overnight')) { // Only force overnight for now
            const chargeFromGridForEV = Math.min(remainingEVChargeKWh, evNeeds.maxChargeRateKWh);
            totalGridChargeForEVKWh += chargeFromGridForEV;
            remainingEVChargeKWh -= chargeFromGridForEV;
            totalChargeCostPence += chargeFromGridForEV * (isCheapEVHour?.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);
            
            const dayLabel = absoluteHourInPlanning >= 24 ? " (Day After Tom.)" : (hour < currentHour && adviceType === 'overnight' ? " (Tomorrow)" : "");
            evChargeWindowParts.push(`${formatTime(hour*60)}${dayLabel}`);
        }
    }

    // Grid charging for Battery (only cheap tariffs and if below target)
    if (simulatedBatteryKWh < targetBatteryLevelKWh) {
        const isCheapBatteryHour = cheapTariffs.find(p => isHourInPeriod(hour, p));
        if (isCheapBatteryHour) {
            const neededForBatteryTarget = targetBatteryLevelKWh - simulatedBatteryKWh;
            const chargeFromGridForBattery = Math.min(neededForBatteryTarget, batteryMaxChargeRate);
            
            simulatedBatteryKWh += chargeFromGridForBattery;
            simulatedBatteryKWh = Math.min(batteryCapacity, simulatedBatteryKWh);
            totalGridChargeForBatteryKWh += chargeFromGridForBattery;
            totalChargeCostPence += chargeFromGridForBattery * (isCheapBatteryHour.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);

            const dayLabel = absoluteHourInPlanning >= 24 ? " (Day After Tom.)" : (hour < currentHour && adviceType === 'overnight' ? " (Tomorrow)" : "");
            batteryChargeWindowParts.push(`${formatTime(hour*60)}${dayLabel}`);
        }
    }
  } // End simulation loop

  // Consolidate window messages
  const formatWindow = (parts: string[]): string | undefined => {
    if (parts.length === 0) return undefined;
    parts.sort(); // Sort times
    const uniqueTimes = [...new Set(parts)]; // Remove duplicates if any hour was added multiple times
    if (uniqueTimes.length === 1) return uniqueTimes[0];
    return `${uniqueTimes[0]} - ${formatTime( (parseTime(uniqueTimes[uniqueTimes.length-1]) + 60) % (24*60) )}`; // Show range
  };

  const finalBatteryChargeWindow = formatWindow(batteryChargeWindowParts);
  const finalEVChargeWindow = formatWindow(evChargeWindowParts);
  
  let reason = "";
  let recommendNow = false;
  let recommendLater = false;
  let detailsMsg = "";
  let finalEVRecommendation = "";

  if (adviceType === 'today') {
      const currentCheapTariff = cheapTariffs.find(p => isHourInPeriod(currentHour,p));
      if (currentCheapTariff && currentBatteryLevelKWh < (targetBatteryLevelKWh * 0.8)) { // If significantly below target
          reason = `Battery is at ${(currentBatteryLevelKWh/batteryCapacity*100).toFixed(0)}%. A cheap tariff ('${currentCheapTariff.name}') is available now (${currentCheapTariff.startTime}-${currentCheapTariff.endTime}). Consider topping up.`;
          recommendNow = true;
          totalGridChargeForBatteryKWh = Math.max(0, targetBatteryLevelKWh - currentBatteryLevelKWh); // Estimate to reach target
          batteryChargeWindowParts = [`${formatTime(currentHour*60)} - ${currentCheapTariff.endTime}`];
      } else if (currentBatteryLevelKWh < (batteryCapacity * 0.3)) {
          reason = `Battery is very low (${(currentBatteryLevelKWh/batteryCapacity*100).toFixed(0)}%). Prioritize charging during the next available cheap tariff.`;
          recommendLater = true;
      } else {
          reason = "Battery level appears sufficient for now. Rely on solar and current charge.";
      }

      if (evNeeds.chargeRequiredKWh > 0) {
          if (totalGridChargeForEVKWh > 0 && finalEVChargeWindow) {
              finalEVRecommendation = `EV requires ${evNeeds.chargeRequiredKWh.toFixed(1)} kWh. Consider charging from grid during ${finalEVChargeWindow}.`;
              if (isHourInPeriod(currentHour, cheapTariffs.find(p => isHourInPeriod(currentHour,p))! )) recommendNow = true; else recommendLater = true;
          } else if (remainingEVChargeKWh <= 0) {
              finalEVRecommendation = "EV charging needs appear to be met by solar/battery based on forecast.";
          } else {
              finalEVRecommendation = `EV requires ${remainingEVChargeKWh.toFixed(1)} kWh. Charge before ${formatTime(evNeeds.chargeByHour*60)}. Consider next cheap tariff.`;
              recommendLater = true;
          }
      }

  } else { // Overnight advice
      if (totalGridChargeForBatteryKWh > 0 || totalGridChargeForEVKWh > 0) {
          reason = `Grid charging is recommended overnight.`;
          if (totalGridChargeForBatteryKWh > 0) reason += ` Battery needs ~${totalGridChargeForBatteryKWh.toFixed(1)}kWh to reach ${preferredOvernightBatteryChargePercent}% target.`;
          if (totalGridChargeForEVKWh > 0) reason += ` EV needs ~${totalGridChargeForEVKWh.toFixed(1)}kWh.`;
          detailsMsg = "This utilizes forecasted cheap tariff periods.";
          recommendLater = true;
      } else {
          reason = "Sufficient solar/battery expected for tomorrow's needs. Overnight grid charging may not be essential.";
      }
      if (evNeeds.chargeRequiredKWh > 0) {
        if(totalGridChargeForEVKWh > 0 && finalEVChargeWindow) {
            finalEVRecommendation = `Charge EV with ${totalGridChargeForEVKWh.toFixed(1)}kWh from grid during ${finalEVChargeWindow}.`;
        } else if (remainingEVChargeKWh <= 0) {
             finalEVRecommendation = "EV charging needs for tomorrow morning should be met by solar/battery.";
        } else {
             finalEVRecommendation = `EV still needs ${remainingEVChargeKWh.toFixed(1)}kWh by ${formatTime(evChargeDeadlineHour*60)}. Solar may not cover this; ensure charging.`;
        }
      }
  }
  
  const potentialSolarSavings = Math.max(0, forecast.dailyTotalGenerationKWh - hourlyConsumptionProfile.reduce((a,b) => a+b, 0));

  return {
    recommendChargeNow: recommendNow,
    recommendChargeLater: recommendLater,
    reason: reason,
    details: detailsMsg || undefined,
    chargeNeededKWh: parseFloat(totalGridChargeForBatteryKWh.toFixed(1)) || undefined,
    chargeWindow: finalBatteryChargeWindow,
    potentialSavingsKWh: parseFloat(potentialSolarSavings.toFixed(1)) || undefined,
    evRecommendation: finalEVRecommendation || undefined,
    evChargeWindow: totalGridChargeForEVKWh > 0 ? finalEVChargeWindow : undefined,
    chargeCostPence: parseFloat(totalChargeCostPence.toFixed(2)) || undefined,
  };
}
