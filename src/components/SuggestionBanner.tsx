'use client';

import { useState, useMemo } from 'react';
import type { TimelinePoint } from '@/types/weather';
import {
  generateWeatherSuggestions,
  type WeatherSuggestion,
  type SuggestionPriority,
} from '@/utils/weatherSuggestions';

interface SuggestionBannerProps {
  /** Weather timeline data for generating suggestions */
  timeline: TimelinePoint[];
  /** Current time for suggestion generation (defaults to now) */
  currentTime?: Date;
}

/**
 * Get background color class based on suggestion priority
 */
function getPriorityColor(priority: SuggestionPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700';
    case 'medium':
      return 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700';
    case 'low':
      return 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700';
  }
}

/**
 * Get text color class based on suggestion priority
 */
function getPriorityTextColor(priority: SuggestionPriority): string {
  switch (priority) {
    case 'high':
      return 'text-red-800 dark:text-red-200';
    case 'medium':
      return 'text-amber-800 dark:text-amber-200';
    case 'low':
      return 'text-blue-800 dark:text-blue-200';
  }
}

/**
 * SuggestionBanner component
 * PRD-013: Build suggestion banner component
 *
 * Displays the top weather suggestion prominently with the ability
 * to dismiss or cycle through multiple suggestions.
 */
export function SuggestionBanner({ timeline, currentTime }: SuggestionBannerProps) {
  // Track dismissed suggestion IDs
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Generate suggestions from timeline data
  const allSuggestions = useMemo(() => {
    return generateWeatherSuggestions(timeline, currentTime);
  }, [timeline, currentTime]);

  // Filter out dismissed suggestions
  const activeSuggestions = useMemo(() => {
    return allSuggestions.filter((s) => !dismissedIds.has(s.id));
  }, [allSuggestions, dismissedIds]);

  // Current suggestion index for cycling
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index if it exceeds available suggestions
  const safeIndex = Math.min(currentIndex, Math.max(0, activeSuggestions.length - 1));
  const currentSuggestion: WeatherSuggestion | undefined = activeSuggestions[safeIndex];

  // Handle dismiss - remove current suggestion
  const handleDismiss = () => {
    if (currentSuggestion) {
      setDismissedIds((prev) => new Set(prev).add(currentSuggestion.id));
      // If we're at the end, move back; otherwise stay at same index
      if (safeIndex >= activeSuggestions.length - 1 && safeIndex > 0) {
        setCurrentIndex(safeIndex - 1);
      }
    }
  };

  // Handle cycle to next suggestion
  const handleNext = () => {
    if (activeSuggestions.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activeSuggestions.length);
    }
  };

  // Handle cycle to previous suggestion
  const handlePrevious = () => {
    if (activeSuggestions.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
    }
  };

  // No suggestions to display
  if (!currentSuggestion || activeSuggestions.length === 0) {
    return (
      <div
        data-testid="suggestion-banner-empty"
        className="rounded-xl border border-zinc-200 bg-zinc-100 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-800"
      >
        <p className="text-center text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
          No weather alerts right now
        </p>
      </div>
    );
  }

  const bgColor = getPriorityColor(currentSuggestion.priority);
  const textColor = getPriorityTextColor(currentSuggestion.priority);

  return (
    <div
      data-testid="suggestion-banner"
      className={`rounded-xl border p-3 sm:p-4 ${bgColor}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Icon */}
        <span
          data-testid="suggestion-icon"
          className="flex-shrink-0 text-xl sm:text-2xl"
          aria-hidden="true"
        >
          {currentSuggestion.icon}
        </span>

        {/* Message content */}
        <div className="min-w-0 flex-grow">
          <p
            data-testid="suggestion-message"
            className={`text-sm font-medium sm:text-base ${textColor}`}
          >
            {currentSuggestion.message}
          </p>

          {/* Navigation and dismiss controls */}
          <div className="mt-2 flex flex-wrap items-center gap-1 sm:gap-2">
            {/* Pagination indicator */}
            {activeSuggestions.length > 1 && (
              <span
                data-testid="suggestion-counter"
                className={`text-[10px] sm:text-xs ${textColor} opacity-70`}
              >
                {safeIndex + 1} of {activeSuggestions.length}
              </span>
            )}

            <div className="flex-grow" />

            {/* Navigation buttons */}
            {activeSuggestions.length > 1 && (
              <div className="flex gap-0.5 sm:gap-1">
                <button
                  data-testid="suggestion-prev"
                  onClick={handlePrevious}
                  className={`rounded p-1.5 text-xs sm:px-2 sm:py-1 ${textColor} hover:bg-black/10 dark:hover:bg-white/10`}
                  aria-label="Previous suggestion"
                >
                  ←
                </button>
                <button
                  data-testid="suggestion-next"
                  onClick={handleNext}
                  className={`rounded p-1.5 text-xs sm:px-2 sm:py-1 ${textColor} hover:bg-black/10 dark:hover:bg-white/10`}
                  aria-label="Next suggestion"
                >
                  →
                </button>
              </div>
            )}

            {/* Dismiss button */}
            <button
              data-testid="suggestion-dismiss"
              onClick={handleDismiss}
              className={`rounded p-1.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs ${textColor} hover:bg-black/10 dark:hover:bg-white/10`}
              aria-label="Dismiss suggestion"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
