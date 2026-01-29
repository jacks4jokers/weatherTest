'use client';

import { useTheme, type Theme } from '@/hooks/useTheme';

export interface ThemeToggleProps {
  /** Show theme options dropdown instead of simple toggle */
  showOptions?: boolean;
}

/**
 * Get icon for theme
 */
function getThemeIcon(theme: Theme, resolvedTheme: 'light' | 'dark'): string {
  if (theme === 'system') {
    return '💻';
  }
  return resolvedTheme === 'dark' ? '🌙' : '☀️';
}

/**
 * Get label for theme
 */
function getThemeLabel(theme: Theme): string {
  switch (theme) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'system':
      return 'System';
  }
}

/**
 * Theme toggle component
 * PRD-016: Add dark/light mode support
 *
 * Provides a simple toggle button that cycles through light/dark/system themes,
 * or shows theme options for more control.
 */
export function ThemeToggle({ showOptions = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // Simple toggle mode - cycles through light -> dark -> system
  if (!showOptions) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="flex items-center justify-center rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
        aria-label={`Toggle theme (currently ${resolvedTheme})`}
        data-testid="theme-toggle"
      >
        <span className="text-xl" aria-hidden="true">
          {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </span>
      </button>
    );
  }

  // Options mode - shows all three choices
  const themes: Theme[] = ['light', 'dark', 'system'];

  return (
    <div
      className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-700"
      role="radiogroup"
      aria-label="Theme selection"
      data-testid="theme-options"
    >
      {themes.map((t) => {
        const isActive = theme === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
              isActive
                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-600 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
            role="radio"
            aria-checked={isActive}
            data-testid={`theme-option-${t}`}
          >
            <span aria-hidden="true">{getThemeIcon(t, resolvedTheme)}</span>
            <span className="hidden sm:inline">{getThemeLabel(t)}</span>
          </button>
        );
      })}
    </div>
  );
}
