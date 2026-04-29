import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import DashboardScreen from '../screens/main/DashboardScreen';
import LogWorkoutScreen from '../screens/main/LogWorkoutScreen';
import AIScreen from '../screens/main/AIScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import useTheme from '../hooks/useTheme';
import useWorkoutStore from '../store/workoutStore';
import { COLORS, ROUTES } from '../utils/constants';

const Tab = createBottomTabNavigator();

const MainNavigator = () => {
  const { isDark, colors } = useTheme();
  const { streak } = useWorkoutStore();

  return (
    <Tab.Navigator
      initialRouteName={ROUTES.DASHBOARD}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isDark ? 'rgba(22,22,22,0.85)' : 'rgba(255,255,255,0.85)',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            [ROUTES.DASHBOARD]: focused ? 'home' : 'home-outline',
            [ROUTES.LOG_WORKOUT]: focused ? 'add-circle' : 'add-circle-outline',
            [ROUTES.AI_SUGGESTIONS]: focused ? 'sparkles' : 'sparkles-outline',
            [ROUTES.PROGRESS]: focused ? 'bar-chart' : 'bar-chart-outline',
            [ROUTES.PROFILE]: focused ? 'person' : 'person-outline',
          };

          const iconName = icons[route.name] || 'ellipse';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarLabel: ({ focused, color }) => {
          const labels = {
            [ROUTES.DASHBOARD]: 'Home',
            [ROUTES.LOG_WORKOUT]: 'Log',
            [ROUTES.AI_SUGGESTIONS]: 'AI Plan',
            [ROUTES.PROGRESS]: 'Progress',
            [ROUTES.PROFILE]: 'Profile',
          };

          return (
            <Text style={{ fontSize: 10, fontWeight: focused ? '600' : '400', color, marginTop: 2 }}>
              {labels[route.name] || route.name}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarBadge: streak > 0 ? streak : undefined,
          tabBarBadgeStyle: streak > 0 ? { backgroundColor: COLORS.primary, color: '#FFF', fontSize: 10, fontWeight: '700', minWidth: 18, height: 18, lineHeight: 18, borderRadius: 9 } : undefined,
        }}
      />
      <Tab.Screen name={ROUTES.PROGRESS} component={ProgressScreen} />
      <Tab.Screen name={ROUTES.LOG_WORKOUT} component={LogWorkoutScreen} />
      <Tab.Screen name={ROUTES.AI_SUGGESTIONS} component={AIScreen} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainNavigator;
