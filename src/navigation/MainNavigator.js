import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/main/DashboardScreen';
import LogWorkoutScreen from '../screens/main/LogWorkoutScreen';
import AIScreen from '../screens/main/AIScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import useTheme from '../hooks/useTheme';
import useWorkoutStore from '../store/workoutStore';
import { COLORS, ROUTES } from '../utils/constants';

const Tab = createBottomTabNavigator();

const TabLabel = ({ label, focused, color }) => (
  <Text
    style={{
      fontSize: 10,
      fontWeight: focused ? '700' : '500',
      color,
      marginTop: 2,
    }}
  >
    {label}
  </Text>
);

const MainNavigator = () => {
  const { isDark, colors } = useTheme();
  const { streak } = useWorkoutStore();

  return (
    <Tab.Navigator
      initialRouteName={ROUTES.DASHBOARD}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderTopColor: isDark ? COLORS.dark.border : COLORS.light.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 6,
          height: 60,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: isDark ? COLORS.dark.textMuted : COLORS.light.textMuted,
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
          return <Ionicons name={iconName} size={20} color={color} />;
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
            <TabLabel
              label={labels[route.name] || route.name}
              focused={focused}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.DASHBOARD}
        component={DashboardScreen}
        options={{
          tabBarBadge: streak > 0 ? streak : undefined,
          tabBarBadgeStyle: streak > 0 ? { backgroundColor: COLORS.primary, color: '#FFF', fontSize: 10, fontWeight: '700' } : undefined,
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
