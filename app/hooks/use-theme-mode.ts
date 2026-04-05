'use client';

import { useCallback, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'starmot-theme-mode';

const applyLightTheme = () => {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.themeMode = 'light';
  document.documentElement.dataset.theme = 'light';
  document.documentElement.style.colorScheme = 'light';
};

export function useThemeMode() {
  useEffect(() => {
    applyLightTheme();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setThemeMode = useCallback((_nextMode: ThemeMode) => {
    applyLightTheme();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    themeMode: 'light' as ThemeMode,
    resolvedTheme: 'light' as const,
    setThemeMode
  };
}
