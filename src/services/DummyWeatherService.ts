import { WeatherService, WeatherForecast, WeatherCondition } from './WeatherService';

class DummyWeatherService extends WeatherService {
    async getWeatherForecast(location: string): Promise<WeatherForecast[] | null> {
        return [
            { date: '2024-07-25', temperature: 25, condition: { condition: 'sunny' }, precipitation: 0 },
            { date: '2024-07-26', temperature: 22, condition: { condition: 'rainy' }, precipitation: 10 }
        ];
    }

    async getCurrentWeather(location: string): Promise<WeatherCondition | null> {
        return { condition: 'cloudy' };
    }
}

export default DummyWeatherService;