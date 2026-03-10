import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  proxyPageSize: number;
  serverPageSize: number;
  frpsDashboardUrl: string;
  setLanguage: (lang: 'en' | 'zh') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setProxyPageSize: (size: number) => void;
  setServerPageSize: (size: number) => void;
  setFrpsDashboardUrl: (url: string) => void;
}

// Detect browser language for default
const browserLang = navigator.language.toLowerCase();
const defaultLang = browserLang.startsWith('zh') ? 'zh' : 'en';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: defaultLang as 'en' | 'zh',
      theme: 'dark',
      proxyPageSize: 20,
      serverPageSize: 12,
      frpsDashboardUrl: '',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setProxyPageSize: (proxyPageSize) => set({ proxyPageSize }),
      setServerPageSize: (serverPageSize) => set({ serverPageSize }),
      setFrpsDashboardUrl: (frpsDashboardUrl) => set({ frpsDashboardUrl }),
    }),
    {
      name: 'app-settings',
    }
  )
);
