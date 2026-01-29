'use client';

import { useState, useMemo } from 'react';
import { TimelineSlider } from '@/components/TimelineSlider';
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

export default function Home() {
  const timeline = useMemo(() => generateMockTimeline(), []);
  const [selectedPoint, setSelectedPoint] = useState<TimelinePoint | null>(
    null
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-900">
      <main className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg dark:bg-zinc-800">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Weather Timeline Demo
        </h1>

        {/* Selected time info */}
        {selectedPoint && (
          <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Temperature:</strong> {selectedPoint.weather.temperature}°F
              (feels like {selectedPoint.weather.feelsLike}°F)
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Precipitation:</strong> {selectedPoint.weather.precipitation}%
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Wind:</strong> {selectedPoint.weather.windSpeed} mph{' '}
              {selectedPoint.weather.windDirection}
            </p>
          </div>
        )}

        {/* Timeline slider component */}
        <TimelineSlider
          timeline={timeline}
          selectedPoint={selectedPoint}
          onTimeChange={setSelectedPoint}
        />

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Drag the slider to scrub through time. Touch-friendly with 44px+
          targets.
        </p>
      </main>
    </div>
  );
}
