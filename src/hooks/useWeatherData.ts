'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WeatherTimeline, TimelinePoint } from '@/types/weather';
import type { NWSAlert } from '@/services/nwsApi';
import { getWeatherTimeline, getCurrentWeather } from '@/services/weatherApi';

export interface WeatherDataState {
  /** The full weather timeline */
  timeline: WeatherTimeline | null;
  /** Current weather conditions (closest point to now) */
  currentWeather: TimelinePoint | null;
  /** Active weather alerts for the location */
  alerts: NWSAlert[];
  /** Whether data is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Source of the weather data */
  source: 'open-meteo' | 'nws' | null;
}

export interface UseWeatherDataReturn extends WeatherDataState {
  /** Manually trigger a data refresh */
  refetch: () => void;
}

/**
 * Hook for fetching weather data for a given location.
 * PRD-008: Implement weather data fetching hook
 *
 * @param latitude - Latitude coordinate (null to skip fetching)
 * @param longitude - Longitude coordinate (null to skip fetching)
 * @returns Weather data state and refetch function
 */
export function useWeatherData(
  latitude: number | null,
  longitude: number | null
): UseWeatherDataReturn {
  const [state, setState] = useState<WeatherDataState>({
    timeline: null,
    currentWeather: null,
    alerts: [],
    loading: false,
    error: null,
    source: null,
  });

  const fetchData = useCallback(async () => {
    // Don't fetch if coordinates are not available
    if (latitude === null || longitude === null) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await getWeatherTimeline(latitude, longitude);

      const currentWeather = getCurrentWeather(result.timeline);

      setState({
        timeline: result.timeline,
        currentWeather,
        alerts: result.alerts,
        loading: false,
        error: null,
        source: result.source,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch weather data';

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [latitude, longitude]);

  // Fetch data when coordinates change
  useEffect(() => {
    // Use async IIFE to handle the async fetch
    void (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}
