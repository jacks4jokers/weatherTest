'use client';

/**
 * Loading skeleton component that mirrors the WeatherCard layout.
 * PRD-019: Show loading skeleton while fetching weather data
 */
export function WeatherSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div
        className="w-full animate-pulse rounded-xl bg-white p-4 shadow-lg sm:p-5 dark:bg-zinc-800"
        data-testid="weather-skeleton-compact"
        role="status"
        aria-label="Loading weather data"
      >
        {/* Header skeleton */}
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-200 sm:h-4 dark:bg-zinc-700" />
            <div className="h-4 w-32 rounded bg-zinc-200 sm:h-5 dark:bg-zinc-700" />
          </div>
          <div className="ml-2 h-10 w-10 flex-shrink-0 rounded-full bg-zinc-200 sm:h-12 sm:w-12 dark:bg-zinc-700" />
        </div>

        {/* Temperature skeleton */}
        <div className="mb-3">
          <div className="h-12 w-28 rounded bg-zinc-200 sm:h-14 dark:bg-zinc-700" />
          <div className="mt-1 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Stats row skeleton */}
        <div className="flex gap-3 sm:gap-4">
          <div className="h-4 w-12 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full animate-pulse rounded-xl bg-white p-4 shadow-lg sm:p-6 dark:bg-zinc-800"
      data-testid="weather-skeleton"
      role="status"
      aria-label="Loading weather data"
    >
      {/* Header skeleton */}
      <div className="mb-3 flex items-start justify-between sm:mb-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-zinc-200 sm:h-4 dark:bg-zinc-700" />
          <div className="h-4 w-32 rounded bg-zinc-200 sm:h-5 dark:bg-zinc-700" />
        </div>
        <div className="ml-2 h-10 w-10 flex-shrink-0 rounded-full bg-zinc-200 sm:h-12 sm:w-12 dark:bg-zinc-700" />
      </div>

      {/* Temperature skeleton */}
      <div className="mb-4 sm:mb-6">
        <div className="h-12 w-28 rounded bg-zinc-200 sm:h-14 dark:bg-zinc-700" />
        <div className="mt-1 h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Weather details grid skeleton */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-4 w-4 rounded bg-zinc-200 sm:h-5 sm:w-5 dark:bg-zinc-600" />
              <div className="h-2.5 w-16 rounded bg-zinc-200 dark:bg-zinc-600" />
            </div>
            <div className="mt-1.5 h-5 w-14 rounded bg-zinc-200 sm:mt-2 sm:h-6 dark:bg-zinc-600" />
            <div className="mt-1 h-2.5 w-10 rounded bg-zinc-200 dark:bg-zinc-600" />
          </div>
        ))}
        {/* UV Index spans full width */}
        <div className="col-span-2 rounded-lg bg-zinc-50 p-2 sm:p-3 dark:bg-zinc-700/50">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="h-4 w-4 rounded bg-zinc-200 sm:h-5 sm:w-5 dark:bg-zinc-600" />
            <div className="h-2.5 w-16 rounded bg-zinc-200 dark:bg-zinc-600" />
          </div>
          <div className="mt-1.5 h-5 w-20 rounded bg-zinc-200 sm:mt-2 sm:h-6 dark:bg-zinc-600" />
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 sm:mt-2 sm:h-2 dark:bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}

/**
 * Timeline slider skeleton
 */
export function TimelineSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl bg-white p-3 shadow-lg sm:p-4 dark:bg-zinc-800"
      data-testid="timeline-skeleton"
      role="status"
      aria-label="Loading timeline"
    >
      <div className="mb-2 h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-14 w-full rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="mt-2 flex justify-between">
        <div className="h-2.5 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-2.5 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-2.5 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

/**
 * Suggestion banner skeleton
 */
export function SuggestionSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl bg-blue-50 p-3 shadow-lg sm:p-4 dark:bg-blue-900/20"
      data-testid="suggestion-skeleton"
      role="status"
      aria-label="Loading suggestions"
    >
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-blue-200 dark:bg-blue-800" />
        <div className="h-3.5 w-48 rounded bg-blue-200 sm:w-64 dark:bg-blue-800" />
      </div>
    </div>
  );
}
