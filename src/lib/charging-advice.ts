
import type { UserSettings, TariffPeriod } from '@/types/settings';
import type { CalculatedForecast } from './solar-calculations';

export interface EVNeeds {
  chargeRequiredKWh: number;
  chargeByHour: number; // Hour of the day (0-23)
  maxChargeRateKWh: number;
}

export interface ChargingAdviceParams {
  forecast: CalculatedForecast;
  settings: UserSettings;
  tariffPeriods: TariffPeriod[];
  currentBatteryLevelKWh: number;
  hourlyConsumptionProfile: number[]; // Array of 24 numbers, kWh per hour
  currentHour: number; // Current hour of the day (0-23) for 'today' advice
  evNeeds: EVNeeds;
  adviceType: 'today' | 'overnight';
  preferredOvernightBatteryChargePercent: number;
}

export interface ChargingAdvice {
  recommendChargeNow: boolean;
  recommendChargeLater: boolean;
  reason: string;
  details?: string;
  chargeNeededKWh?: number; // For battery
  chargeWindow?: string; // e.g., "14:00 - 17:00" or "01:00 - 04:00 (Tomorrow)"
  potentialSavingsKWh?: number; // Estimated solar to offset grid usage
  evRecommendation?: string; // Specific advice for EV
  evChargeWindow?: string;
  chargeCostPence?: number; // Estimated cost for the recommended grid charge
}

const PRICE_CAP_DEFAULT_RATE_PENCE = 28.62; // Example default rate

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

