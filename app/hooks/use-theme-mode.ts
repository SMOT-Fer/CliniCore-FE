'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'starmot-theme-mode';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'light' || mode === 'dark') return mode;

  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
};

const applyTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const resolvedTheme = resolveTheme(mode);
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
};

const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
    return storedMode;
  }

  return 'system';
};

export function useThemeMode() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(readStoredMode()));
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    applyTheme(themeMode);
    setResolvedTheme(resolveTheme(themeMode));
  }, [themeMode]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handlePreferenceChange = () => {
      if (themeMode === 'system') {
        applyTheme('system');
        setResolvedTheme(resolveTheme('system'));
      }
    };

    mediaQuery.addEventListener('change', handlePreferenceChange);
    return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
  }, [themeMode]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-switching');

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = window.setTimeout(() => {
        document.documentElement.classList.remove('theme-switching');
        transitionTimerRef.current = null;
      }, 420);
    }

    setThemeModeState(nextMode);
    setResolvedTheme(resolveTheme(nextMode));

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }

    applyTheme(nextMode);
  }, []);

  return {
    themeMode,
    resolvedTheme,
    setThemeMode
  };
}
