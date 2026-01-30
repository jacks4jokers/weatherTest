'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WeatherTimeline, TimelinePoint } from '@/types/weather';
import type { NWSAlert } from '@/services/nwsApi';
import { getWeatherTimeline, getCurrentWeather } from '@/services/weatherApi';

/** Maximum number of automatic retries */
const MAX_RETRIES = 3;

/** Delay between retries in ms (doubles each attempt: 2s, 4s, 8s) */
const BASE_RETRY_DELAY_MS = 2000;

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
  /** Whether the browser is offline */
  offline: boolean;
  /** Number of retry attempts made */
  retryCount: number;
}

export interface UseWeatherDataReturn extends WeatherDataState {
  /** Manually trigger a data refresh */
  refetch: () => void;
}

/**
 * Convert raw error messages into user-friendly descriptions.
 */
function toUserFriendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (!navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection and try again.';
  }

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')) {
    return 'Unable to reach the weather service. Please check your connection and try again.';
  }

  if (msg.includes('API error: 429') || msg.includes('Too Many Requests')) {
    return 'Weather service is busy. Please wait a moment and try again.';
  }

  if (msg.includes('API error: 5') || msg.includes('500') || msg.includes('503')) {
    return 'The weather service is temporarily unavailable. Please try again shortly.';
  }

  if (msg.includes('API error: 404') || msg.includes('Not Found')) {
    return 'Weather data is not available for this location.';
  }

  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('TIMEOUT')) {
    return 'The request took too long. Please try again.';
  }

  return 'Unable to load weather data. Please try again.';
}

/**
 * Hook for fetching weather data for a given location.
 * PRD-008 + PRD-019: Weather data fetching with error handling,
 * automatic retry, and offline state management.
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
    offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Track component mount status
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    function handleOnline() {
      if (!mountedRef.current) return;
      setState((prev) => ({ ...prev, offline: false }));
    }

    function handleOffline() {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        offline: true,
        error: 'You appear to be offline. Weather data will refresh when you reconnect.',
      }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchData = useCallback(async (retryAttempt = 0) => {
    // Don't fetch if coordinates are not available
    if (latitude === null || longitude === null) {
      return;
    }

    // Don't fetch if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState((prev) => ({
        ...prev,
        offline: true,
        error: 'You appear to be offline. Weather data will refresh when you reconnect.',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, retryCount: retryAttempt }));

    try {
      const result = await getWeatherTimeline(latitude, longitude);

      if (!mountedRef.current) return;

      const currentWeather = getCurrentWeather(result.timeline);

      setState({
        timeline: result.timeline,
        currentWeather,
        alerts: result.alerts,
        loading: false,
        error: null,
        source: result.source,
        offline: false,
        retryCount: 0,
      });
    } catch (error) {
      if (!mountedRef.current) return;

      const errorMessage = toUserFriendlyError(error);

      // Automatic retry with exponential backoff
      if (retryAttempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
          retryCount: retryAttempt + 1,
        }));

        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            fetchData(retryAttempt + 1);
          }
        }, delay);
        return;
      }

      // All retries exhausted
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
        retryCount: retryAttempt,
      }));
    }
  }, [latitude, longitude]);

  // Fetch data when coordinates change
  useEffect(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Use async IIFE to handle the async fetch
    void (async () => {
      await fetchData(0);
    })();
  }, [fetchData]);

  // Auto-refetch when coming back online
  useEffect(() => {
    if (!state.offline && state.error && latitude !== null && longitude !== null) {
      // Just came back online with an error state — refetch
      void (async () => {
        await fetchData(0);
      })();
    }
    // Only trigger when offline status changes to online
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.offline]);

  const refetch = useCallback(() => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    fetchData(0);
  }, [fetchData]);

  return {
    ...state,
    refetch,
  };
}
