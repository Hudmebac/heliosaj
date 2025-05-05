// This file will contain functions for generating energy charging advice.

export type AdviceResult = {
  chargeNow: boolean;
  reason: string;
  estimatedChargeTime: string;
};

export default function getChargingAdvice(
  forecast: any,
  settings: any
): AdviceResult | null {
  return null;
}
