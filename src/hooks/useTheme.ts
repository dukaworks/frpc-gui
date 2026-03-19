import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [hasHydrated, setHasHydrated] = useState(
    useSettingsStore.persist?.hasHydrated?.() ?? true
  );

  useEffect(() => {
    // If already hydrated, we're done
    if (useSettingsStore.persist?.hasHydrated?.()) {
      setHasHydrated(true);
      return;
    }
    // Otherwise subscribe to hydration completion
    const unsub = useSettingsStore.persist?.onFinishHydration?.(() => {
      setHasHydrated(true);
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    // Don't apply theme class until persisted state has rehydrated from localStorage.
    // This prevents a flash from default 'dark' to a stale 'light' from localStorage.
    if (!hasHydrated) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, hasHydrated]);

  // Listen for system theme changes if mode is system
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    isDark: theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
}
