'use client';

import { FiMoon, FiSun } from 'react-icons/fi';
import { useThemeMode } from '../hooks/use-theme-mode';

type ConsoleThemeToggleProps = {
  compact?: boolean;
};

export default function ConsoleThemeToggle({ compact = false }: ConsoleThemeToggleProps) {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeMode();
  const isLightActive = themeMode === 'light' || (themeMode === 'system' && resolvedTheme === 'light');
  const isDarkActive = themeMode === 'dark' || (themeMode === 'system' && resolvedTheme === 'dark');

  return (
    <div
      className={`inline-flex items-center rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1 shadow-[0_16px_35px_-28px_rgba(8,35,84,0.7)] ${compact ? 'gap-1' : 'gap-1.5'}`}
      role="group"
      aria-label="Seleccionar tema"
    >
      <button
        type="button"
        onClick={() => setThemeMode('light')}
        suppressHydrationWarning
        className={`flex items-center justify-center rounded-full transition ${compact ? 'h-9 w-9' : 'h-10 w-10'} ${
          isLightActive
            ? 'bg-[var(--ui-accent)] text-white shadow-[0_12px_28px_-18px_rgba(32,94,255,0.85)]'
            : 'text-[var(--ui-muted)] hover:bg-[var(--ui-surface-strong)] hover:text-[var(--ui-foreground)]'
        }`}
        aria-label="Modo claro"
        title="Modo claro"
      >
        <FiSun size={compact ? 15 : 16} />
      </button>
      <button
        type="button"
        onClick={() => setThemeMode('dark')}
        suppressHydrationWarning
        className={`flex items-center justify-center rounded-full transition ${compact ? 'h-9 w-9' : 'h-10 w-10'} ${
          isDarkActive
            ? 'bg-[var(--ui-accent)] text-white shadow-[0_12px_28px_-18px_rgba(32,94,255,0.85)]'
            : 'text-[var(--ui-muted)] hover:bg-[var(--ui-surface-strong)] hover:text-[var(--ui-foreground)]'
        }`}
        aria-label="Modo oscuro"
        title="Modo oscuro"
      >
        <FiMoon size={compact ? 15 : 16} />
      </button>
    </div>
  );
}
