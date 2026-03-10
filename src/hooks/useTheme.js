import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import useThemeStore from '../store/themeStore';
import { COLORS } from '../utils/constants';

/**
 * Custom hook for dark/light mode backed by a global Zustand store.
 * All screens share the same state — toggling in one updates everywhere.
 *
 * Usage:
 *   const { isDark, theme, colors, toggleTheme, setTheme } = useTheme();
 */
const useTheme = () => {
  const systemColorScheme = useColorScheme(); // 'dark' | 'light' | null
  const { themePreference, loaded, loadTheme, toggleTheme: storeToggle, setTheme } = useThemeStore();

  // Load persisted preference once on first mount
  useEffect(() => {
    if (!loaded) {
      loadTheme();
    }
  }, [loaded]);

  // Determine actual isDark value
  const isDark =
    themePreference === 'dark'
      ? true
      : themePreference === 'light'
      ? false
      : systemColorScheme === 'dark';

  // Color set based on current mode
  const colors = isDark ? COLORS.dark : COLORS.light;

  // Toggle wraps store method with current isDark value
  const toggleTheme = () => storeToggle(isDark);

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    themePreference,
    colors,
    primaryColors: COLORS,
    toggleTheme,
    setTheme,
    loaded,
  };
};

export default useTheme;
