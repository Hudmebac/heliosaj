export type WeatherCondition = {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
};

export type CalculatedForecast = {
  date: string;
  dailyTotalGenerationKWh: number;
  hourlyForecast: {
    time: string;
    estimatedGenerationWh: number;
  }[];
  weatherCondition: WeatherCondition;
};

export type AdviceResult = {
  chargeNow: boolean;
  reason: string;
  estimatedChargeTime: string;
};

export function calculateSolarGeneration(weather: any, settings: any): CalculatedForecast | null {
  return null
}

export function getChargingAdvice(forecast: any, settings: any): AdviceResult | null {
  return null;
}