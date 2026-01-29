/**
 * Hyper-local weather suggestions engine
 * PRD-012: Implement hyper-local weather suggestions engine
 *
 * Analyzes the next 2 hours of weather data to generate
 * contextual, actionable suggestions for users.
 */

import { TimelinePoint, WeatherCode } from '@/types/weather';

/**
 * Suggestion priority levels
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * Suggestion types for categorization
 */
export type SuggestionType =
  | 'precipitation'
  | 'temperature'
  | 'clear_window'
  | 'uv'
  | 'wind'
  | 'visibility';

/**
 * A weather suggestion with context
 */
export interface WeatherSuggestion {
  /** Unique identifier for the suggestion */
  id: string;
  /** The suggestion message */
  message: string;
  /** Priority level for sorting */
  priority: SuggestionPriority;
  /** Type of suggestion */
  type: SuggestionType;
  /** Icon emoji for visual representation */
  icon: string;
  /** Minutes until the condition occurs (0 = now) */
  minutesUntil: number;
}

/**
 * Check if a weather code indicates precipitation
 */
function isPrecipitationCode(code: WeatherCode): boolean {
  // Drizzle: 51-57, Rain: 61-67, Snow: 71-77, 80-86, Thunderstorm: 95-99
  return (
    (code >= 51 && code <= 57) ||
    (code >= 61 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 86) ||
    (code >= 95 && code <= 99)
  );
}

/**
 * Get precipitation type from weather code
 */
function getPrecipitationType(code: WeatherCode): string {
  if (code >= 95 && code <= 99) return 'thunderstorms';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 85 && code <= 86) return 'snow showers';
  if (code >= 56 && code <= 57) return 'freezing drizzle';
  if (code >= 66 && code <= 67) return 'freezing rain';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 80 && code <= 82) return 'rain showers';
  if (code >= 61 && code <= 65) return 'rain';
  return 'precipitation';
}

/**
 * Get precipitation intensity descriptor
 */
function getPrecipitationIntensity(code: WeatherCode): string {
  // Light/Slight codes
  if ([51, 56, 61, 66, 71, 80, 85].includes(code)) return 'light';
  // Moderate codes
  if ([53, 63, 73, 81, 95].includes(code)) return 'moderate';
  // Heavy/Dense/Violent codes
  if ([55, 57, 65, 67, 75, 82, 86, 96, 99].includes(code)) return 'heavy';
  return '';
}

/**
 * Format minutes into human-readable time
 */
function formatTimeUntil(minutes: number): string {
  if (minutes <= 0) return 'now';
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return hours === 1 ? 'in 1 hour' : `in ${hours} hours`;
  }
  return `in ${hours}h ${remainingMinutes}m`;
}

/**
 * Generate precipitation-related suggestions
 */
