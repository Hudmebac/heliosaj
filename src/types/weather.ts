export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
}

// Based on Open-Meteo WMO Weather interpretation codes
export const WMO_CODE_MAP: WeatherConditionCodes = {
  0: 'Sunny', // Clear sky
  1: 'Mainly Sunny', // Mainly clear
  2: 'Partly Cloudy', // Partly cloudy
  3: 'Cloudy', // Overcast
  45: 'Fog',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snowfall',
  73: 'Moderate Snowfall',
  75: 'Heavy Snowfall',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm', // Slight or moderate
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
};

export type SimplifiedWeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy' | 'fog' | 'snow';

export const mapWmoCodeToSimplifiedCondition = (wmoCode: number | undefined | null): SimplifiedWeatherCondition => {
  if (wmoCode === undefined || wmoCode === null) return 'sunny'; // Default or handle as unknown

  const code = Number(wmoCode);

  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy'; // Drizzle, Rain, Showers
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'; // Snowfall, Snow Grains, Snow Showers
  if (code >= 95 && code <= 99) return 'rainy'; // Thunderstorm, often with rain

  return 'cloudy'; // Default for unmapped codes like some types of fog if not explicitly handled
};


export interface WeatherConditionCodes {
  [code: number]: string;
}

export interface CurrentWeather {
  time: string; // ISO string for consistency
  temperature_2m?: number;
  apparent_temperature?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  weather_code?: number;
  cloud_cover?: number; // Percentage
  is_day?: number; // 1 for day, 0 for night
  wind_speed_10m?: number;
  // Solar radiation from nearest hour
  shortwave_radiation?: number;
  direct_normal_irradiance?: number;
  weatherConditionString?: string; // Mapped from WMO code
}

export interface HourlyWeather {
  time: string; // ISO string for consistency
  temperature_2m?: number;
  apparent_temperature?: number;
  precipitation_probability?: number; // This might not be available in UKMO, use precipitation
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  cloud_cover?: number;
  shortwave_radiation?: number;
  direct_normal_irradiance?: number;
  weatherConditionString?: string; // Mapped from WMO code
}

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  weather_code?: number;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
  sunrise?: string; // ISO string
  sunset?: string; // ISO string
  precipitation_sum?: number;
  precipitation_probability_max?: number; // This might need to be derived or use precipitation_hours
  precipitation_hours?: number;
  shortwave_radiation_sum?: number;
  weatherConditionString?: string; // Mapped from WMO code
  // For direct display from API if needed
  daylight_duration?: number;
  sunshine_duration?: number;
  uv_index_max?: number;
  uv_index_clear_sky_max?: number;
  hourly: HourlyWeather[]; // All hourly data for this specific day
}

export interface WeatherForecast {
  location: Location;
  currentConditions?: CurrentWeather;
  todayForecast: DailyWeather | null;
  tomorrowForecast: DailyWeather | null;
  weeklyForecast: DailyWeather[]; // Array of 7 days, including today
}

// This will be used by solar-calculations and advisory pages for the simplified condition
export type ManualForecastCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';

export const mapWmoCodeToManualForecastCondition = (wmoCode: number | undefined | null): ManualForecastCondition => {
  if (wmoCode === undefined || wmoCode === null) return 'sunny';
  const code = Number(wmoCode);

  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'overcast'; // Fog is heavily overcast
  if ((code >= 51 && code <= 69) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rainy'; // Drizzle, Rain, Showers, Thunderstorm
  if (code >= 70 && code <= 79) return 'rainy'; // Snow related, treat as significantly impacting solar (like rain) for simplicity

  return 'cloudy'; // Default for other unmapped codes
};
