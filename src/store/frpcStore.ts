import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FrpcProcessInfo } from '../shared/types';

interface FrpcState {
  isConnected: boolean;
  sessionId: string | null;
  processInfo: FrpcProcessInfo | null;
  configPath: string | null;
  setConnected: (sessionId: string, processInfo: FrpcProcessInfo | null) => void;
  setProcessInfo: (processInfo: FrpcProcessInfo | null) => void;
  disconnect: () => void;
  setConfigPath: (path: string) => void;
}

export const useFrpcStore = create<FrpcState>()(
  persist(
    (set) => ({
      isConnected: false,
      sessionId: null,
      processInfo: null,
      configPath: null,
      setConnected: (sessionId, processInfo) =>
        set({
          isConnected: true,
          sessionId,
          processInfo,
          configPath: processInfo?.configPath || null,
        }),
      setProcessInfo: (processInfo) =>
        set({
          processInfo,
          configPath: processInfo?.configPath || null,
        }),
      disconnect: () =>
        set({
          isConnected: false,
          sessionId: null,
          processInfo: null,
          configPath: null,
        }),
      setConfigPath: (path) => set({ configPath: path }),
    }),
    {
      name: 'frpc-store',
      partialize: (state) => ({
        isConnected: state.isConnected,
        sessionId: state.sessionId,
        processInfo: state.processInfo,
        configPath: state.configPath,
      }),
    }
  )
);
