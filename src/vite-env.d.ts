/// <reference types="vite/client" />

interface Window {
  electron?: {
    platform?: string;
    openExternal?: (url: string) => Promise<boolean>;
  };
}
