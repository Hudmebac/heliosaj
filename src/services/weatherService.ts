
'use client';

import type { UserSettings } from '@/types/settings';
import type { WeatherForecast, CurrentWeather, HourlyWeather, DailyWeather, Location, WeatherConditionCodes } from '@/types/weather';
import { WMO_CODE_MAP } from '@/types/weather';
import { fetchWeatherApi } from 'openmeteo';
import { format, parseISO, startOfHour, isEqual, addHours } from 'date-fns';

export { type Location }; // Re-export Location if needed elsewhere

export class OpenMeteoWeatherService {
  private apiUrl = "https://api.open-meteo.com/v1/forecast"; // Using general forecast endpoint

  async getWeatherForecast(location: Location, userSettings: UserSettings): Promise<WeatherForecast> {
    if (!location?.latitude || !location?.longitude) {
      throw new Error("Latitude and longitude are required for weather forecast.");
    }

    const params = {
      latitude: location.latitude,
      longitude: location.longitude,
      hourly: [
        "temperature_2m",
        "apparent_temperature",
        "precipitation", // Changed from precipitation_probability for more directness
        "weather_code",
        "wind_speed_10m",
        "cloud_cover",
        "shortwave_radiation",
        "direct_normal_irradiance"
      ].join(','),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "sunrise",
        "sunset",
        "precipitation_sum",
        "precipitation_hours",
        "shortwave_radiation_sum",
        "daylight_duration",
        "sunshine_duration",
        "uv_index_max",
        "uv_index_clear_sky_max"
      ].join(','),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "snowfall",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m"
      ].join(','),
      timezone: "auto",
      forecast_days: 7,
    };

    try {
      const responses = await fetchWeatherApi(this.apiUrl, params);
      const response = responses[0];

      if (!response) {
        throw new Error("No weather data received from the API.");
      }

      const utcOffsetSeconds = response.utcOffsetSeconds() ?? 0;
      const now = new Date();
      const currentClientHourStart = startOfHour(now);

      // Process Current Weather
      const apiCurrent = response.current();
      let currentConditions: CurrentWeather | undefined = undefined;
      if (apiCurrent) {
        currentConditions = {
          time: new Date((Number(apiCurrent.time()) + utcOffsetSeconds) * 1000).toISOString(),
          temperature_2m: apiCurrent.variables(0)?.value(),
          apparent_temperature: apiCurrent.variables(1)?.value(),
          is_day: apiCurrent.variables(2)?.value(),
          precipitation: apiCurrent.variables(3)?.value(),
          rain: apiCurrent.variables(4)?.value(),
          showers: apiCurrent.variables(5)?.value(),
          snowfall: apiCurrent.variables(6)?.value(),
          weather_code: apiCurrent.variables(7)?.value(),
          cloud_cover: apiCurrent.variables(8)?.value(),
          wind_speed_10m: apiCurrent.variables(9)?.value(),
          weatherConditionString: WMO_CODE_MAP[apiCurrent.variables(7)?.value() as number] || "Unknown",
        };
      } else {
        console.warn("Current weather data not available from API.");
      }

      // Process Hourly Weather
      const apiHourly = response.hourly();
      let hourlyData: HourlyWeather[] = [];

      if (apiHourly) {
        const hourlyTimeArray = Array.from(
          { length: (apiHourly.timeEnd()! - apiHourly.time()!) / apiHourly.interval!() },
          (_, i) => new Date((apiHourly.time()! + i * apiHourly.interval!() + utcOffsetSeconds) * 1000)
        );

        hourlyData = hourlyTimeArray.map((time, i) => ({
          time: time.toISOString(),
          temperature_2m: apiHourly.variables(0)!.valuesArray()![i],
          apparent_temperature: apiHourly.variables(1)!.valuesArray()![i],
          precipitation: apiHourly.variables(2)!.valuesArray()![i], // precipitation
          weather_code: apiHourly.variables(3)!.valuesArray()![i],
          wind_speed_10m: apiHourly.variables(4)!.valuesArray()![i],
          cloud_cover: apiHourly.variables(5)!.valuesArray()![i],
          shortwave_radiation: apiHourly.variables(6)!.valuesArray()![i],
          direct_normal_irradiance: apiHourly.variables(7)!.valuesArray()![i],
          weatherConditionString: WMO_CODE_MAP[apiHourly.variables(3)!.valuesArray()![i] as number] || "Unknown",
        }));

        if (currentConditions) {
            const nearestHourlyEntry = hourlyData.find(h =>
                isEqual(startOfHour(parseISO(h.time)), currentClientHourStart) ||
                isEqual(startOfHour(parseISO(h.time)), addHours(currentClientHourStart, -1))
            );
            if (nearestHourlyEntry) {
              currentConditions.shortwave_radiation = nearestHourlyEntry.shortwave_radiation;
              currentConditions.direct_normal_irradiance = nearestHourlyEntry.direct_normal_irradiance;
            }
        }
      } else {
        console.warn("Hourly weather data not available from API.");
      }


      // Process Daily Weather
      const apiDaily = response.daily();
      let dailyForecasts: DailyWeather[] = [];

      if (apiDaily) {
        const dailyTimeArray = Array.from(
          { length: (apiDaily.timeEnd()! - apiDaily.time()!) / apiDaily.interval!() },
          (_, i) => new Date((apiDaily.time()! + i * apiDaily.interval!() + utcOffsetSeconds) * 1000)
        );

        dailyForecasts = dailyTimeArray.map((date, i) => {
          const dateString = format(date, 'yyyy-MM-dd');
          const dailyHourlyData = hourlyData.filter(h => format(parseISO(h.time), 'yyyy-MM-dd') === dateString);

          return {
            date: dateString,
            weather_code: apiDaily.variables(0)!.valuesArray()![i],
            temperature_2m_max: apiDaily.variables(1)!.valuesArray()![i],
            temperature_2m_min: apiDaily.variables(2)!.valuesArray()![i],
            sunrise: new Date((Number(apiDaily.variables(3)!.valuesArray()![i]) + utcOffsetSeconds) * 1000).toISOString(),
            sunset: new Date((Number(apiDaily.variables(4)!.valuesArray()![i]) + utcOffsetSeconds) * 1000).toISOString(),
            precipitation_sum: apiDaily.variables(5)!.valuesArray()![i],
            precipitation_hours: apiDaily.variables(6)!.valuesArray()![i],
            shortwave_radiation_sum: apiDaily.variables(7)!.valuesArray()![i],
            daylight_duration: apiDaily.variables(8)!.valuesArray()![i],
            sunshine_duration: apiDaily.variables(9)!.valuesArray()![i],
            uv_index_max: apiDaily.variables(10)!.valuesArray()![i],
            uv_index_clear_sky_max: apiDaily.variables(11)!.valuesArray()![i],
            weatherConditionString: WMO_CODE_MAP[apiDaily.variables(0)!.valuesArray()![i] as number] || "Unknown",
            hourly: dailyHourlyData,
          };
        });
      } else {
         console.warn("Daily weather data not available from API.");
      }


      const todayDateString = format(now, 'yyyy-MM-dd');
      const tomorrowDateString = format(addHours(now, 24), 'yyyy-MM-dd'); // Use addHours for tomorrow to be safe

      const todayForecast = dailyForecasts.find(d => d.date === todayDateString) || null;
      const tomorrowForecast = dailyForecasts.find(d => d.date === tomorrowDateString) || null;

      return {
        location: {
          latitude: response.latitude()!,
          longitude: response.longitude()!,
          city: location.city || 'Unknown',
        },
        currentConditions,
        todayForecast,
        tomorrowForecast,
        weeklyForecast: dailyForecasts, // This will be empty if apiDaily was null
      };

    } catch (error) {
      console.error("Open-Meteo API call failed:", error);
      if (error instanceof Error) {
        throw new Error(`Weather service (open-meteo) failed: ${error.message}`);
      }
      throw new Error("Weather service (open-meteo) failed with an unknown error.");
    }
  }
}
