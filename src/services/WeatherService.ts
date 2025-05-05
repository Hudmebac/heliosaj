export type WeatherCondition = {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
};

export type WeatherForecast = {
  date: string;
  temperature: number;
  condition: WeatherCondition;
  precipitation: number;
};

export abstract class WeatherService {
  abstract getWeatherForecast(location: string): Promise<WeatherForecast[] | null>;
  abstract getCurrentWeather(location: string): Promise<WeatherCondition | null>;
}