import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

const useThemeStore = create((set, get) => ({
  themePreference: 'dark', // 'system' | 'dark' | 'light'
  loaded: false,

  // Load persisted preference from AsyncStorage
  loadTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      if (stored && ['system', 'dark', 'light'].includes(stored)) {
        set({ themePreference: stored, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch (error) {
      // Failed to load theme, using default
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
}));

export default useThemeStore;
