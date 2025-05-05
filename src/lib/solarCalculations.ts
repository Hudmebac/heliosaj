/**
 * This file will contain functions related to solar energy calculations.
 */

type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

type CalculatedForecast = {
    date: string;
    dailyTotalGenerationKWh: number;
    hourlyForecast: {
        time: string;
        estimatedGenerationWh: number;
    }[];
    weatherCondition: WeatherCondition;
};

function calculateSolarGeneration(weather: any, settings: any): CalculatedForecast | null {
    if (!weather || !settings) return null;

    // Dummy data for demonstration purposes
    const estimatedHourlyGeneration = [
        { time: '08:00', estimatedGenerationWh: 100 },
        { time: '09:00', estimatedGenerationWh: 300 },
        { time: '10:00', estimatedGenerationWh: 500 },
        { time: '11:00', estimatedGenerationWh: 700 },
        { time: '12:00', estimatedGenerationWh: 800 },
        { time: '13:00', estimatedGenerationWh: 750 },
        { time: '14:00', estimatedGenerationWh: 600 },
        { time: '15:00', estimatedGenerationWh: 400 },
        { time: '16:00', estimatedGenerationWh: 200 },
        { time: '17:00', estimatedGenerationWh: 50 }
    ];

    // Calculate daily total generation
    const dailyTotalGenerationWh = estimatedHourlyGeneration.reduce((acc, curr) => acc + curr.estimatedGenerationWh, 0);
    const dailyTotalGenerationKWh = dailyTotalGenerationWh / 1000;

    return {
        date: weather.date || '2024-01-01',
        dailyTotalGenerationKWh,
        hourlyForecast: estimatedHourlyGeneration,
        weatherCondition: weather.weatherCondition || 'sunny'
    };
}

export type { CalculatedForecast };
export default calculateSolarGeneration;
