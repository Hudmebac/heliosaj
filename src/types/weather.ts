export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
}

export interface WeatherConditionCodes {
  [code: number]: string;
}

// Based on Open-Meteo WMO Weather interpretation codes
export const WMO_CODE_MAP: WeatherConditionCodes = {
  0: 'Sunny', // Clear sky
  1: 'Mainly Sunny', // Mainly clear
  2: 'Partly Cloudy', // Partly cloudy
  3: 'Cloudy', // Overcast
  45: 'Cloudy+', // Fog changed to Cloudy+
  48: 'Cloudy+', // Depositing Rime Fog changed to Cloudy+
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

// This map is used internally for some calculations if specific WMO codes are not directly handled by a function.
// The primary source of text description for display should be WMO_CODE_MAP.
export const mapWmoCodeToSimplifiedCondition = (wmoCode: number | undefined | null): SimplifiedWeatherCondition => {
  if (wmoCode === undefined || wmoCode === null) return 'sunny'; 

  const code = Number(wmoCode);

  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy'; // Consistent with WMO_CODE_MAP if that has code 3 as "Cloudy"
  if (code === 45 || code === 48) return 'fog'; // Even if WMO_CODE_MAP changes, this can be a general category
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy'; 
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'; 
  if (code >= 95 && code <= 99) return 'rainy'; 

  return 'cloudy'; 
};


export interface CurrentWeather {
  time: string; 
  temperature_2m?: number;
  apparent_temperature?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  weather_code?: number;
  cloud_cover?: number; 
  is_day?: number; 
  wind_speed_10m?: number;
  shortwave_radiation?: number;
  direct_normal_irradiance?: number;
  weatherConditionString?: string; 
}

export interface HourlyWeather {
  time: string; 
  temperature_2m?: number;
  apparent_temperature?: number;
  precipitation_probability?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  cloud_cover?: number;
  shortwave_radiation?: number;
  direct_normal_irradiance?: number;
  weatherConditionString?: string; 
}

export interface DailyWeather {
  date: string; 
  weather_code?: number;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
  sunrise?: string; 
  sunset?: string; 
  precipitation_sum?: number;
  precipitation_probability_max?: number;
  precipitation_hours?: number;
  shortwave_radiation_sum?: number;
  weatherConditionString?: string; 
  daylight_duration?: number;
  sunshine_duration?: number;
  uv_index_max?: number;
  uv_index_clear_sky_max?: number;
  hourly: HourlyWeather[];
}

export interface WeatherForecast {
  location: Location;
  currentConditions?: CurrentWeather;
  todayForecast: DailyWeather | null;
  tomorrowForecast: DailyWeather | null;
  weeklyForecast: DailyWeather[];
}

export type ManualForecastCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';

export const mapWmoCodeToManualForecastCondition = (wmoCode: number | undefined | null): ManualForecastCondition => {
  if (wmoCode === undefined || wmoCode === null) return 'sunny';
  const code = Number(wmoCode);

  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly_cloudy';
  if (code === 3) return 'cloudy';
  // For manual forecast, Cloudy+ (which was Fog) should map to a heavy cloud condition like 'overcast' or 'cloudy'
  if (code === 45 || code === 48) return 'overcast'; 
  if ((code >= 51 && code <= 69) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rainy'; 
  if (code >= 70 && code <= 79) return 'rainy'; 

  return 'cloudy'; 
};
