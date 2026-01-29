'use client';

import type { WeatherData, WeatherCode } from '@/types/weather';

export interface WeatherCardProps {
  /** Weather data to display */
  weather: WeatherData;
  /** Optional label for the time being displayed */
  timeLabel?: string;
  /** Optional label indicating if this is current weather or forecast */
  isCurrentTime?: boolean;
  /** Compact mode for mobile - shows only essential info */
  compact?: boolean;
}

/**
 * Maps WMO weather codes to human-readable descriptions
 */
function getWeatherDescription(code: WeatherCode): string {
  const descriptions: Record<WeatherCode, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

/**
 * Maps WMO weather codes to emoji icons
 */
function getWeatherIcon(code: WeatherCode): string {
  if (code === 0) return '☀️';
  if (code === 1) return '🌤️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌧️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

/**
 * Get precipitation type based on weather code
 */
function getPrecipitationType(code: WeatherCode): string {
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 85 && code <= 86) return 'Snow';
  if (code >= 56 && code <= 57) return 'Freezing drizzle';
  if (code >= 66 && code <= 67) return 'Freezing rain';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'None';
}

/**
 * Get UV index level description
 */
function getUVLevel(uvIndex: number): { label: string; color: string } {
  if (uvIndex <= 2) return { label: 'Low', color: 'text-green-600 dark:text-green-400' };
  if (uvIndex <= 5) return { label: 'Moderate', color: 'text-yellow-600 dark:text-yellow-400' };
  if (uvIndex <= 7) return { label: 'High', color: 'text-orange-600 dark:text-orange-400' };
  if (uvIndex <= 10) return { label: 'Very High', color: 'text-red-600 dark:text-red-400' };
  return { label: 'Extreme', color: 'text-purple-600 dark:text-purple-400' };
}

/**
 * Weather card component showing current conditions
 * PRD-010: Build weather card component showing current conditions
 */
export function WeatherCard({
  weather,
  timeLabel,
  isCurrentTime = false,
  compact = false,
}: WeatherCardProps) {
  const uvLevel = getUVLevel(weather.uvIndex);
  const precipType = getPrecipitationType(weather.weatherCode);

  // Compact mode for mobile - shows only temperature, condition, and key stats
  if (compact) {
    return (
      <div
        className="w-full rounded-xl bg-white p-4 shadow-lg sm:p-5 dark:bg-zinc-800"
        data-testid="weather-card-compact"
      >
        {/* Header with time label and condition */}
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {timeLabel && (
              <p className="truncate text-xs font-medium text-zinc-500 sm:text-sm dark:text-zinc-400">
                {isCurrentTime ? 'Current Weather' : timeLabel}
              </p>
            )}
            <p className="truncate text-base font-semibold text-zinc-700 sm:text-lg dark:text-zinc-300">
              {getWeatherDescription(weather.weatherCode)}
            </p>
          </div>
          <div
            className="ml-2 flex-shrink-0 text-4xl sm:text-5xl"
            role="img"
            aria-label={getWeatherDescription(weather.weatherCode)}
            data-testid="weather-icon"
          >
            {getWeatherIcon(weather.weatherCode)}
          </div>
        </div>

        {/* Temperature display - more compact */}
        <div className="mb-3" data-testid="temperature-display">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-5xl font-light text-zinc-900 sm:text-6xl dark:text-zinc-100">
              {Math.round(weather.temperature)}
            </span>
            <span className="text-2xl text-zinc-400 sm:text-3xl">°F</span>
          </div>
          <p className="text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
            Feels like {Math.round(weather.feelsLike)}°F
          </p>
        </div>

        {/* Compact stats row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 sm:gap-4 sm:text-sm dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <span>💧</span>
            <span>{weather.precipitation}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span>🌬️</span>
            <span>{Math.round(weather.windSpeed)} mph</span>
          </span>
          <span className="flex items-center gap-1">
            <span>💨</span>
            <span>{weather.humidity}%</span>
          </span>
        </div>
      </div>
    );
  }

  // Full mode - all details
  return (
    <div
      className="w-full rounded-xl bg-white p-4 shadow-lg sm:p-6 dark:bg-zinc-800"
      data-testid="weather-card"
    >
      {/* Header with time label and condition */}
      <div className="mb-3 flex items-start justify-between sm:mb-4">
        <div className="min-w-0 flex-1">
          {timeLabel && (
            <p className="truncate text-xs font-medium text-zinc-500 sm:text-sm dark:text-zinc-400">
              {isCurrentTime ? 'Current Weather' : timeLabel}
            </p>
          )}
          <p className="truncate text-base font-semibold text-zinc-700 sm:text-lg dark:text-zinc-300">
            {getWeatherDescription(weather.weatherCode)}
          </p>
        </div>
        <div
          className="ml-2 flex-shrink-0 text-4xl sm:text-5xl"
          role="img"
          aria-label={getWeatherDescription(weather.weatherCode)}
          data-testid="weather-icon"
        >
          {getWeatherIcon(weather.weatherCode)}
        </div>
      </div>

      {/* Temperature display */}
      <div className="mb-4 sm:mb-6" data-testid="temperature-display">
        <div className="flex items-baseline gap-1 sm:gap-2">
          <span className="text-5xl font-light text-zinc-900 sm:text-6xl dark:text-zinc-100">
            {Math.round(weather.temperature)}
          </span>
          <span className="text-2xl text-zinc-400 sm:text-3xl">°F</span>
        </div>
        <p className="text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          Feels like {Math.round(weather.feelsLike)}°F
        </p>
      </div>

      {/* Weather details grid - responsive */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {/* Precipitation */}
        <div
          className="rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50"
          data-testid="precipitation-info"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">💧</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              Precipitation
            </span>
          </div>
          <p className="mt-0.5 text-lg font-semibold text-zinc-900 sm:mt-1 sm:text-xl dark:text-zinc-100">
            {weather.precipitation}%
          </p>
          <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
            {precipType}
          </p>
        </div>

        {/* Humidity */}
        <div
          className="rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50"
          data-testid="humidity-info"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">💨</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              Humidity
            </span>
          </div>
          <p className="mt-0.5 text-lg font-semibold text-zinc-900 sm:mt-1 sm:text-xl dark:text-zinc-100">
            {weather.humidity}%
          </p>
        </div>

        {/* Wind */}
        <div
          className="rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50"
          data-testid="wind-info"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">🌬️</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              Wind
            </span>
          </div>
          <p className="mt-0.5 text-lg font-semibold text-zinc-900 sm:mt-1 sm:text-xl dark:text-zinc-100">
            {Math.round(weather.windSpeed)} mph
          </p>
          <p className="text-[10px] text-zinc-500 sm:text-xs dark:text-zinc-400">
            {weather.windDirection}
          </p>
        </div>

        {/* Visibility */}
        <div
          className="rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50"
          data-testid="visibility-info"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">👁️</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              Visibility
            </span>
          </div>
          <p className="mt-0.5 text-lg font-semibold text-zinc-900 sm:mt-1 sm:text-xl dark:text-zinc-100">
            {weather.visibility} mi
          </p>
        </div>

        {/* UV Index */}
        <div
          className="col-span-2 rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50"
          data-testid="uv-info"
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">☀️</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs dark:text-zinc-400">
              UV Index
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1 sm:mt-1 sm:gap-2">
            <span className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-100">
              {weather.uvIndex}
            </span>
            <span className={`text-xs font-medium sm:text-sm ${uvLevel.color}`}>
              {uvLevel.label}
            </span>
          </div>
          {/* UV Index bar */}
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-purple-600 sm:mt-2 sm:h-2">
            <div
              className="h-full bg-zinc-900/20 dark:bg-white/20"
              style={{
                marginLeft: `${Math.min(weather.uvIndex / 11, 1) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
