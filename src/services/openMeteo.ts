/**
 * Open-Meteo API client for weather forecast data
 * PRD-004: Implement Open-Meteo API client for forecast data
 */

import type { WeatherData, WindDirection, WeatherCode, TimelinePoint } from '@/types/weather';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Open-Meteo API response types
 */
interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  visibility: number[];
  uv_index: number[];
  weather_code: number[];
}

interface OpenMeteoMinutely15Response {
  time: string[];
  precipitation: number[];
  precipitation_probability: number[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  hourly: OpenMeteoHourlyResponse;
  minutely_15?: OpenMeteoMinutely15Response;
}

/**
 * Forecast result containing both hourly and minutely data
 */
export interface ForecastResult {
  hourlyPoints: TimelinePoint[];
  minutelyPoints: TimelinePoint[];
  latitude: number;
  longitude: number;
  fetchedAt: string;
}

/**
 * Convert degrees to 16-point compass direction
 */
function degreesToDirection(degrees: number): WindDirection {
  const directions: WindDirection[] = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5) + 32);
}

/**
 * Convert km/h to mph
 */
function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Convert meters to miles
 */
function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 10) / 10;
}

/**
 * Validate and cast weather code to WeatherCode type
 */
function toWeatherCode(code: number): WeatherCode {
  const validCodes: WeatherCode[] = [
    0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
    71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99
  ];
  return validCodes.includes(code as WeatherCode) ? (code as WeatherCode) : 0;
}

/**
 * Transform hourly API data to TimelinePoint
 */
function transformHourlyData(hourly: OpenMeteoHourlyResponse, index: number): WeatherData {
  return {
    temperature: celsiusToFahrenheit(hourly.temperature_2m[index]),
    feelsLike: celsiusToFahrenheit(hourly.apparent_temperature[index]),
    precipitation: hourly.precipitation_probability[index] ?? 0,
    humidity: hourly.relative_humidity_2m[index],
    windSpeed: kmhToMph(hourly.wind_speed_10m[index]),
    windDirection: degreesToDirection(hourly.wind_direction_10m[index]),
    visibility: metersToMiles(hourly.visibility[index]),
    uvIndex: Math.round(hourly.uv_index[index]),
    weatherCode: toWeatherCode(hourly.weather_code[index]),
  };
}

/**
 * Fetch weather forecast from Open-Meteo API
 * Returns hourly data with past 8 hours and next 48 hours,
 * plus minutely_15 precipitation data for the next 2 hours
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns ForecastResult with hourly and minutely timeline points
 */
export async function fetchForecast(lat: number, lon: number): Promise<ForecastResult> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    // Request hourly data
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'visibility',
      'uv_index',
      'weather_code',
    ].join(','),
    // Request minutely_15 data for precipitation
    minutely_15: [
      'precipitation',
      'precipitation_probability',
    ].join(','),
    // Past 8 hours + next 48 hours = past_hours=8, forecast_hours=48
    past_hours: '8',
    forecast_hours: '48',
    // Get minutely data for next 2 hours (8 * 15min = 120min = 2 hours)
    forecast_minutely_15: '8',
    // Use Fahrenheit and mph units for imperial system
    temperature_unit: 'celsius',  // We'll convert ourselves for precise control
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoResponse = await response.json();
  const fetchedAt = new Date().toISOString();

  // Transform hourly data to TimelinePoints
  const hourlyPoints: TimelinePoint[] = data.hourly.time.map((timestamp, index) => ({
    timestamp,
    weather: transformHourlyData(data.hourly, index),
  }));

  // Transform minutely_15 data to TimelinePoints (with limited weather data)
  const minutelyPoints: TimelinePoint[] = [];
  if (data.minutely_15) {
    // For minutely data, we only have precipitation info
    // We'll use the closest hourly data for other fields
    data.minutely_15.time.forEach((timestamp, index) => {
      // Find the closest hourly point to get full weather data
      const minuteTime = new Date(timestamp).getTime();
      let closestHourlyIndex = 0;
      let closestDiff = Infinity;

      data.hourly.time.forEach((hourlyTimestamp, hourlyIndex) => {
        const diff = Math.abs(new Date(hourlyTimestamp).getTime() - minuteTime);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestHourlyIndex = hourlyIndex;
        }
      });

      const baseWeather = transformHourlyData(data.hourly, closestHourlyIndex);

      minutelyPoints.push({
        timestamp,
        weather: {
          ...baseWeather,
          // Override precipitation with minutely data
          precipitation: data.minutely_15!.precipitation_probability[index] ?? baseWeather.precipitation,
        },
      });
    });
  }

  return {
    hourlyPoints,
    minutelyPoints,
    latitude: data.latitude,
    longitude: data.longitude,
    fetchedAt,
  };
}
