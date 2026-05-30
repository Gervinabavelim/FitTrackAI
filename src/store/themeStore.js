import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

const useThemeStore = create((set, get) => ({
  themePreference: 'dark', // 'system' | 'dark' | 'light'
  units: 'metric', // 'metric' | 'imperial'
  loaded: false,

  // Load persisted preferences from AsyncStorage
  loadTheme: async () => {
    try {
      const [storedTheme, storedUnits] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.UNITS),
      ]);
      const updates = { loaded: true };
      if (storedTheme && ['system', 'dark', 'light'].includes(storedTheme)) {
        updates.themePreference = storedTheme;
      }
      if (storedUnits && ['metric', 'imperial'].includes(storedUnits)) {
        updates.units = storedUnits;
      }
      set(updates);
    } catch (error) {
      set({ loaded: true });
    }
  },

  // Toggle between dark and light
  toggleTheme: async (currentIsDark) => {
    const newPref = currentIsDark ? 'light' : 'dark';
    set({ themePreference: newPref });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, newPref);
    } catch (error) {
      // Failed to persist theme
    }
  },

  // Explicitly set theme preference
  setTheme: async (preference) => {
    if (!['system', 'dark', 'light'].includes(preference)) return;
    set({ themePreference: preference });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, preference);
    } catch (error) {
      // Failed to persist theme
    }
  },

  // Toggle units between metric and imperial
  toggleUnits: async () => {
    const newUnits = get().units === 'metric' ? 'imperial' : 'metric';
    set({ units: newUnits });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UNITS, newUnits);
    } catch (error) {
      // Failed to persist units
    }
  },
}));

export default useThemeStore;
