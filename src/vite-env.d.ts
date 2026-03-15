/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FRPC_GUI_MODE: string
  readonly FRPC_CONFIG_PATH: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron window extensions
interface Window {
  electron?: {
    openExternal: (url: string) => Promise<void>;
    platform?: NodeJS.Platform;
  };
}