// Helper to check if a given hour is within a tariff period
function isHourInPeriod(hour: number, period: TariffPeriod): boolean {
  const periodStart = parseTime(period.startTime);
  const periodEnd = parseTime(period.endTime);
  const currentMinutes = hour * 60;

  if (periodStart <= periodEnd) { // Period does not cross midnight
    return currentMinutes >= periodStart && currentMinutes < periodEnd;
  } else { // Period crosses midnight
    return currentMinutes >= periodStart || currentMinutes < periodEnd;
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
      recommendChargeNow: false,
      recommendChargeLater: false,
      reason: "Battery capacity not set in settings. Cannot provide charging advice.",
    };
  }
   if (!forecast.hourlyForecast) {
    return {
        recommendChargeNow: false,
        recommendChargeLater: false,
        reason: "Hourly solar forecast data is unavailable. Cannot provide charging advice.",
        details: forecast.errorMessage || "No specific error message for forecast."
    };
  }


  const batteryCapacity = settings.batteryCapacityKWh;
  const targetBatteryLevelKWh = batteryCapacity * (preferredOvernightBatteryChargePercent / 100);
  let simulatedBatteryKWh = currentBatteryLevelKWh;
  let totalGridChargeNeededForBattery = 0;
  let totalGridChargeForEV = 0;
  let chargeCostPence = 0;
  let adviceReason = "";
  let adviceDetails = "";
  let evRecommendation = "";
  let evChargeWindowMessage = "";
  let batteryChargeWindowMessage = "";

  const cheapTariffs = tariffPeriods.filter(p => p.isCheap).sort((a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
  const expensiveTariffs = tariffPeriods.filter(p => !p.isCheap);


  const hoursInDay = 24;
  const startHour = adviceType === 'today' ? currentHour : 0; // For overnight, plan from midnight
  const endHourPlanning = adviceType === 'today' ? hoursInDay : hoursInDay; // Today plans till end of today, overnight plans for full next day


  let remainingEVChargeKWh = evNeeds.chargeRequiredKWh;
  let evChargedThisCycle = 0;

  // Simulate energy flow hour by hour
  for (let hourOffset = 0; hourOffset < endHourPlanning; hourOffset++) {
    const actualHour = (startHour + hourOffset) % hoursInDay;
    const isNextDay = (startHour + hourOffset) >= hoursInDay; // Relevant for overnight planning crossing midnight
    const dayLabel = isNextDay ? " (Tomorrow)" : "";

    const solarGenerationThisHour = forecast.hourlyForecast.find(h => parseInt(h.time.split(':')[0]) === actualHour)?.estimatedGenerationWh / 1000 || 0;
    const consumptionThisHour = hourlyConsumptionProfile[actualHour] || 0;

    let netEnergyThisHour = solarGenerationThisHour - consumptionThisHour;
    simulatedBatteryKWh += netEnergyThisHour;
    simulatedBatteryKWh = Math.max(0, Math.min(batteryCapacity, simulatedBatteryKWh));


    // EV Charging Logic (prioritized during cheap tariff if possible, or to meet deadline)
    if (remainingEVChargeKWh > 0 && actualHour < evNeeds.chargeByHour) {
        const isCheapHourForEV = cheapTariffs.some(p => isHourInPeriod(actualHour, p));
        let canChargeEVFromGrid = false;
        let evChargeRate = evNeeds.maxChargeRateKWh;

        if (isCheapHourForEV) {
            canChargeEVFromGrid = true;
        } else if (actualHour >= evNeeds.chargeByHour - Math.ceil(remainingEVChargeKWh / evNeeds.maxChargeRateKWh)) {
            // Force charging if deadline approaching, even if not cheap
            canChargeEVFromGrid = true;
             if (!evRecommendation.includes("non-cheap")) evRecommendation += " EV charging may use non-cheap grid power to meet deadline.";
        }

        if (canChargeEVFromGrid) {
            const chargeAmountForEV = Math.min(remainingEVChargeKWh, evNeeds.maxChargeRateKWh);
            
            if (simulatedBatteryKWh >= chargeAmountForEV) {
                 simulatedBatteryKWh -= chargeAmountForEV;
                 remainingEVChargeKWh -= chargeAmountForEV;
                 evChargedThisCycle += chargeAmountForEV;
                 if (!evRecommendation.includes("battery/solar")) evRecommendation += " EV can charge from battery/solar.";
            } else { // Charge EV from grid
                const neededFromGridForEV = chargeAmountForEV - simulatedBatteryKWh;
                simulatedBatteryKWh = 0; // Battery used up for EV
                
                totalGridChargeForEV += neededFromGridForEV;
                remainingEVChargeKWh -= chargeAmountForEV; // Assumes grid makes up the full chargeAmountForEV
                evChargedThisCycle += chargeAmountForEV;

                const currentTariff = cheapTariffs.find(p => isHourInPeriod(actualHour, p)) || expensiveTariffs.find(p => isHourInPeriod(actualHour,p));
                chargeCostPence += neededFromGridForEV * (currentTariff?.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);
                if (!evChargeWindowMessage) evChargeWindowMessage = `Grid for EV from ${formatTime(actualHour*60)}${dayLabel}`;
                else if (!evChargeWindowMessage.includes(formatTime(actualHour*60))) {
                     // Only update end time or extend range
                }
                 if (!evRecommendation.includes("grid")) evRecommendation += " EV needs grid power.";
            }
        }
    }


    // Battery Charging Logic from Grid (only during cheap tariffs)
    if (simulatedBatteryKWh < targetBatteryLevelKWh && adviceType === 'overnight') {
      const cheapTariffForBattery = cheapTariffs.find(p => isHourInPeriod(actualHour, p));
      if (cheapTariffForBattery) {
        const potentialChargeToTarget = targetBatteryLevelKWh - simulatedBatteryKWh;
        const chargeAmountForBattery = Math.min(potentialChargeToTarget, settings.batteryMaxChargeRateKWh || batteryCapacity); // Assume max charge rate or full capacity if not set

        simulatedBatteryKWh += chargeAmountForBattery;
        simulatedBatteryKWh = Math.min(batteryCapacity, simulatedBatteryKWh); // Cap at battery capacity
        totalGridChargeNeededForBattery += chargeAmountForBattery;
        chargeCostPence += chargeAmountForBattery * (cheapTariffForBattery.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);

        if (!batteryChargeWindowMessage) batteryChargeWindowMessage = `Battery grid charge from ${formatTime(actualHour*60)}${dayLabel}`;
        else if (!batteryChargeWindowMessage.includes(formatTime(actualHour*60))) {
            // Extend existing window logic can be complex; for now, just mark start
        }
      }
    }
  } // End of hourly simulation loop


  let finalReason = "";
  let recommendChargeNow = false;
  let recommendChargeLater = false;

  if (adviceType === 'today') {
    const currentCheapTariff = cheapTariffs.find(p => isHourInPeriod(currentHour, p));
    if (currentCheapTariff && currentBatteryLevelKWh < (batteryCapacity * 0.5) && forecast.dailyTotalGenerationKWh < (hourlyConsumptionProfile.reduce((a,b)=>a+b,0) * 0.5) ) {
        finalReason = `Battery is low (${(currentBatteryLevelKWh/batteryCapacity*100).toFixed(0)}%) and a cheap tariff ('${currentCheapTariff.name}') is available at ${currentCheapTariff.startTime}-${currentCheapTariff.endTime}. Solar forecast is modest. Consider charging.`;
        recommendChargeNow = true;
        totalGridChargeNeededForBattery = Math.max(0, (batteryCapacity * 0.7) - currentBatteryLevelKWh); // Suggest charging to 70%
        batteryChargeWindowMessage = `${currentCheapTariff.startTime} - ${currentCheapTariff.endTime}`;
    } else if (currentBatteryLevelKWh < (batteryCapacity * 0.2)) {
        finalReason = `Battery is very low (${(currentBatteryLevelKWh/batteryCapacity*100).toFixed(0)}%). Consider charging if a cheap tariff becomes available or if essential.`;
        recommendChargeLater = true; // Not now, but be ready
    } else {
        finalReason = "Battery level seems okay for now. Rely on solar and current battery charge primarily.";
    }
     if (evNeeds.chargeRequiredKWh > 0 && evChargedThisCycle < evNeeds.chargeRequiredKWh) {
        evRecommendation = `EV still needs ${(evNeeds.chargeRequiredKWh - evChargedThisCycle).toFixed(1)} kWh. ${evRecommendation || "Monitor cheap tariffs or charge before deadline."}`;
     } else if (evNeeds.chargeRequiredKWh > 0) {
        evRecommendation = `EV charging needs met. ${evRecommendation || ""}`;
     }


  } else { // Overnight advice
    if (totalGridChargeNeededForBattery > 0 || totalGridChargeForEV > 0) {
        finalReason = `Grid charging recommended overnight to reach ${preferredOvernightBatteryChargePercent}% target${totalGridChargeForEV > 0 ? " and meet EV needs" : ""}.`;
        recommendChargeLater = true; // For "overnight" this means plan to charge later
        adviceDetails = "This utilizes cheap overnight tariffs.";
         if(totalGridChargeForEV > 0 && !evRecommendation.includes("grid")){
            evRecommendation = `EV needs ${totalGridChargeForEV.toFixed(1)} kWh from grid. ${evRecommendation || "This will be prioritized during overnight charge." }`;
        }
    } else if (simulatedBatteryKWh >= targetBatteryLevelKWh && (evNeeds.chargeRequiredKWh === 0 || evChargedThisCycle >= evNeeds.chargeRequiredKWh )) {
        finalReason = "Sufficient solar forecasted and/or battery level adequate. No overnight grid charging needed for battery or EV.";
    } else {
        finalReason = "Consider relying on solar and current battery. Overnight grid charging may not be essential based on forecast and preferred target.";
         if (evNeeds.chargeRequiredKWh > 0 && evChargedThisCycle < evNeeds.chargeRequiredKWh) {
            evRecommendation = `EV still needs ${(evNeeds.chargeRequiredKWh - evChargedThisCycle).toFixed(1)} kWh. ${evRecommendation || "Ensure charging before deadline. May require non-cheap grid if not covered by cheap tariffs." }`;
        }
    }
  }
  
  // Consolidate charge window messages
  let finalChargeWindow = "";
  if (batteryChargeWindowMessage) finalChargeWindow += batteryChargeWindowMessage;
  if (evChargeWindowMessage) {
    if (finalChargeWindow) finalChargeWindow += " & " + evChargeWindowMessage;
    else finalChargeWindow = evChargeWindowMessage;
  }
  // A more sophisticated merging of overlapping windows would be ideal here.
  // For now, this just concatenates if both exist.
  // A simple fix for overnight to show the range if only one type of charging happened in a cheap window:
  if(adviceType === 'overnight' && (totalGridChargeForEV > 0 || totalGridChargeNeededForBattery > 0) && cheapTariffs.length > 0){
      const firstCheap = cheapTariffs[0]; // Simplistic: assumes one main cheap window for overnight
      const nextDayLabel = " (Tomorrow)"; // Consistent with planning for "tomorrow"
      let endDayLabel = nextDayLabel;
      if(parseTime(firstCheap.startTime) > parseTime(firstCheap.endTime)) endDayLabel = " (Day After Tom.)";


      if(totalGridChargeNeededForBattery > 0 && totalGridChargeForEV === 0) {
         batteryChargeWindowMessage = `${firstCheap.startTime}${nextDayLabel} - ${firstCheap.endTime}${endDayLabel}`;
         finalChargeWindow = batteryChargeWindowMessage;
      } else if (totalGridChargeForEV > 0 && totalGridChargeNeededForBattery === 0) {
         evChargeWindowMessage = `${firstCheap.startTime}${nextDayLabel} - ${firstCheap.endTime}${endDayLabel}`;
         finalChargeWindow = evChargeWindowMessage;
      } else if (totalGridChargeForEV > 0 && totalGridChargeNeededForBattery > 0){
         // Both are charging, use the overall cheap window as the combined window
         finalChargeWindow = `${firstCheap.startTime}${nextDayLabel} - ${firstCheap.endTime}${endDayLabel}`;
         batteryChargeWindowMessage = finalChargeWindow; // align battery window
         evChargeWindowMessage = finalChargeWindow; // align EV window
      }
  }


  const potentialSolarSavings = Math.max(0, forecast.dailyTotalGenerationKWh - hourlyConsumptionProfile.reduce((a, b) => a + b, 0) + (currentBatteryLevelKWh - targetBatteryLevelKWh));


  return {
    recommendChargeNow: recommendChargeNow,
    recommendChargeLater: recommendChargeLater,
    reason: finalReason,
    details: adviceDetails,
    chargeNeededKWh: parseFloat((totalGridChargeNeededForBattery).toFixed(1)),
    chargeWindow: finalChargeWindow || undefined,
    potentialSavingsKWh: parseFloat(potentialSolarSavings.toFixed(1)),
    evRecommendation: evRecommendation || undefined,
    evChargeWindow: evChargeWindowMessage && totalGridChargeForEV > 0 ? evChargeWindowMessage : undefined,
    chargeCostPence: parseFloat(chargeCostPence.toFixed(2)),
  };
}

    