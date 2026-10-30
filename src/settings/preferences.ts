import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const defaults = {
  theme: 'system' as 'system' | 'light' | 'dark',
  reduceMotion: false,
  contrast: false,
  largeText: false,
  continuous: true,
  spacious: false,
  quiet: false,
  credits: true,
  doubleTap: true,
  careReminders: false,
};
export type Preferences = typeof defaults;
export const usePreferences = create<
  Preferences & {
    change: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
    reset: () => void;
  }
>()(
  persist(
    (set) => ({
      ...defaults,
      change: (key, value) => set({ [key]: value }),
      reset: () => set(defaults),
    }),
    {
      name: 'virtual-closet-device-preferences-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) =>
        Object.fromEntries(
          Object.keys(defaults).map((key) => [key, state[key as keyof Preferences]]),
        ),
    },
  ),
);