function generatePrecipitationSuggestions(
  points: TimelinePoint[],
  now: Date
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentWeather = points[0]?.weather;

  if (!currentWeather) return suggestions;

  const isCurrentlyPrecipitating = isPrecipitationCode(currentWeather.weatherCode);

  // Find when precipitation starts (if not currently precipitating)
  if (!isCurrentlyPrecipitating) {
    for (const point of points) {
      const pointTime = new Date(point.timestamp);
      const minutesUntil = Math.round((pointTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil > 120) break; // Only look at next 2 hours

      if (isPrecipitationCode(point.weather.weatherCode)) {
        const type = getPrecipitationType(point.weather.weatherCode);
        const intensity = getPrecipitationIntensity(point.weather.weatherCode);
        const intensityText = intensity ? `${intensity} ` : '';
        const prob = point.weather.precipitation;

        let message: string;
        let icon: string;
        let priority: SuggestionPriority;

        if (type === 'thunderstorms') {
          icon = '⛈️';
          priority = 'high';
          message = `Thunderstorms expected ${formatTimeUntil(minutesUntil)} - seek shelter`;
        } else if (type.includes('snow')) {
          icon = '🌨️';
          priority = prob >= 70 ? 'high' : 'medium';
          message = `${intensityText}${type} starting ${formatTimeUntil(minutesUntil)}${prob >= 50 ? ' - bundle up' : ''}`;
        } else if (type.includes('freezing')) {
          icon = '🧊';
          priority = 'high';
          message = `${intensityText}${type} expected ${formatTimeUntil(minutesUntil)} - roads may be icy`;
        } else {
          icon = '🌧️';
          priority = prob >= 70 ? 'high' : 'medium';
          message = `${intensityText}${type} starting ${formatTimeUntil(minutesUntil)}${prob >= 50 ? ' - bring umbrella' : ''}`;
        }

        suggestions.push({
          id: `precip-start-${minutesUntil}`,
          message: message.charAt(0).toUpperCase() + message.slice(1),
          priority,
          type: 'precipitation',
          icon,
          minutesUntil,
        });
        break; // Only report first precipitation start
      }
    }
  }

  // Find when precipitation ends (if currently precipitating)
  if (isCurrentlyPrecipitating) {
    const currentType = getPrecipitationType(currentWeather.weatherCode);

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const pointTime = new Date(point.timestamp);
      const minutesUntil = Math.round((pointTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil > 120) break;

      if (!isPrecipitationCode(point.weather.weatherCode)) {
        suggestions.push({
          id: `precip-end-${minutesUntil}`,
          message: `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} should stop ${formatTimeUntil(minutesUntil)}`,
          priority: 'medium',
          type: 'precipitation',
          icon: '🌤️',
          minutesUntil,
        });
        break;
      }
    }

    // Also add a "currently precipitating" suggestion
    suggestions.push({
      id: 'precip-now',
      message: `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} happening now`,
      priority: 'high',
      type: 'precipitation',
      icon: currentType.includes('snow') ? '🌨️' : currentType === 'thunderstorms' ? '⛈️' : '🌧️',
      minutesUntil: 0,
    });
  }

  return suggestions;
}

/**
 * Generate temperature change warnings
 */
function generateTemperatureSuggestions(
  points: TimelinePoint[],
  now: Date
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentTemp = points[0]?.weather.temperature;

  if (currentTemp === undefined) return suggestions;

  // Look for significant temperature changes in next 2 hours
  let maxTemp = currentTemp;
  let minTemp = currentTemp;
  let maxTempTime = 0;
  let minTempTime = 0;

  for (const point of points) {
    const pointTime = new Date(point.timestamp);
    const minutesUntil = Math.round((pointTime.getTime() - now.getTime()) / 60000);

    if (minutesUntil > 120) break;

    if (point.weather.temperature > maxTemp) {
      maxTemp = point.weather.temperature;
      maxTempTime = minutesUntil;
    }
    if (point.weather.temperature < minTemp) {
      minTemp = point.weather.temperature;
      minTempTime = minutesUntil;
    }
  }

  const tempIncrease = maxTemp - currentTemp;
  const tempDecrease = currentTemp - minTemp;

  // Significant warming (>10°F increase)
  if (tempIncrease >= 10 && maxTempTime > 0) {
    suggestions.push({
      id: `temp-increase-${maxTempTime}`,
      message: `Temperature rising ${Math.round(tempIncrease)}°F to ${Math.round(maxTemp)}°F ${formatTimeUntil(maxTempTime)}`,
      priority: tempIncrease >= 15 ? 'high' : 'medium',
      type: 'temperature',
      icon: '🌡️',
      minutesUntil: maxTempTime,
    });
  }

  // Significant cooling (>10°F decrease)
  if (tempDecrease >= 10 && minTempTime > 0) {
    suggestions.push({
      id: `temp-decrease-${minTempTime}`,
      message: `Temperature dropping ${Math.round(tempDecrease)}°F to ${Math.round(minTemp)}°F ${formatTimeUntil(minTempTime)} - dress warmly`,
      priority: tempDecrease >= 15 ? 'high' : 'medium',
      type: 'temperature',
      icon: '🥶',
      minutesUntil: minTempTime,
    });
  }

  // Feels like warning (if significantly different from actual temp)
  const currentFeelsLike = points[0]?.weather.feelsLike;
  if (currentFeelsLike !== undefined) {
    const feelsLikeDiff = Math.abs(currentTemp - currentFeelsLike);
    if (feelsLikeDiff >= 10) {
      if (currentFeelsLike < currentTemp) {
        suggestions.push({
          id: 'feels-colder',
          message: `Feels like ${Math.round(currentFeelsLike)}°F due to wind chill`,
          priority: 'medium',
          type: 'temperature',
          icon: '💨',
          minutesUntil: 0,
        });
      } else {
        suggestions.push({
          id: 'feels-warmer',
          message: `Feels like ${Math.round(currentFeelsLike)}°F due to humidity`,
          priority: 'medium',
          type: 'temperature',
          icon: '🥵',
          minutesUntil: 0,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Generate clear weather window suggestions
 */
function generateClearWindowSuggestions(
  points: TimelinePoint[],
  now: Date
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentWeather = points[0]?.weather;

  if (!currentWeather) return suggestions;

  const isCurrentlyClear = !isPrecipitationCode(currentWeather.weatherCode);

  if (isCurrentlyClear) {
    // Find how long the clear window lasts
    let clearUntilMinutes = 0;

    for (const point of points) {
      const pointTime = new Date(point.timestamp);
      const minutesUntil = Math.round((pointTime.getTime() - now.getTime()) / 60000);

      if (minutesUntil > 120) {
        clearUntilMinutes = 120;
        break;
      }

      if (isPrecipitationCode(point.weather.weatherCode)) {
        clearUntilMinutes = minutesUntil;
        break;
      }
    }

    // If clear for at least 30 minutes but precipitation coming
    if (clearUntilMinutes >= 30 && clearUntilMinutes < 120) {
      suggestions.push({
        id: `clear-window-${clearUntilMinutes}`,
        message: `Clear for the next ${clearUntilMinutes} minutes - good time for outdoor activities`,
        priority: 'medium',
        type: 'clear_window',
        icon: '☀️',
        minutesUntil: 0,
      });
    } else if (clearUntilMinutes >= 120) {
      // Clear for the full 2 hours
      suggestions.push({
        id: 'clear-2h',
        message: 'Clear skies for the next 2 hours',
        priority: 'low',
        type: 'clear_window',
        icon: '☀️',
        minutesUntil: 0,
      });
    }
  }

  return suggestions;
}

/**
 * Generate UV index suggestions
 */
function generateUVSuggestions(points: TimelinePoint[]): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentUV = points[0]?.weather.uvIndex;

  if (currentUV === undefined) return suggestions;

  if (currentUV >= 11) {
    suggestions.push({
      id: 'uv-extreme',
      message: 'Extreme UV index - avoid sun exposure, seek shade',
      priority: 'high',
      type: 'uv',
      icon: '☀️',
      minutesUntil: 0,
    });
  } else if (currentUV >= 8) {
    suggestions.push({
      id: 'uv-very-high',
      message: 'Very high UV index - wear sunscreen and protective clothing',
      priority: 'high',
      type: 'uv',
      icon: '🧴',
      minutesUntil: 0,
    });
  } else if (currentUV >= 6) {
    suggestions.push({
      id: 'uv-high',
      message: 'High UV index - sunscreen recommended',
      priority: 'medium',
      type: 'uv',
      icon: '🧴',
      minutesUntil: 0,
    });
  }

  return suggestions;
}

/**
 * Generate wind-related suggestions
 */
function generateWindSuggestions(points: TimelinePoint[]): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentWind = points[0]?.weather.windSpeed;

  if (currentWind === undefined) return suggestions;

  if (currentWind >= 40) {
    suggestions.push({
      id: 'wind-severe',
      message: `Strong winds at ${Math.round(currentWind)} mph - secure loose objects`,
      priority: 'high',
      type: 'wind',
      icon: '🌪️',
      minutesUntil: 0,
    });
  } else if (currentWind >= 25) {
    suggestions.push({
      id: 'wind-high',
      message: `Gusty winds at ${Math.round(currentWind)} mph`,
      priority: 'medium',
      type: 'wind',
      icon: '💨',
      minutesUntil: 0,
    });
  }

  return suggestions;
}

/**
 * Generate visibility-related suggestions
 */
function generateVisibilitySuggestions(points: TimelinePoint[]): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const currentVisibility = points[0]?.weather.visibility;
  const currentWeatherCode = points[0]?.weather.weatherCode;

  if (currentVisibility === undefined) return suggestions;

  if (currentVisibility < 0.25) {
    suggestions.push({
      id: 'visibility-very-low',
      message: 'Very low visibility - avoid driving if possible',
      priority: 'high',
      type: 'visibility',
      icon: '🌫️',
      minutesUntil: 0,
    });
  } else if (currentVisibility < 1) {
    const isFog = currentWeatherCode === 45 || currentWeatherCode === 48;
    suggestions.push({
      id: 'visibility-low',
      message: isFog ? 'Foggy conditions - drive carefully' : 'Reduced visibility - drive carefully',
      priority: 'medium',
      type: 'visibility',
      icon: '🌫️',
      minutesUntil: 0,
    });
  }

  return suggestions;
}

/**
 * Main function to generate all weather suggestions
 *
 * @param timeline - Array of TimelinePoint data
 * @param currentTime - Current time (defaults to now)
 * @returns Array of weather suggestions sorted by priority
 */
export function generateWeatherSuggestions(
  timeline: TimelinePoint[],
  currentTime: Date = new Date()
): WeatherSuggestion[] {
  if (!timeline || timeline.length === 0) {
    return [];
  }

  // Filter to only include points from now to 2 hours in the future
  const twoHoursFromNow = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
  const relevantPoints = timeline.filter((point) => {
    const pointTime = new Date(point.timestamp);
    return pointTime >= currentTime && pointTime <= twoHoursFromNow;
  });

  if (relevantPoints.length === 0) {
    return [];
  }

  // Generate all suggestions
  const allSuggestions: WeatherSuggestion[] = [
    ...generatePrecipitationSuggestions(relevantPoints, currentTime),
    ...generateTemperatureSuggestions(relevantPoints, currentTime),
    ...generateClearWindowSuggestions(relevantPoints, currentTime),
    ...generateUVSuggestions(relevantPoints),
    ...generateWindSuggestions(relevantPoints),
    ...generateVisibilitySuggestions(relevantPoints),
  ];

  // Sort by priority (high > medium > low) then by minutesUntil (soonest first)
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return allSuggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.minutesUntil - b.minutesUntil;
  });
}

/**
 * Get the top suggestion (most important/urgent)
 */
export function getTopSuggestion(
  timeline: TimelinePoint[],
  currentTime: Date = new Date()
): WeatherSuggestion | null {
  const suggestions = generateWeatherSuggestions(timeline, currentTime);
  return suggestions.length > 0 ? suggestions[0] : null;
}
