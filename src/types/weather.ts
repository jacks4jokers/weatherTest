/**
 * Core TypeScript types for weather data model
 * PRD-003: Define core TypeScript types for weather data model
 */

/**
 * Wind direction as compass direction
 */
export type WindDirection =
  | 'N'
  | 'NNE'
  | 'NE'
  | 'ENE'
  | 'E'
  | 'ESE'
  | 'SE'
  | 'SSE'
  | 'S'
  | 'SSW'
  | 'SW'
  | 'WSW'
  | 'W'
  | 'WNW'
  | 'NW'
  | 'NNW';

/**
 * WMO Weather interpretation codes
 * @see https://open-meteo.com/en/docs
 */
export type WeatherCode =
  | 0 // Clear sky
  | 1 // Mainly clear
  | 2 // Partly cloudy
  | 3 // Overcast
  | 45 // Fog
  | 48 // Depositing rime fog
  | 51 // Drizzle: Light
  | 53 // Drizzle: Moderate
  | 55 // Drizzle: Dense
  | 56 // Freezing Drizzle: Light
  | 57 // Freezing Drizzle: Dense
  | 61 // Rain: Slight
  | 63 // Rain: Moderate
  | 65 // Rain: Heavy
  | 66 // Freezing Rain: Light
  | 67 // Freezing Rain: Heavy
  | 71 // Snow fall: Slight
  | 73 // Snow fall: Moderate
  | 75 // Snow fall: Heavy
  | 77 // Snow grains
  | 80 // Rain showers: Slight
  | 81 // Rain showers: Moderate
  | 82 // Rain showers: Violent
  | 85 // Snow showers: Slight
  | 86 // Snow showers: Heavy
  | 95 // Thunderstorm: Slight or moderate
  | 96 // Thunderstorm with slight hail
  | 99; // Thunderstorm with heavy hail

/**
 * Core weather data for a single point in time
 */
export interface WeatherData {
  /** Temperature in Fahrenheit */
  temperature: number;
  /** Feels like temperature in Fahrenheit */
  feelsLike: number;
  /** Precipitation probability as percentage (0-100) */
  precipitation: number;
  /** Relative humidity as percentage (0-100) */
  humidity: number;
  /** Wind speed in mph */
  windSpeed: number;
  /** Wind direction as compass direction */
  windDirection: WindDirection;
  /** Visibility in miles */
  visibility: number;
  /** UV index (0-11+) */
  uvIndex: number;
  /** WMO weather interpretation code */
  weatherCode: WeatherCode;
}

/**
 * A single point on the weather timeline
 */
export interface TimelinePoint {
  /** ISO 8601 timestamp for this data point */
  timestamp: string;
  /** Weather data at this point in time */
  weather: WeatherData;
}

/**
 * Granularity of timeline data
 */
export type TimelineGranularity = '5min' | 'hourly';

/**
 * Complete weather timeline spanning past to future
 */
export interface WeatherTimeline {
  /** All timeline points from past 8h to future 48h */
  points: TimelinePoint[];
  /** Timestamp when data was fetched */
  fetchedAt: string;
  /** Location coordinates this data is for */
  location: {
    latitude: number;
    longitude: number;
  };
}
