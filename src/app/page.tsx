'use client';

import { useState, useMemo } from 'react';
import { TimelineSlider } from '@/components/TimelineSlider';
import { WeatherCard } from '@/components/WeatherCard';
import type { TimelinePoint, WeatherCode } from '@/types/weather';

/**
 * Generate mock timeline data for testing
 */
function generateMockTimeline(): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  const now = new Date();

  // Round to nearest hour
  now.setMinutes(0, 0, 0);

  // Generate past 8 hours (hourly)
  for (let i = -8; i < 0; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    points.push(createMockPoint(timestamp));
  }

  // Generate next 2 hours (5-minute intervals = 24 points)
  for (let i = 0; i <= 24; i++) {
    const timestamp = new Date(now.getTime() + i * 5 * 60 * 1000);
    points.push(createMockPoint(timestamp));
  }

  // Generate remaining 46 hours (hourly)
  for (let i = 3; i <= 48; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    points.push(createMockPoint(timestamp));
  }

  return points;
}

function createMockPoint(timestamp: Date): TimelinePoint {
  const hour = timestamp.getHours();
  // Vary temperature by time of day
  const baseTemp = 55 + Math.sin((hour / 24) * Math.PI * 2) * 15;

  return {
    timestamp: timestamp.toISOString(),
    weather: {
      temperature: Math.round(baseTemp + Math.random() * 5),
      feelsLike: Math.round(baseTemp + Math.random() * 5 - 3),
      precipitation: Math.round(Math.random() * 100),
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed: Math.round(5 + Math.random() * 15),
      windDirection: 'NW',
      visibility: 10,
      uvIndex: hour >= 6 && hour <= 18 ? Math.round(Math.random() * 8) : 0,
      weatherCode: [0, 1, 2, 3, 61, 80][
        Math.floor(Math.random() * 6)
      ] as WeatherCode,
    },
  };
}

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
  const timeline = useMemo(() => generateMockTimeline(), []);

  // Initialize selected point to the closest to current time (uses lazy initializer)
  const [selectedPoint, setSelectedPoint] = useState<TimelinePoint | null>(
    () => findClosestPoint(timeline, Date.now())
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <main className="w-full max-w-md space-y-6">
        <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Weather Timeline
        </h1>

        {/* Weather card - updates based on slider position */}
        {selectedPoint && (
          <WeatherCard
            weather={selectedPoint.weather}
            timeLabel={formatTimeLabel(selectedPoint.timestamp)}
            isCurrentTime={isCurrentTime(selectedPoint.timestamp)}
          />
        )}

        {/* Timeline slider component */}
        <div className="rounded-xl bg-white p-4 shadow-lg dark:bg-zinc-800">
          <TimelineSlider
            timeline={timeline}
            selectedPoint={selectedPoint}
            onTimeChange={setSelectedPoint}
          />
        </div>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Drag the slider to see weather at different times
        </p>
      </main>
    </div>
  );
}
