/**
 * Unified weather API aggregation layer
 * PRD-006: Create unified weather API aggregation layer
 *
 * Combines data from Open-Meteo (primary) and NWS (backup/alerts) APIs
 * to provide a unified weather timeline.
 */

import type { TimelinePoint, WeatherTimeline } from '@/types/weather';
import { fetchForecast, type ForecastResult } from './openMeteo';
import { fetchAlerts, fetchHourlyForecast, type NWSAlert, type AlertsResult } from './nwsApi';

/**
 * Result from the unified weather API
 */
export interface WeatherTimelineResult {
  /** Unified weather timeline */
  timeline: WeatherTimeline;
  /** Active weather alerts from NWS */
  alerts: NWSAlert[];
  /** Source of the primary weather data */
  source: 'open-meteo' | 'nws';
}

/**
 * Merge hourly and minutely data into a single timeline array.
 * For the next 2 hours, uses 15-minute granularity from minutely data.
 * Beyond 2 hours, uses hourly data.
 *
 * @param hourlyPoints - Hourly timeline points
 * @param minutelyPoints - 15-minute granularity timeline points
 * @returns Merged timeline points sorted by timestamp
 */
function mergeTimelineData(
  hourlyPoints: TimelinePoint[],
  minutelyPoints: TimelinePoint[]
): TimelinePoint[] {
  const now = Date.now();
  const twoHoursFromNow = now + 2 * 60 * 60 * 1000;

  // Collect all points
  const allPoints: TimelinePoint[] = [];

  // Add hourly points that are either:
  // 1. In the past (before now)
  // 2. More than 2 hours in the future
  for (const point of hourlyPoints) {
    const pointTime = new Date(point.timestamp).getTime();
    if (pointTime < now || pointTime >= twoHoursFromNow) {
      allPoints.push(point);
    }
  }

  // Add all minutely points (they cover the next 2 hours)
  for (const point of minutelyPoints) {
    allPoints.push(point);
  }

  // Sort by timestamp and remove duplicates (keep minutely over hourly for overlaps)
  allPoints.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Remove duplicate timestamps, preferring minutely data (which appears later due to sorting)
  const seen = new Map<string, TimelinePoint>();
  for (const point of allPoints) {
    // Round to nearest minute to handle slight timestamp differences
    const normalizedTime = new Date(point.timestamp);
    normalizedTime.setSeconds(0, 0);
    const key = normalizedTime.toISOString();
    seen.set(key, point);
  }

  return Array.from(seen.values()).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Convert NWS hourly forecast to match Open-Meteo timeline format
 *
 * @param nwsPoints - Timeline points from NWS API
 * @returns Timeline points covering the expected range
 */
function normalizeNWSTimeline(nwsPoints: TimelinePoint[]): TimelinePoint[] {
  // NWS already returns hourly data, just ensure it's sorted
  return [...nwsPoints].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Fetch unified weather timeline for a location.
 * Combines Open-Meteo (primary) data with NWS alerts.
 * Falls back to NWS hourly forecast if Open-Meteo fails.
 *
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns WeatherTimelineResult with timeline, alerts, and data source
 */
export async function getWeatherTimeline(
  lat: number,
  lon: number
): Promise<WeatherTimelineResult> {
  // Fetch alerts from NWS (always attempt, non-blocking)
  let alerts: NWSAlert[] = [];
  const alertsPromise = fetchAlerts(lat, lon)
    .then((result: AlertsResult) => {
      alerts = result.alerts;
    })
    .catch(() => {
      // Silently ignore alert fetch errors - alerts are supplementary
      alerts = [];
    });

  // Try Open-Meteo first (primary source)
  let openMeteoResult: ForecastResult | null = null;
  let openMeteoError: Error | null = null;

  try {
    openMeteoResult = await fetchForecast(lat, lon);
  } catch (error) {
    openMeteoError = error instanceof Error ? error : new Error(String(error));
  }

  // Wait for alerts to complete (or fail silently)
  await alertsPromise;

  // If Open-Meteo succeeded, use it as primary source
  if (openMeteoResult) {
    const mergedPoints = mergeTimelineData(
      openMeteoResult.hourlyPoints,
      openMeteoResult.minutelyPoints
    );

    return {
      timeline: {
        points: mergedPoints,
        fetchedAt: openMeteoResult.fetchedAt,
        location: {
          latitude: openMeteoResult.latitude,
          longitude: openMeteoResult.longitude,
        },
      },
      alerts,
      source: 'open-meteo',
    };
  }

  // Fallback to NWS if Open-Meteo failed
  try {
    const nwsResult = await fetchHourlyForecast(lat, lon);
    const normalizedPoints = normalizeNWSTimeline(nwsResult.hourlyPoints);

    return {
      timeline: {
        points: normalizedPoints,
        fetchedAt: nwsResult.fetchedAt,
        location: {
          latitude: lat,
          longitude: lon,
        },
      },
      alerts,
      source: 'nws',
    };
  } catch (nwsError) {
    // Both APIs failed - throw the original Open-Meteo error
    throw openMeteoError || nwsError;
  }
}

/**
 * Get just the current weather conditions from the timeline.
 * Returns the timeline point closest to the current time.
 *
 * @param timeline - Weather timeline to search
 * @returns The timeline point closest to now
 */
export function getCurrentWeather(timeline: WeatherTimeline): TimelinePoint | null {
  if (timeline.points.length === 0) {
    return null;
  }

  const now = Date.now();
  let closest = timeline.points[0];
  let closestDiff = Math.abs(new Date(closest.timestamp).getTime() - now);

  for (const point of timeline.points) {
    const diff = Math.abs(new Date(point.timestamp).getTime() - now);
    if (diff < closestDiff) {
      closest = point;
      closestDiff = diff;
    }
  }

  return closest;
}

/**
 * Get weather at a specific time from the timeline.
 * Returns the timeline point closest to the requested time.
 *
 * @param timeline - Weather timeline to search
 * @param targetTime - The time to get weather for (Date or ISO string)
 * @returns The timeline point closest to the target time, or null if timeline is empty
 */
export function getWeatherAtTime(
  timeline: WeatherTimeline,
  targetTime: Date | string
): TimelinePoint | null {
  if (timeline.points.length === 0) {
    return null;
  }

  const target = typeof targetTime === 'string'
    ? new Date(targetTime).getTime()
    : targetTime.getTime();

  let closest = timeline.points[0];
  let closestDiff = Math.abs(new Date(closest.timestamp).getTime() - target);

  for (const point of timeline.points) {
    const diff = Math.abs(new Date(point.timestamp).getTime() - target);
    if (diff < closestDiff) {
      closest = point;
      closestDiff = diff;
    }
  }

  return closest;
}
