import axios from 'axios';

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
  abstract getWeatherForecast(
    location: string,
    units: 'celsius' | 'fahrenheit'
  ): Promise<WeatherForecast[] | null>;
  abstract getCurrentDayWeather(
    location: string,
    units: 'celsius' | 'fahrenheit'
  ): Promise<WeatherForecast | null>;
}

export class OpenMeteoWeatherService extends WeatherService {
  private readonly BASE_URL = 'https://api.open-meteo.com/v1/forecast';

  async getWeatherForecast(location: string, units: 'celsius' | 'fahrenheit'): Promise<WeatherForecast[] | null> {
    try {
      const response = await axios.get(this.BASE_URL, {
        params: {
          latitude: location.split(',')[0],
          longitude: location.split(',')[1],
          daily: ['weathercode', 'temperature_2m_max', 'precipitation_sum'],
          temperature_unit: units,
          timezone: 'auto',
        },
      });
      return []; //TODO implement parsing response
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return null;
    }
  }

  async getCurrentDayWeather(location: string, units: 'celsius' | 'fahrenheit'): Promise<WeatherForecast | null> {
    try {
        const weatherForecast = await this.getWeatherForecast(location, units);
        if(weatherForecast) {
            return weatherForecast[0];
        }
        return null;
    } catch (error) {
        console.error('Error fetching current day weather:', error);
        return null;
    }
  }
}