import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/main/DashboardScreen';
import LogWorkoutScreen from '../screens/main/LogWorkoutScreen';
import AIScreen from '../screens/main/AIScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import useWorkoutStore from '../store/workoutStore';
import { COLORS, ROUTES } from '../utils/constants';

const Tab = createBottomTabNavigator();

// ─── Per-route icon + label config ──────────────────────────────────────────────
const TAB_META = {
  [ROUTES.DASHBOARD]: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  [ROUTES.PROGRESS]: { label: 'Progress', icon: 'bar-chart', iconOutline: 'bar-chart-outline' },
  [ROUTES.LOG_WORKOUT]: { label: 'Log', icon: 'add-circle', iconOutline: 'add-circle-outline' },
  [ROUTES.AI_SUGGESTIONS]: { label: 'AI', icon: 'sparkles', iconOutline: 'sparkles-outline' },
  [ROUTES.PROFILE]: { label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
};

// ─── Dark floating pill tab bar ─────────────────────────────────────────────────
const FloatingTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const { streak } = useWorkoutStore();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name] || { label: route.name, icon: 'ellipse', iconOutline: 'ellipse-outline' };
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const showStreak = route.name === ROUTES.DASHBOARD && streak > 0;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={onPress}
              activeOpacity={0.85}
              style={[styles.item, focused && styles.itemActive]}
            >
              <View>
                <Ionicons
                  name={focused ? meta.icon : meta.iconOutline}
                  size={22}
                  color={focused ? COLORS.primary : '#8A8A93'}
                />
                {showStreak && !focused && <View style={styles.dot} />}
              </View>
              {focused && <Text style={styles.itemLabel}>{meta.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainNavigator = () => (
  <Tab.Navigator
    initialRouteName={ROUTES.DASHBOARD}
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <FloatingTabBar {...props} />}
  >
    <Tab.Screen name={ROUTES.DASHBOARD} component={DashboardScreen} />
    <Tab.Screen name={ROUTES.PROGRESS} component={ProgressScreen} />
    <Tab.Screen name={ROUTES.LOG_WORKOUT} component={LogWorkoutScreen} />
    <Tab.Screen name={ROUTES.AI_SUGGESTIONS} component={AIScreen} />
    <Tab.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17171C',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
  },
  itemActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
  },
  itemLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7A59',
  },
});

export default MainNavigator;
