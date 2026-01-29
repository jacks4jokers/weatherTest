'use client';

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { TimelinePoint } from '@/types/weather';

export interface TimelineSliderProps {
  /** The weather timeline points to display */
  timeline: TimelinePoint[];
  /** Currently selected timeline point */
  selectedPoint: TimelinePoint | null;
  /** Callback when user selects a different time */
  onTimeChange: (point: TimelinePoint) => void;
}

/**
 * Formats a timestamp for display on the timeline
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  if (minutes === 0) {
    return `${displayHours}${ampm}`;
  }
  return `${displayHours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats a timestamp as relative time (e.g., "2h ago", "in 30m")
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = time - now;
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (Math.abs(diffMins) < 60) {
    if (diffMins === 0) return 'now';
    return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }

  return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
}

/**
 * Timeline slider component for scrubbing through weather data
 * PRD-009: Build timeline slider component with past/future visualization
 */
export function TimelineSlider({
  timeline,
  selectedPoint,
  onTimeChange,
}: TimelineSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Track "now" timestamp for stability during render cycle
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  // Update nowTimestamp periodically to keep "current time" fresh
  useEffect(() => {
    // Update every minute to keep the current time marker fresh
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Find the index of the current time (closest to now) - computed, not state
  const currentTimeIndex = useMemo(() => {
    if (timeline.length === 0) return -1;

    let closestIndex = 0;
    let closestDiff = Infinity;

    timeline.forEach((point, index) => {
      const diff = Math.abs(new Date(point.timestamp).getTime() - nowTimestamp);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [timeline, nowTimestamp]);

  // Find index of selected point
  const selectedIndex = selectedPoint
    ? timeline.findIndex((p) => p.timestamp === selectedPoint.timestamp)
    : currentTimeIndex;

  // Calculate position from index
  const getPositionFromIndex = useCallback(
    (index: number): number => {
      if (timeline.length <= 1) return 0;
      return (index / (timeline.length - 1)) * 100;
    },
    [timeline.length]
  );

  // Get index from position percentage
  const getIndexFromPosition = useCallback(
    (positionPercent: number): number => {
      if (timeline.length <= 1) return 0;
      const index = Math.round((positionPercent / 100) * (timeline.length - 1));
      return Math.max(0, Math.min(timeline.length - 1, index));
    },
    [timeline.length]
  );

  // Handle pointer events for dragging
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!trackRef.current || timeline.length === 0) return;

      e.preventDefault();
      setIsDragging(true);

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const positionPercent = (x / rect.width) * 100;
      const index = getIndexFromPosition(positionPercent);

      onTimeChange(timeline[index]);

      // Capture pointer for drag
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [timeline, getIndexFromPosition, onTimeChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !trackRef.current || timeline.length === 0) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const positionPercent = (x / rect.width) * 100;
      const index = getIndexFromPosition(positionPercent);

      onTimeChange(timeline[index]);
    },
    [isDragging, timeline, getIndexFromPosition, onTimeChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Determine which tick marks to show
  const getTickMarks = useCallback(() => {
    if (timeline.length === 0) return [];

    const ticks: Array<{
      index: number;
      type: 'current' | 'hour' | '5min';
      label?: string;
    }> = [];

    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    timeline.forEach((point, index) => {
      const time = new Date(point.timestamp);
      const diffMs = time.getTime() - now;
      const minutes = time.getMinutes();

      // Current time marker
      if (index === currentTimeIndex) {
        ticks.push({ index, type: 'current', label: 'Now' });
        return;
      }

      // Within 2 hours of future: show 5-minute ticks (but only label hours)
      if (diffMs >= 0 && diffMs <= twoHoursMs) {
        if (minutes === 0) {
          ticks.push({ index, type: 'hour', label: formatTime(point.timestamp) });
        } else if (minutes % 15 === 0) {
          // Show tick at 15-min intervals for visual reference
          ticks.push({ index, type: '5min' });
        }
        return;
      }

      // Beyond 2 hours: show hourly ticks
      if (minutes === 0) {
        // Show label every 2-3 hours to avoid clutter
        const hours = time.getHours();
        const shouldLabel = hours % 3 === 0 || hours === 12 || hours === 0;
        ticks.push({
          index,
          type: 'hour',
          label: shouldLabel ? formatTime(point.timestamp) : undefined,
        });
      }
    });

    return ticks;
  }, [timeline, currentTimeIndex]);

  const tickMarks = getTickMarks();

  // Calculate the index where the 2-hour highlight ends
  // Using useMemo to avoid calling Date.now() during render
  const twoHourEndIndex = useMemo(() => {
    if (timeline.length === 0 || currentTimeIndex < 0) return -1;

    // Get the timestamp at currentTimeIndex and add 2 hours
    const currentTimestamp = timeline[currentTimeIndex]?.timestamp;
    if (!currentTimestamp) return -1;

    const twoHoursLater = new Date(currentTimestamp).getTime() + 2 * 60 * 60 * 1000;

    // Find the first point after 2 hours from current time
    const idx = timeline.findIndex(
      (p) => new Date(p.timestamp).getTime() > twoHoursLater
    );

    return idx === -1 ? timeline.length : idx;
  }, [timeline, currentTimeIndex]);

  if (timeline.length === 0) {
    return (
      <div className="w-full px-4 py-6">
        <div className="h-12 flex items-center justify-center text-zinc-400">
          No timeline data available
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full px-4 py-6 select-none touch-none"
      data-testid="timeline-slider"
    >
      {/* Selected time display */}
      <div className="mb-4 text-center">
        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedPoint ? formatTime(selectedPoint.timestamp) : '—'}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          {selectedPoint ? formatRelativeTime(selectedPoint.timestamp) : '—'}
        </div>
      </div>

      {/* Track container - touch target area (44px+ height) */}
      <div
        ref={trackRef}
        className="relative h-14 cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={timeline.length - 1}
        aria-valuenow={selectedIndex}
        aria-valuetext={
          selectedPoint
            ? `${formatTime(selectedPoint.timestamp)}, ${formatRelativeTime(selectedPoint.timestamp)}`
            : 'No time selected'
        }
        tabIndex={0}
      >
        {/* Track background */}
        <div className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-700">
          {/* Past section (darker) */}
          <div
            className="absolute top-0 left-0 h-full rounded-l-full bg-zinc-300 dark:bg-zinc-600"
            style={{
              width: `${getPositionFromIndex(currentTimeIndex)}%`,
            }}
          />

          {/* Next 2 hours section (highlighted) */}
          {currentTimeIndex >= 0 && twoHourEndIndex >= 0 && (
            <div
              className="absolute top-0 h-full bg-blue-200 dark:bg-blue-800"
              style={{
                left: `${getPositionFromIndex(currentTimeIndex)}%`,
                width: `${Math.min(
                  getPositionFromIndex(twoHourEndIndex) - getPositionFromIndex(currentTimeIndex),
                  100 - getPositionFromIndex(currentTimeIndex)
                )}%`,
              }}
            />
          )}
        </div>

        {/* Tick marks */}
        {tickMarks.map((tick) => (
          <div
            key={tick.index}
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
            style={{ left: `${getPositionFromIndex(tick.index)}%` }}
          >
            {/* Tick line */}
            <div
              className={`w-0.5 ${
                tick.type === 'current'
                  ? 'h-8 bg-red-500'
                  : tick.type === 'hour'
                  ? 'h-4 bg-zinc-400 dark:bg-zinc-500'
                  : 'h-2 bg-zinc-300 dark:bg-zinc-600'
              }`}
            />

            {/* Label */}
            {tick.label && (
              <div
                className={`absolute top-full mt-1 text-xs whitespace-nowrap ${
                  tick.type === 'current'
                    ? 'text-red-500 font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
                style={{ transform: 'translateX(-50%)' }}
              >
                {tick.label}
              </div>
            )}
          </div>
        ))}

        {/* Thumb / handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white dark:border-zinc-800 shadow-lg transition-transform ${
            isDragging ? 'scale-125 bg-blue-600' : 'bg-blue-500'
          }`}
          style={{ left: `${getPositionFromIndex(selectedIndex)}%` }}
          data-testid="timeline-thumb"
        />
      </div>

      {/* Timeline range labels */}
      <div className="flex justify-between mt-6 text-xs text-zinc-400">
        <span>8h ago</span>
        <span>Now</span>
        <span>+48h</span>
      </div>
    </div>
  );
}
