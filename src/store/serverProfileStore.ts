import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ServerProfile } from '@/shared/types';

interface ServerProfileState {
  profiles: ServerProfile[];
  saveProfile: (profile: ServerProfile) => void;
  removeProfile: (id: string) => void;
}

export const useServerProfileStore = create<ServerProfileState>()(
  persist(
    (set) => ({
      profiles: [],
      saveProfile: (profile) =>
        set((state) => {
          const existingIndex = state.profiles.findIndex((p) => p.id === profile.id);
          if (existingIndex === -1) {
            return { profiles: [...state.profiles, profile] };
          }
          const next = [...state.profiles];
          next[existingIndex] = profile;
          return { profiles: next };
        }),
      removeProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        })),
    }),
    {
      name: 'frpc-server-profiles',
    },
  ),
);

