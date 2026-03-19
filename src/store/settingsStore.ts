import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: 'en' | 'zh';
  theme: 'light' | 'dark' | 'system';
  proxyPageSize: number;
  serverPageSize: number;
  frpsDashboardUrl: string;
  frpsUsername: string;
  frpsPassword: string;
  setLanguage: (lang: 'en' | 'zh') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setProxyPageSize: (size: number) => void;
  setServerPageSize: (size: number) => void;
  setFrpsDashboardUrl: (url: string) => void;
  setFrpsUsername: (user: string) => void;
  setFrpsPassword: (pwd: string) => void;
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
      frpsUsername: '',
      frpsPassword: '',
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setProxyPageSize: (proxyPageSize) => set({ proxyPageSize }),
      setServerPageSize: (serverPageSize) => set({ serverPageSize }),
      setFrpsDashboardUrl: (frpsDashboardUrl) => set({ frpsDashboardUrl }),
      setFrpsUsername: (frpsUsername) => set({ frpsUsername }),
      setFrpsPassword: (frpsPassword) => set({ frpsPassword }),
    }),
    {
      name: 'app-settings',
    }
  )
);
