import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAuthStore from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import useTheme from '../hooks/useTheme';
import { COLORS, ROUTES, STORAGE_KEYS } from '../utils/constants';
import { addNotificationResponseListener, setupNotifications } from '../services/notificationService';
import { trackScreen } from '../services/analyticsService';

const AppNavigator = () => {
  const { user, profile, loading, initAuth } = useAuthStore();
  const { isDark, colors } = useTheme();
  const navigationRef = useRef(null);
  const routeNameRef = useRef(null);
  const [onboardingDone, setOnboardingDone] = useState(null); // null = loading

  // Initialize Firebase auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Check onboarding status
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Auto-setup notifications when authenticated
  useEffect(() => {
    if (user && profile) {
      AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED).then((val) => {
        if (val === 'true') {
          setupNotifications(profile.name?.split(' ')[0]);
        }
      });
    }
  }, [user, profile]);

  // Handle notification taps — navigate to the relevant screen
  useEffect(() => {
    const cleanup = addNotificationResponseListener((screenName) => {
      if (navigationRef.current) {
        navigationRef.current.navigate(screenName);
      }
    });
    return cleanup;
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    setOnboardingDone(true);
  };

  // Track screen changes for analytics
  const onNavigationReady = () => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  };

  const onNavigationStateChange = () => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      trackScreen(currentRouteName);
      routeNameRef.current = currentRouteName;
    }
  };

  // Show splash/loading while Firebase auth is initializing
  if (loading || onboardingDone === null) {
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

  // Show onboarding for first-time users
  if (!onboardingDone) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  const isAuthenticated = !!user;
  const hasCompletedProfile = !!profile;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onNavigationReady}
      onStateChange={onNavigationStateChange}
    >
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
