import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FrpcProcessInfo } from '../shared/types';
import { ApiClient } from '@/lib/api';

interface FrpcState {
  isConnected: boolean;
  sessionId: string | null;
  processInfo: FrpcProcessInfo | null;
  configPath: string | null;
  restartRequired: boolean;
  setConnected: (sessionId: string, processInfo: FrpcProcessInfo | null) => void;
  setProcessInfo: (processInfo: FrpcProcessInfo | null) => void;
  disconnect: () => void;
  setConfigPath: (path: string) => void;
  setRestartRequired: (required: boolean) => void;
}

export const useFrpcStore = create<FrpcState>()(
  persist(
    (set) => ({
      isConnected: false,
      sessionId: null,
      processInfo: null,
      configPath: null,
      restartRequired: false,
      setConnected: (sessionId, processInfo) => {
        ApiClient.setSessionId(sessionId);
        set({
          isConnected: true,
          sessionId,
          processInfo,
          configPath: processInfo?.configPath || null,
        });
      },
      setProcessInfo: (processInfo) =>
        set({
          processInfo,
          configPath: processInfo?.configPath || null,
        }),
      disconnect: () => {
        // First clear the API session to prevent re-auto-connect
        ApiClient.setSessionId('');
        // Then update the store state
        set({
          isConnected: false,
          sessionId: null,
          processInfo: null,
          configPath: null,
          restartRequired: false,
        });
      },
      setConfigPath: (path) => set({ configPath: path }),
      setRestartRequired: (required) => set({ restartRequired: required }),
    }),
    {
      name: 'frpc-store',
      partialize: (state) => ({
        isConnected: state.isConnected,
        sessionId: state.sessionId,
        processInfo: state.processInfo,
        configPath: state.configPath,
        restartRequired: state.restartRequired,
      }),
    }
  )
);
