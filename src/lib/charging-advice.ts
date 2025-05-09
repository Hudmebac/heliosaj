import type { UserSettings, TariffPeriod } from '@/types/settings';
import type { CalculatedForecast } from './solar-calculations';

export interface EVNeeds {
  chargeRequiredKWh: number;
  chargeByHour: number; 
  maxChargeRateKWh: number; 
}

export interface ChargingAdviceParams {
  forecast: CalculatedForecast; 
  settings: UserSettings;
  tariffPeriods: TariffPeriod[];
  currentBatteryLevelKWh: number;
  hourlyConsumptionProfile: number[]; 
  currentHour: number; 
  evNeeds: EVNeeds;
  adviceType: 'today' | 'overnight'; 
  preferredOvernightBatteryChargePercent: number; 
}

export interface ChargingAdvice {
  recommendChargeNow: boolean; 
  recommendChargeLater: boolean; 
  reason: string; 
  details?: string; 
  chargeNeededKWh?: number; 
  chargeWindow?: string; 
  potentialSavingsKWh?: number; 
  evRecommendation?: string; 
  evChargeWindow?: string; 
  chargeCostPence?: number; 
}

const PRICE_CAP_DEFAULT_RATE_PENCE = 28.62; 

const parseTime = (timeStr: string): number => {
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }
  console.error("Invalid time format for parseTime:", timeStr);
  return NaN;
};

const formatTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

