'use client';

import { useState, useCallback } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string; // State/Province
}

export interface LocationPickerProps {
  /** Current GPS location from useLocation hook */
  gpsLocation: { latitude: number | null; longitude: number | null } | null;
  /** Whether GPS is currently loading */
  gpsLoading?: boolean;
  /** Error from GPS location */
  gpsError?: string | null;
  /** Callback when location changes */
  onLocationChange: (location: LocationData) => void;
  /** Callback to request GPS location */
  onRequestGps?: () => void;
  /** Currently selected location */
  currentLocation?: LocationData | null;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  country_code: string;
  timezone: string;
  population?: number;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

/**
 * Geocode a location query using Open-Meteo's free geocoding API
 */
async function geocodeLocation(query: string): Promise<LocationData[]> {
  // Detect if input is a US ZIP code (5 digits)
  const isZipCode = /^\d{5}$/.test(query.trim());

  // Build the API URL
  const baseUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  });

  // For US ZIP codes, prefer US results
  if (isZipCode) {
    params.set('country_code', 'US');
  }

  const response = await fetch(`${baseUrl}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to geocode location');
  }

  const data: GeocodingResponse = await response.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map((result) => ({
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name,
    country: result.country,
    admin1: result.admin1,
  }));
}

/**
 * Reverse geocode coordinates to get location name
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData | null> {
  // Open-Meteo doesn't have a reverse geocoding API, so we'll use a simple approach
  // by searching for the nearest named location using coordinates
  const baseUrl = 'https://geocoding-api.open-meteo.com/v1/search';
  const params = new URLSearchParams({
    name: `${latitude.toFixed(2)},${longitude.toFixed(2)}`,
    count: '1',
    language: 'en',
    format: 'json',
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (response.ok) {
      const data: GeocodingResponse = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          name: result.name,
          country: result.country,
          admin1: result.admin1,
        };
      }
    }
  } catch {
    // Silently fail - we'll just show coordinates
  }

  // Fallback to just showing coordinates
  return {
    latitude,
    longitude,
    name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
  };
}

/**
 * Format location for display
 */
function formatLocationDisplay(location: LocationData): string {
  const parts = [location.name];
  if (location.admin1) {
    parts.push(location.admin1);
  }
  if (location.country && location.country !== 'United States') {
    parts.push(location.country);
  }
  return parts.join(', ');
}

/**
 * Location picker component for manual location entry
 * PRD-011: Build location picker component for manual location entry
 */
export function LocationPicker({
  gpsLocation,
  gpsLoading = false,
  gpsError,
  onLocationChange,
  onRequestGps,
  currentLocation,
}: LocationPickerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useGps, setUseGps] = useState(true);

  // Handle search input
  const handleSearch = useCallback(async () => {
    const query = inputValue.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await geocodeLocation(query);
      setSearchResults(results);
      setShowResults(true);

      if (results.length === 0) {
        setError('No locations found. Try a different search term.');
      }
    } catch {
      setError('Failed to search for location. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [inputValue]);

  // Handle selecting a search result
  const handleSelectLocation = useCallback(
    (location: LocationData) => {
      setUseGps(false);
      setShowResults(false);
      setInputValue('');
      setSearchResults([]);
      onLocationChange(location);
    },
    [onLocationChange]
  );

  // Handle switching to GPS
  const handleUseGps = useCallback(async () => {
    setUseGps(true);
    setShowResults(false);
    setInputValue('');
    setSearchResults([]);
    setError(null);

    // Request fresh GPS location if callback provided
    if (onRequestGps) {
      onRequestGps();
    }

    // If we already have GPS coordinates, reverse geocode them
    if (gpsLocation?.latitude != null && gpsLocation?.longitude != null) {
      const location = await reverseGeocode(
        gpsLocation.latitude,
        gpsLocation.longitude
      );
      if (location) {
        onLocationChange(location);
      }
    }
  }, [gpsLocation, onLocationChange, onRequestGps]);

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const hasGpsCoords =
    gpsLocation?.latitude != null && gpsLocation?.longitude != null;

  return (
    <div className="relative w-full" data-testid="location-picker">
      {/* Current location display */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="location">
            {useGps ? '📍' : '🔍'}
          </span>
          <div>
            <p
              className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
              data-testid="location-source"
            >
              {useGps ? 'GPS Location' : 'Manual Location'}
            </p>
            <p
              className="font-semibold text-zinc-900 dark:text-zinc-100"
              data-testid="location-name"
            >
              {gpsLoading
                ? 'Getting location...'
                : currentLocation
                  ? formatLocationDisplay(currentLocation)
                  : gpsError || 'Location not set'}
            </p>
          </div>
        </div>

        {/* GPS toggle button */}
        {!useGps && hasGpsCoords && (
          <button
            type="button"
            onClick={handleUseGps}
            className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
            data-testid="use-gps-button"
          >
            Use GPS
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Enter ZIP code or city name..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400"
            aria-label="Search for location"
            data-testid="location-input"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !inputValue.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            data-testid="search-button"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-auto rounded-lg border border-zinc-300 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-700"
            role="listbox"
            data-testid="search-results"
          >
            {searchResults.map((result, index) => (
              <li key={`${result.latitude}-${result.longitude}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleSelectLocation(result)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-600"
                  role="option"
                  aria-selected={false}
                  data-testid={`search-result-${index}`}
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {result.name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {[result.admin1, result.country].filter(Boolean).join(', ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          className="mt-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
          data-testid="location-error"
        >
          {error}
        </p>
      )}

      {/* GPS error message */}
      {useGps && gpsError && (
        <p
          className="mt-2 text-sm text-amber-600 dark:text-amber-400"
          role="alert"
          data-testid="gps-error"
        >
          {gpsError}
        </p>
      )}

      {/* Backdrop for closing results */}
      {showResults && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowResults(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
