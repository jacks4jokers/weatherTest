/**
 * National Weather Service (NWS) API client for alerts and backup forecast data
 * PRD-005: Implement NWS API client for alerts and backup data
 */

import type { WeatherData, WindDirection, WeatherCode, TimelinePoint } from '@/types/weather';

const NWS_BASE_URL = 'https://api.weather.gov';

/**
 * User-Agent header required by NWS API
 * @see https://www.weather.gov/documentation/services-web-api
 */
const NWS_USER_AGENT = 'WeatherApp/1.0 (contact@example.com)';

/**
 * NWS Alert types
 */
export interface NWSAlert {
  id: string;
  areaDesc: string;
  headline: string;
  description: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
  event: string;
  effective: string;
  expires: string;
  instruction: string | null;
}

/**
 * NWS Points API response
 */
interface NWSPointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    forecastGridData: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

/**
 * NWS Alerts API response
 */
interface NWSAlertsResponse {
  features: Array<{
    properties: {
      id: string;
      areaDesc: string;
      headline: string;
      description: string;
      severity: string;
      urgency: string;
      event: string;
      effective: string;
      expires: string;
      instruction: string | null;
    };
  }>;
}

/**
 * NWS Hourly Forecast API response
 */
interface NWSHourlyForecastResponse {
  properties: {
    periods: Array<{
      number: number;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: 'F' | 'C';
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      detailedForecast: string;
      probabilityOfPrecipitation: {
        value: number | null;
      };
      relativeHumidity: {
        value: number | null;
      };
    }>;
  };
}

/**
 * Result from NWS alerts fetch
 */
export interface AlertsResult {
  alerts: NWSAlert[];
  fetchedAt: string;
}

/**
 * Result from NWS hourly forecast fetch
 */
export interface HourlyForecastResult {
  hourlyPoints: TimelinePoint[];
  location: {
    city: string;
    state: string;
  };
  fetchedAt: string;
}

/**
 * Parse wind speed string like "10 mph" or "5 to 10 mph" to number
 */
function parseWindSpeed(windSpeed: string): number {
  // Handle range like "5 to 10 mph" - take the higher value
  const rangeMatch = windSpeed.match(/(\d+)\s*to\s*(\d+)/i);
  if (rangeMatch) {
    return parseInt(rangeMatch[2], 10);
  }

  // Handle single value like "10 mph"
  const singleMatch = windSpeed.match(/(\d+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }

  return 0;
}

/**
 * Convert NWS wind direction abbreviation to WindDirection type
 */
function parseWindDirection(direction: string): WindDirection {
  const validDirections: WindDirection[] = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];

  const upperDir = direction.toUpperCase() as WindDirection;
  return validDirections.includes(upperDir) ? upperDir : 'N';
}

/**
 * Map NWS short forecast text to WMO weather code
 */
function forecastToWeatherCode(shortForecast: string): WeatherCode {
  const forecast = shortForecast.toLowerCase();

  // Thunderstorms
  if (forecast.includes('thunder')) {
    if (forecast.includes('hail')) return 96;
    return 95;
  }

  // Snow
  if (forecast.includes('snow') || forecast.includes('flurr')) {
    if (forecast.includes('heavy') || forecast.includes('blizzard')) return 75;
    if (forecast.includes('light') || forecast.includes('flurr')) return 71;
    if (forecast.includes('shower')) return 85;
    return 73;
  }

  // Freezing rain/drizzle
  if (forecast.includes('freezing')) {
    if (forecast.includes('rain')) return 66;
    if (forecast.includes('drizzle')) return 56;
  }

  // Rain
  if (forecast.includes('rain') || forecast.includes('shower')) {
    if (forecast.includes('heavy')) return 65;
    if (forecast.includes('light')) return 61;
    if (forecast.includes('shower')) return 80;
    return 63;
  }

  // Drizzle
  if (forecast.includes('drizzle')) {
    if (forecast.includes('light')) return 51;
    if (forecast.includes('heavy')) return 55;
    return 53;
  }

  // Fog
  if (forecast.includes('fog')) {
    return 45;
  }

  // Cloud cover
  if (forecast.includes('overcast')) return 3;
  if (forecast.includes('mostly cloudy') || forecast.includes('considerable')) return 3;
  if (forecast.includes('partly cloudy') || forecast.includes('partly sunny')) return 2;
  if (forecast.includes('mostly clear') || forecast.includes('mostly sunny')) return 1;

  // Clear
  if (forecast.includes('clear') || forecast.includes('sunny')) return 0;

  // Default to partly cloudy
  return 2;
}

