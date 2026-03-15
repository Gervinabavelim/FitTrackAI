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
      console.warn('Failed to load theme preference:', error);
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
      console.warn('Failed to persist theme:', error);
    }
  },

  // Explicitly set theme preference
  setTheme: async (preference) => {
    if (!['system', 'dark', 'light'].includes(preference)) return;
    set({ themePreference: preference });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, preference);
    } catch (error) {
      console.warn('Failed to persist theme:', error);
    }
  },
}));

export default useThemeStore;
