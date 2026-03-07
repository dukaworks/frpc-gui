import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SSHConfig } from '../shared/types';

interface UserState {
  savedConnections: SSHConfig[];
  addConnection: (config: Omit<SSHConfig, 'id'>) => void;
  removeConnection: (id: string) => void;
  updateConnection: (id: string, config: Partial<SSHConfig>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      savedConnections: [],
      addConnection: (config) => set((state) => ({
        savedConnections: [
          ...state.savedConnections,
          { ...config, id: Math.random().toString(36).substring(7), lastConnected: Date.now() }
        ]
      })),
      removeConnection: (id) => set((state) => ({
        savedConnections: state.savedConnections.filter((c) => c.id !== id)
      })),
      updateConnection: (id, config) => set((state) => ({
        savedConnections: state.savedConnections.map((c) => 
          c.id === id ? { ...c, ...config } : c
        )
      })),
    }),
    {
      name: 'frpc-user-storage',
    }
  )
);
