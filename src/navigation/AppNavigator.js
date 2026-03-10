import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import useAuthStore from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import useTheme from '../hooks/useTheme';
import { COLORS, ROUTES } from '../utils/constants';
import { addNotificationResponseListener } from '../services/notificationService';

const AppNavigator = () => {
  const { user, profile, loading, initAuth } = useAuthStore();
  const { isDark, colors } = useTheme();
  const navigationRef = useRef(null);

  // Initialize Firebase auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    const cleanup = addNotificationResponseListener((screenName) => {
      if (navigationRef.current) {
        navigationRef.current.navigate(screenName);
      }
    });
    return cleanup;
  }, []);

  // Show splash/loading while Firebase auth is initializing
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  const isAuthenticated = !!user;
  const hasCompletedProfile = !!profile;

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isAuthenticated && hasCompletedProfile ? (
        <MainNavigator />
      ) : isAuthenticated && !hasCompletedProfile ? (
        <AuthNavigator initialRoute={ROUTES.PROFILE_SETUP} />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