/**
 * Make a request to the NWS API with required headers
 */
async function nwsFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': NWS_USER_AGENT,
      'Accept': 'application/geo+json',
    },
  });

  if (!response.ok) {
    throw new Error(`NWS API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the NWS grid point data for a location
 * This is the first step in the two-step NWS API process
 */
async function getGridPoint(lat: number, lon: number): Promise<NWSPointsResponse> {
  // NWS API requires coordinates with max 4 decimal places
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLon = Math.round(lon * 10000) / 10000;

  return nwsFetch<NWSPointsResponse>(
    `${NWS_BASE_URL}/points/${roundedLat},${roundedLon}`
  );
}

/**
 * Fetch active weather alerts for a location
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns AlertsResult with array of active alerts
 */
export async function fetchAlerts(lat: number, lon: number): Promise<AlertsResult> {
  // NWS API requires coordinates with max 4 decimal places
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLon = Math.round(lon * 10000) / 10000;

  const data = await nwsFetch<NWSAlertsResponse>(
    `${NWS_BASE_URL}/alerts/active?point=${roundedLat},${roundedLon}`
  );

  const alerts: NWSAlert[] = data.features.map((feature) => ({
    id: feature.properties.id,
    areaDesc: feature.properties.areaDesc,
    headline: feature.properties.headline,
    description: feature.properties.description,
    severity: feature.properties.severity as NWSAlert['severity'],
    urgency: feature.properties.urgency as NWSAlert['urgency'],
    event: feature.properties.event,
    effective: feature.properties.effective,
    expires: feature.properties.expires,
    instruction: feature.properties.instruction,
  }));

  return {
    alerts,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch hourly forecast from NWS API
 * Uses the two-step process: points -> gridpoint hourly forecast
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns HourlyForecastResult with timeline points and location info
 */
export async function fetchHourlyForecast(lat: number, lon: number): Promise<HourlyForecastResult> {
  // Step 1: Get the grid point data
  const pointsData = await getGridPoint(lat, lon);

  // Step 2: Fetch the hourly forecast using the URL from points response
  const forecastData = await nwsFetch<NWSHourlyForecastResponse>(
    pointsData.properties.forecastHourly
  );

  // Transform NWS periods to TimelinePoints
  const hourlyPoints: TimelinePoint[] = forecastData.properties.periods.map((period) => {
    const weather: WeatherData = {
      temperature: period.temperature,
      // NWS doesn't provide feels-like, so use actual temp
      feelsLike: period.temperature,
      precipitation: period.probabilityOfPrecipitation.value ?? 0,
      humidity: period.relativeHumidity.value ?? 50,
      windSpeed: parseWindSpeed(period.windSpeed),
      windDirection: parseWindDirection(period.windDirection),
      // NWS doesn't provide visibility in hourly, default to 10 miles
      visibility: 10,
      // NWS doesn't provide UV index, default to 0
      uvIndex: 0,
      weatherCode: forecastToWeatherCode(period.shortForecast),
    };

    return {
      timestamp: period.startTime,
      weather,
    };
  });

  return {
    hourlyPoints,
    location: {
      city: pointsData.properties.relativeLocation.properties.city,
      state: pointsData.properties.relativeLocation.properties.state,
    },
    fetchedAt: new Date().toISOString(),
  };
}
