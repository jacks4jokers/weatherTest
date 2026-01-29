'use client';

import { useState, useEffect, useRef } from 'react';
import { TimelineSlider } from '@/components/TimelineSlider';
import { WeatherCard } from '@/components/WeatherCard';
import { LocationPicker, type LocationData } from '@/components/LocationPicker';
import { SuggestionBanner } from '@/components/SuggestionBanner';
import { useLocation } from '@/hooks/useLocation';
import { useWeatherData } from '@/hooks/useWeatherData';
import type { TimelinePoint } from '@/types/weather';

/**
 * Format timestamp as a user-friendly label
 */
function formatTimeLabel(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (Math.abs(diffMins) < 5) {
    return 'Now';
  }

  if (Math.abs(diffMins) < 60) {
    return diffMins > 0
      ? `${timeStr} (in ${diffMins} min)`
      : `${timeStr} (${Math.abs(diffMins)} min ago)`;
  }

  return diffHours > 0
    ? `${timeStr} (in ${Math.abs(diffHours)}h)`
    : `${timeStr} (${Math.abs(diffHours)}h ago)`;
}

/**
 * Check if timestamp is close to current time
 */
function isCurrentTime(timestamp: string): boolean {
  const diffMs = Math.abs(new Date(timestamp).getTime() - Date.now());
  return diffMs < 5 * 60 * 1000; // Within 5 minutes
}

/**
 * Find the timeline point closest to the given timestamp
 */
function findClosestPoint(timeline: TimelinePoint[], targetTime: number): TimelinePoint {
  let closest = timeline[0];
  let closestDiff = Infinity;

  for (const point of timeline) {
    const diff = Math.abs(new Date(point.timestamp).getTime() - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = point;
    }
  }

  return closest;
}

export default function Home() {
  // GPS location hook
  const {
    latitude: gpsLatitude,
    longitude: gpsLongitude,
    error: gpsError,
    loading: gpsLoading,
    requestLocation,
  } = useLocation();

  // Current location state (can be GPS or manually selected)
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const locationInitialized = useRef(false);

  // Initialize location from GPS when available
  useEffect(() => {
    if (gpsLatitude != null && gpsLongitude != null && !locationInitialized.current) {
      locationInitialized.current = true;
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => {
        setCurrentLocation({
          latitude: gpsLatitude,
          longitude: gpsLongitude,
          name: `${gpsLatitude.toFixed(4)}, ${gpsLongitude.toFixed(4)}`,
        });
      });
    }
  }, [gpsLatitude, gpsLongitude]);

  // Fetch weather data for the current location
  const {
    timeline,
    loading: weatherLoading,
    error: weatherError,
    refetch,
  } = useWeatherData(
    currentLocation?.latitude ?? null,
    currentLocation?.longitude ?? null
  );

  // Selected point on the timeline (controlled by slider)
  const [selectedPoint, setSelectedPoint] = useState<TimelinePoint | null>(null);
  const timelineInitialized = useRef(false);

  // Get timeline points array (for convenience)
  const timelinePoints = timeline?.points ?? [];

  // Initialize selected point when timeline first loads
  useEffect(() => {
    if (timelinePoints.length > 0 && !timelineInitialized.current) {
      timelineInitialized.current = true;
      queueMicrotask(() => {
        setSelectedPoint(findClosestPoint(timelinePoints, Date.now()));
      });
    }
  }, [timelinePoints]);

  // Reset timeline initialization when location changes
  useEffect(() => {
    timelineInitialized.current = false;
    setSelectedPoint(null);
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-zinc-50 p-4 pt-8 dark:bg-zinc-900">
      <main className="w-full max-w-md space-y-6">
        <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Weather Timeline
        </h1>

        {/* Location picker at top */}
        <div className="rounded-xl bg-white p-4 shadow-lg dark:bg-zinc-800">
          <LocationPicker
            gpsLocation={{ latitude: gpsLatitude, longitude: gpsLongitude }}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            currentLocation={currentLocation}
            onLocationChange={setCurrentLocation}
            onRequestGps={requestLocation}
          />
        </div>

        {/* Suggestion banner below location */}
        {timelinePoints.length > 0 && (
          <SuggestionBanner timeline={timelinePoints} />
        )}

        {/* Loading state */}
        {weatherLoading && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <p className="text-zinc-600 dark:text-zinc-400">Loading weather data...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {weatherError && !weatherLoading && (
          <div className="rounded-xl bg-red-50 p-6 shadow-lg dark:bg-red-900/20">
            <div className="flex flex-col items-center space-y-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-center text-red-700 dark:text-red-400">{weatherError}</p>
              <button
                onClick={refetch}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                data-testid="retry-button"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* No location state */}
        {!currentLocation && !gpsLoading && !weatherLoading && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center space-y-4">
              <span className="text-4xl">📍</span>
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                Enable location access or search for a location to see weather data.
              </p>
            </div>
          </div>
        )}

        {/* Weather card - main display, updates based on slider position */}
        {selectedPoint && !weatherLoading && !weatherError && (
          <WeatherCard
            weather={selectedPoint.weather}
            timeLabel={formatTimeLabel(selectedPoint.timestamp)}
            isCurrentTime={isCurrentTime(selectedPoint.timestamp)}
          />
        )}

        {/* Timeline slider at bottom */}
        {timelinePoints.length > 0 && !weatherLoading && !weatherError && (
          <div className="rounded-xl bg-white p-4 shadow-lg dark:bg-zinc-800">
            <TimelineSlider
              timeline={timelinePoints}
              selectedPoint={selectedPoint}
              onTimeChange={setSelectedPoint}
            />
          </div>
        )}

        {/* Helper text */}
        {timelinePoints.length > 0 && !weatherLoading && !weatherError && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Drag the slider to see weather at different times
          </p>
        )}
      </main>
    </div>
  );
}