function isHourInPeriod(hour: number, period: TariffPeriod): boolean {
  const periodStartMinutes = parseTime(period.startTime);
  const periodEndMinutes = parseTime(period.endTime);

  if (isNaN(periodStartMinutes) || isNaN(periodEndMinutes)) return false;

  const currentHourStartMinutes = hour * 60;

  if (periodStartMinutes <= periodEndMinutes) { 
    return currentHourStartMinutes >= periodStartMinutes && currentHourStartMinutes < periodEndMinutes;
  } else { 
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
  const batteryMaxChargeRate = settings.batteryMaxChargeRateKWh || batteryCapacity; 
  const targetBatterySOC = preferredOvernightBatteryChargePercent / 100;
  const targetBatteryLevelKWh = batteryCapacity * targetBatterySOC;

  let simulatedBatteryKWh = currentBatteryLevelKWh;
  let totalGridChargeForBatteryKWh = 0;
  let totalGridChargeForEVKWh = 0;
  let totalChargeCostPence = 0;
  
  let batteryChargeWindowParts: string[] = [];
  let evChargeWindowParts: string[] = [];

  const cheapTariffs = tariffPeriods.filter(p => p.isCheap).sort((a,b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
  const nonCheapTariffs = tariffPeriods.filter(p => !p.isCheap);
  
  const planningStartHour = adviceType === 'today' ? currentHour : 0;
  const planningEndHour = 24; // Simulate through the end of the relevant day (today or tomorrow)

  let remainingEVChargeKWh = evNeeds.chargeRequiredKWh;
  let evChargeDeadlineHour = evNeeds.chargeByHour;
  if (adviceType === 'overnight' && evNeeds.chargeByHour <= 6) { // If EV needed early next morning for overnight plan
    evChargeDeadlineHour += 24;
  }
  
  for (let hourOffset = 0; hourOffset < (planningEndHour - planningStartHour); hourOffset++) {
    const hour = (planningStartHour + hourOffset) % 24;
    const absoluteHourInPlanning = planningStartHour + hourOffset; 

    const solarThisHour = forecast.hourlyForecast.find(h => parseInt(h.time.split(':')[0]) === hour)?.estimatedGenerationWh / 1000 || 0;
    const consumptionThisHour = hourlyConsumptionProfile[hour] || 0;
    
    let netEnergy = solarThisHour - consumptionThisHour;
    
    // 1. Attempt to meet EV demand from solar or battery
    if (remainingEVChargeKWh > 0 && absoluteHourInPlanning < evChargeDeadlineHour) {
      const evChargeThisHourMax = Math.min(remainingEVChargeKWh, evNeeds.maxChargeRateKWh);
      let chargedFromSolarOrBattery = 0;

      if (netEnergy >= evChargeThisHourMax) { // Solar covers EV + potentially some consumption
        chargedFromSolarOrBattery = evChargeThisHourMax;
        netEnergy -= evChargeThisHourMax; 
      } else if (netEnergy > 0) { // Solar covers some EV
        chargedFromSolarOrBattery = netEnergy;
        netEnergy = 0;
      }
      
      if (chargedFromSolarOrBattery < evChargeThisHourMax) { // Need more for EV, try battery
          const neededFromBatteryForEV = evChargeThisHourMax - chargedFromSolarOrBattery;
          const chargeFromBatteryForEV = Math.min(neededFromBatteryForEV, simulatedBatteryKWh);
          simulatedBatteryKWh -= chargeFromBatteryForEV;
          chargedFromSolarOrBattery += chargeFromBatteryForEV;
      }
      remainingEVChargeKWh -= chargedFromSolarOrBattery;
    }
    
    // 2. Update battery with remaining net energy (solar - consumption)
    simulatedBatteryKWh += netEnergy; // netEnergy can be negative (discharging for consumption)
    simulatedBatteryKWh = Math.max(0, Math.min(batteryCapacity, simulatedBatteryKWh));

    // 3. Grid charging for EV (only during cheap tariffs or if forced by deadline)
    if (remainingEVChargeKWh > 0 && absoluteHourInPlanning < evChargeDeadlineHour) {
        const isCheapEVHour = cheapTariffs.find(p => isHourInPeriod(hour, p));
        const hoursToDeadline = evChargeDeadlineHour - absoluteHourInPlanning;
        const forceEVCharge = hoursToDeadline > 0 && (remainingEVChargeKWh / evNeeds.maxChargeRateKWh) >= hoursToDeadline;

        if (isCheapEVHour || (forceEVCharge && adviceType === 'overnight' && !isCheapEVHour)) {
            const chargeFromGridForEV = Math.min(remainingEVChargeKWh, evNeeds.maxChargeRateKWh);
            totalGridChargeForEVKWh += chargeFromGridForEV;
            remainingEVChargeKWh -= chargeFromGridForEV;
            totalChargeCostPence += chargeFromGridForEV * (isCheapEVHour?.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);
            
            let dayLabel = "";
            if (adviceType === 'overnight') {
                if (absoluteHourInPlanning >= 24) dayLabel = " (Day After Tom.)";
                else if (hour < planningStartHour || hour >= 0 && hour <= 6) dayLabel = " (Tomorrow)"; // Overnight charging usually for next morning
            }
            evChargeWindowParts.push(`${formatTime(hour*60)}${dayLabel}`);
        }
    }

    // 4. Grid charging for Battery (only during cheap tariffs and if below target)
    if (simulatedBatteryKWh < targetBatteryLevelKWh) {
        const isCheapBatteryHour = cheapTariffs.find(p => isHourInPeriod(hour, p));
        if (isCheapBatteryHour) {
            const neededForBatteryTarget = targetBatteryLevelKWh - simulatedBatteryKWh;
            const canChargeThisHour = Math.min(batteryMaxChargeRate, batteryCapacity - simulatedBatteryKWh);
            const chargeFromGridForBattery = Math.min(neededForBatteryTarget, canChargeThisHour);
            
            if (chargeFromGridForBattery > 0) {
                simulatedBatteryKWh += chargeFromGridForBattery;
                totalGridChargeForBatteryKWh += chargeFromGridForBattery;
                totalChargeCostPence += chargeFromGridForBattery * (isCheapBatteryHour.rate ?? PRICE_CAP_DEFAULT_RATE_PENCE);

                let dayLabel = "";
                 if (adviceType === 'overnight') {
                    if (absoluteHourInPlanning >= 24) dayLabel = " (Day After Tom.)";
                    else if (hour < planningStartHour || hour >= 0 && hour <= 6) dayLabel = " (Tomorrow)";
                 }
                batteryChargeWindowParts.push(`${formatTime(hour*60)}${dayLabel}`);
            }
        }
    }
  }

  const formatWindow = (parts: string[]): string | undefined => {
    if (!parts || parts.length === 0) return undefined;
    
    parts.sort((a, b) => {
        const timeValA = parseTime(a);
        const timeValB = parseTime(b);
        if (isNaN(timeValA) && isNaN(timeValB)) return 0;
        if (isNaN(timeValA)) return 1;
        if (isNaN(timeValB)) return -1;
        return timeValA - timeValB;
    });

    const validTimeParts = parts.filter(t => !isNaN(parseTime(t)));
    if (validTimeParts.length === 0) return undefined;

    const uniqueTimes = [...new Set(validTimeParts)]; 

    const startTimeStr = uniqueTimes[0];
    const lastChargeStartHourStr = uniqueTimes[uniqueTimes.length - 1];

    const lastChargeStartMinutes = parseTime(lastChargeStartHourStr);
    if (isNaN(lastChargeStartMinutes)) {
        console.error("formatWindow: Could not parse last charge start time from:", lastChargeStartHourStr);
        return `${startTimeStr} - Error`; // Should not happen with filtering
    }

    const chargeEndMinutes = lastChargeStartMinutes + 60; 

    let endDayLabel = "";
    const lastChargeStartLabelMatch = lastChargeStartHourStr.match(/\((.*?)\)/);
    if (lastChargeStartLabelMatch) {
        endDayLabel = ` (${lastChargeStartLabelMatch[1]})`;
    }
    
    if (chargeEndMinutes >= 24 * 60) { // Crossed midnight from the perspective of the *last charging hour's day label*
        if (endDayLabel.includes("Tomorrow")) {
            endDayLabel = " (Day After Tom.)";
        } else if (!endDayLabel.includes("Day After Tom.")) { 
            endDayLabel = " (Tomorrow)";
        }
    }
    
    const formattedEndTime = formatTime(chargeEndMinutes % (24*60));

    // If start and end time are effectively the same hour block but just different labels due to spanning midnight.
    if (uniqueTimes.length === 1 && startTimeStr.split(' ')[0] === formattedEndTime && startTimeStr !== `${formattedEndTime}${endDayLabel}`) {
      return `${startTimeStr} to ${formattedEndTime}${endDayLabel}`;
    }
    if (uniqueTimes.length === 1) {
      return `${startTimeStr} - ${formattedEndTime}${endDayLabel}`;
    }

    return `${startTimeStr} - ${formattedEndTime}${endDayLabel}`;
  };

  const finalBatteryChargeWindow = formatWindow(batteryChargeWindowParts);
  const finalEVChargeWindow = formatWindow(evChargeWindowParts);
  
  let reason = "";
  let recommendNow = false;
  let recommendLater = false;
  let detailsMsg = "";
  let finalEVRecommendation = "";

  const currentBatteryPercentage = (currentBatteryLevelKWh / batteryCapacity * 100).toFixed(0);

  if (adviceType === 'today') {
      const currentCheapTariff = cheapTariffs.find(p => isHourInPeriod(currentHour,p));
      const batteryNeedsImmediateTopUp = currentBatteryLevelKWh < (targetBatteryLevelKWh * 0.5) && currentBatteryLevelKWh < (batteryCapacity * 0.7); // e.g. below 50% of target AND below 70% total

      if (currentCheapTariff && batteryNeedsImmediateTopUp) {
          reason = `Battery is at ${currentBatteryPercentage}%. A cheap tariff ('${currentCheapTariff.name}') is available from ${currentCheapTariff.startTime} to ${currentCheapTariff.endTime}. Consider topping up.`;
          recommendNow = true;
          totalGridChargeForBatteryKWh = Math.max(0, targetBatteryLevelKWh - currentBatteryLevelKWh); 
          // For 'today', window is just the current cheap period if applicable
          batteryChargeWindowParts = [`${formatTime(currentHour*60)} - ${currentCheapTariff.endTime}`];
      } else {
          // Check if battery is low and if non-cheap period is active, advise to wait for cheap or use solar
          const activeNonCheap = nonCheapTariffs.find(p => isHourInPeriod(currentHour,p));
          if (currentBatteryLevelKWh < (batteryCapacity * 0.3) && activeNonCheap) {
              reason = `Battery is very low (${currentBatteryPercentage}%). Currently in a standard/peak tariff period. Rely on solar if possible, or charge during the next cheap period.`;
              recommendLater = true; // Implies waiting for cheap tariff
          } else if (currentBatteryLevelKWh < (batteryCapacity * 0.3)) {
              reason = `Battery is very low (${currentBatteryPercentage}%). Prioritize charging from solar or during the next available cheap tariff.`;
              recommendLater = true;
          } else {
              reason = "Battery level appears sufficient for now. Rely on solar and current charge.";
          }
      }

      // EV for today
      if (evNeeds.chargeRequiredKWh > 0) {
          if (totalGridChargeForEVKWh > 0 && finalEVChargeWindow) {
              finalEVRecommendation = `EV requires ${evNeeds.chargeRequiredKWh.toFixed(1)} kWh. Suggest charging from grid during ${finalEVChargeWindow}.`;
              if (isHourInPeriod(currentHour, cheapTariffs.find(p => p && isHourInPeriod(currentHour,p))! )) recommendNow = true; else recommendLater = true;
          } else if (remainingEVChargeKWh <= 0 && evNeeds.chargeRequiredKWh > 0) { // Check if original need was > 0
              finalEVRecommendation = "EV charging needs are expected to be met by solar/battery based on today's forecast.";
          } else if (remainingEVChargeKWh > 0) {
              finalEVRecommendation = `EV still requires ${remainingEVChargeKWh.toFixed(1)} kWh. Charge before ${formatTime(evNeeds.chargeByHour*60)}. Consider solar or next cheap tariff.`;
              recommendLater = true;
          }
      }

  } else { // Overnight advice
      if (totalGridChargeForBatteryKWh > 0 || totalGridChargeForEVKWh > 0) {
          reason = `Grid charging is recommended overnight.`;
          if (totalGridChargeForBatteryKWh > 0) reason += ` Battery needs ~${totalGridChargeForBatteryKWh.toFixed(1)}kWh to reach ${preferredOvernightBatteryChargePercent}% target.`;
          if (totalGridChargeForEVKWh > 0 && remainingEVChargeKWh < evNeeds.chargeRequiredKWh) { // If some EV grid charge happened
            reason += ` EV needs ~${totalGridChargeForEVKWh.toFixed(1)}kWh from grid.`;
          } else if (remainingEVChargeKWh > 0 && evNeeds.chargeRequiredKWh > 0) { // If EV still needs charge
            reason += ` EV still needs ~${remainingEVChargeKWh.toFixed(1)}kWh.`;
          }
          detailsMsg = "This utilizes forecasted cheap tariff periods.";
          recommendLater = true; // Overnight is always "later"
      } else {
          reason = "Sufficient solar/battery expected for tomorrow's needs. Overnight grid charging may not be essential.";
      }
      if (evNeeds.chargeRequiredKWh > 0) {
        if(totalGridChargeForEVKWh > 0 && finalEVChargeWindow) {
            finalEVRecommendation = `Charge EV with ${totalGridChargeForEVKWh.toFixed(1)}kWh from grid during ${finalEVChargeWindow}.`;
        } else if (remainingEVChargeKWh <= 0 && evNeeds.chargeRequiredKWh > 0) {
             finalEVRecommendation = "EV charging needs for tomorrow morning should be met by available solar/battery.";
        } else if (remainingEVChargeKWh > 0) { // If it still needs charge after simulation
             finalEVRecommendation = `EV still needs ${remainingEVChargeKWh.toFixed(1)}kWh by ${formatTime(evChargeDeadlineHour % (24*60))}. Ensure charging if solar is insufficient.`;
        }
      }
  }
  
  // Calculate potential net solar after household consumption
  let netSolarAfterConsumption = 0;
  for(let i=0; i<24; i++){
      const solar = forecast.hourlyForecast.find(h => parseInt(h.time.split(':')[0]) === i)?.estimatedGenerationWh / 1000 || 0;
      const consumption = hourlyConsumptionProfile[i] || 0;
      netSolarAfterConsumption += (solar - consumption);
  }
  const potentialSolarSavings = Math.max(0, netSolarAfterConsumption);


  return {
    recommendChargeNow: recommendNow,
    recommendChargeLater: recommendLater,
    reason: reason,
    details: detailsMsg || undefined,
    chargeNeededKWh: totalGridChargeForBatteryKWh > 0.01 ? parseFloat(totalGridChargeForBatteryKWh.toFixed(2)) : undefined,
    chargeWindow: totalGridChargeForBatteryKWh > 0.01 ? finalBatteryChargeWindow : undefined,
    potentialSavingsKWh: potentialSolarSavings > 0.01 ? parseFloat(potentialSolarSavings.toFixed(2)) : undefined,
    evRecommendation: finalEVRecommendation || undefined,
    evChargeWindow: totalGridChargeForEVKWh > 0.01 ? finalEVChargeWindow : undefined,
    chargeCostPence: totalChargeCostPence > 0.01 ? parseFloat(totalChargeCostPence.toFixed(2)) : undefined,
  };
}
