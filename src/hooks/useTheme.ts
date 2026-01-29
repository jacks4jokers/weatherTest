'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface UseThemeReturn {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Resolved theme based on system preference when theme is 'system' */
  resolvedTheme: 'light' | 'dark';
  /** Set the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (skips system) */
  toggleTheme: () => void;
}

const STORAGE_KEY = 'weather-app-theme';

/**
 * Get the system color scheme preference
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme from localStorage
 */
function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

/**
 * Apply theme to document
 */
function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook to manage dark/light mode theme
 * PRD-016: Add dark/light mode support
 *
 * Features:
 * - Detects system color scheme preference
 * - Supports manual toggle
 * - Persists preference to localStorage
 * - Syncs with system changes when in 'system' mode
 */
export function useTheme(): UseThemeReturn {
  // Initialize with system preference, then hydrate from localStorage
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    const initialTheme = stored ?? 'system';
    const resolved = initialTheme === 'system' ? getSystemTheme() : initialTheme;

    // Apply theme immediately to the DOM (not state)
    applyTheme(resolved);

    // Use queueMicrotask to avoid synchronous setState in effect
    queueMicrotask(() => {
      setThemeState(initialTheme);
      setResolvedTheme(resolved);
      setMounted(true);
    });
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}
