'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimelineSlider } from '@/components/TimelineSlider';
import { WeatherCard } from '@/components/WeatherCard';
import { LocationPicker, type LocationData } from '@/components/LocationPicker';
import { SuggestionBanner } from '@/components/SuggestionBanner';
import { BottomSheet } from '@/components/BottomSheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WeatherSkeleton, TimelineSkeleton, SuggestionSkeleton } from '@/components/WeatherSkeleton';
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
    offline,
    retryCount,
    refetch,
  } = useWeatherData(
    currentLocation?.latitude ?? null,
    currentLocation?.longitude ?? null
  );

  // Selected point on the timeline (controlled by slider)
  const [selectedPoint, setSelectedPoint] = useState<TimelinePoint | null>(null);
  const timelineInitialized = useRef(false);

  // Bottom sheet state for mobile weather details
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Open bottom sheet when tapping weather card on mobile
  const handleWeatherCardClick = useCallback(() => {
    // Only open on mobile/tablet (below lg breakpoint)
    if (window.innerWidth < 1024) {
      setIsBottomSheetOpen(true);
    }
  }, []);

  // Get timeline points array (for convenience) - memoized to prevent effect re-runs
  const timelinePoints = useMemo(() => timeline?.points ?? [], [timeline?.points]);

  // Track location key to detect changes
  const locationKey = useMemo(
    () => `${currentLocation?.latitude}-${currentLocation?.longitude}`,
    [currentLocation?.latitude, currentLocation?.longitude]
  );
  const prevLocationKey = useRef(locationKey);

  // Initialize selected point when timeline first loads or location changes
  useEffect(() => {
    // Check if location changed
    const locationChanged = prevLocationKey.current !== locationKey;
    if (locationChanged) {
      prevLocationKey.current = locationKey;
      timelineInitialized.current = false;
    }

    if (timelinePoints.length > 0 && !timelineInitialized.current) {
      timelineInitialized.current = true;
      queueMicrotask(() => {
        setSelectedPoint(findClosestPoint(timelinePoints, Date.now()));
      });
    } else if (timelinePoints.length === 0 && locationChanged) {
      // Clear selected point when location changes and no data yet
      queueMicrotask(() => {
        setSelectedPoint(null);
      });
    }
  }, [timelinePoints, locationKey]);

  // Whether we have data from a previous fetch (show stale data during retry)
  const hasExistingData = timelinePoints.length > 0;

  // Show skeleton only on initial load (no existing data), not during retries
  const showSkeleton = weatherLoading && !hasExistingData && currentLocation !== null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-zinc-50 px-2 py-4 pt-6 sm:px-4 sm:pt-8 dark:bg-zinc-900">
      {/* Offline banner */}
      {offline && (
        <div
          className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md"
          role="alert"
          data-testid="offline-banner"
        >
          You are offline. Weather data may be outdated.
        </div>
      )}

      {/* Main container with responsive max-width */}
      <main className={`w-full max-w-[320px] space-y-4 sm:max-w-md sm:space-y-6 md:max-w-lg lg:max-w-2xl ${offline ? 'pt-8' : ''}`}>
        {/* Header with title and theme toggle */}
        <div className="flex items-center justify-between">
          <div className="w-10" /> {/* Spacer for centering */}
          <h1 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Weather Timeline
          </h1>
          <ThemeToggle />
        </div>

        {/* Desktop: Two-column layout for wider screens */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left column on desktop: Location + Weather Card */}
          <div className="space-y-4 sm:space-y-6">
            {/* Location picker at top */}
            <div className="rounded-xl bg-white p-3 shadow-lg sm:p-4 dark:bg-zinc-800">
              <LocationPicker
                gpsLocation={{ latitude: gpsLatitude, longitude: gpsLongitude }}
                gpsLoading={gpsLoading}
                gpsError={gpsError}
                currentLocation={currentLocation}
                onLocationChange={setCurrentLocation}
                onRequestGps={requestLocation}
              />
            </div>

            {/* Suggestion banner or skeleton */}
            {showSkeleton && <SuggestionSkeleton />}
            {!showSkeleton && timelinePoints.length > 0 && (
              <SuggestionBanner timeline={timelinePoints} />
            )}

            {/* Loading skeleton */}
            {showSkeleton && <WeatherSkeleton compact={true} />}

            {/* Retrying indicator (when we have stale data) */}
            {weatherLoading && hasExistingData && (
              <div
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                role="status"
                data-testid="retrying-indicator"
              >
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                {retryCount > 0
                  ? `Retrying... (attempt ${retryCount} of 3)`
                  : 'Refreshing weather data...'}
              </div>
            )}

            {/* Error state */}
            {weatherError && !weatherLoading && (
              <div
                className="rounded-xl bg-red-50 p-4 shadow-lg sm:p-6 dark:bg-red-900/20"
                role="alert"
                data-testid="error-state"
              >
                <div className="flex flex-col items-center space-y-3">
                  {offline ? (
                    <span className="text-2xl sm:text-3xl" role="img" aria-label="Offline">
                      📡
                    </span>
                  ) : (
                    <span className="text-2xl sm:text-3xl" role="img" aria-label="Error">
                      ⚠️
                    </span>
                  )}
                  <p className="text-center text-sm text-red-700 sm:text-base dark:text-red-400">
                    {weatherError}
                  </p>
                  {!offline && (
                    <button
                      onClick={refetch}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-zinc-900"
                      data-testid="retry-button"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No location state */}
            {!currentLocation && !gpsLoading && !weatherLoading && (
              <div className="rounded-xl bg-white p-6 shadow-lg sm:p-8 dark:bg-zinc-800">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <span className="text-3xl sm:text-4xl">📍</span>
                  <p className="text-center text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
                    Enable location access or search for a location to see weather data.
                  </p>
                </div>
              </div>
            )}

            {/* Weather card - main display, updates based on slider position */}
            {/* On mobile: tappable to show bottom sheet with full details */}
            {selectedPoint && !showSkeleton && !weatherError && (
              <div
                onClick={handleWeatherCardClick}
                className="cursor-pointer lg:cursor-default"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleWeatherCardClick()}
                aria-label="Tap for more weather details"
              >
                <WeatherCard
                  weather={selectedPoint.weather}
                  timeLabel={formatTimeLabel(selectedPoint.timestamp)}
                  isCurrentTime={isCurrentTime(selectedPoint.timestamp)}
                  compact={true}
                />
                {/* "Tap for details" hint on mobile */}
                <p className="mt-2 text-center text-xs text-zinc-400 lg:hidden">
                  Tap for more details
                </p>
              </div>
            )}
          </div>

          {/* Right column on desktop: Timeline + details */}
          <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6 lg:mt-0">
            {/* Timeline skeleton */}
            {showSkeleton && <TimelineSkeleton />}

            {/* Timeline slider */}
            {!showSkeleton && timelinePoints.length > 0 && !weatherError && (
              <div className="rounded-xl bg-white p-3 shadow-lg sm:p-4 dark:bg-zinc-800">
                <TimelineSlider
                  timeline={timelinePoints}
                  selectedPoint={selectedPoint}
                  onTimeChange={setSelectedPoint}
                />
              </div>
            )}

            {/* Helper text */}
            {!showSkeleton && timelinePoints.length > 0 && !weatherError && (
              <p className="text-center text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
                Drag the slider to see weather at different times
              </p>
            )}

            {/* Full weather details on desktop (hidden on mobile) */}
            {selectedPoint && !showSkeleton && !weatherError && (
              <div className="hidden lg:block">
                <WeatherCard
                  weather={selectedPoint.weather}
                  timeLabel={formatTimeLabel(selectedPoint.timestamp)}
                  isCurrentTime={isCurrentTime(selectedPoint.timestamp)}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom sheet for mobile weather details */}
      {selectedPoint && (
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          title="Weather Details"
        >
          <WeatherCard
            weather={selectedPoint.weather}
            timeLabel={formatTimeLabel(selectedPoint.timestamp)}
            isCurrentTime={isCurrentTime(selectedPoint.timestamp)}
          />
        </BottomSheet>
      )}
    </div>
  );
}
