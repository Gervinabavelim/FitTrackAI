import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart } from 'react-native-chart-kit';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, MONTHS, DAYS_OF_WEEK } from '../../utils/constants';
import {
  calculateStreak,
  getDailyCalories,
  getWeightTrend,
  calculateWeeklyVolume,
  average,
  formatDuration,
} from '../../utils/calculations';
import { HeroStat } from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { subDays, format } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

const ProgressScreen = () => {
  const { user, profile } = useAuthStore();
  const { workouts, fetchWorkouts, loading } = useWorkoutStore();
  const { isDark, colors } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [dailyCalories30, setDailyCalories30] = useState([]);
  const [weightTrend30, setWeightTrend30] = useState([]);
  const [weeklyVolume4, setWeeklyVolume4] = useState([]);
  const [chartDataReady, setChartDataReady] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchWorkouts(user.uid);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (workouts.length >= 0) {
      processChartData();
    }
  }, [workouts]);

  const processChartData = () => {
    const calories = getDailyCalories(workouts, 30);
    const weight = getWeightTrend(workouts, 30);
    const weekly = calculateWeeklyVolume(workouts, 4);
    setDailyCalories30(calories);
    setWeightTrend30(weight);
    setWeeklyVolume4(weekly);
    setChartDataReady(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.uid) {
      await fetchWorkouts(user.uid);
    }
    setRefreshing(false);
  }, [user?.uid]);

  // ─── Computed stats ────────────────────────────────────────────────────────────
  const streak = calculateStreak(workouts);
  const totalCalories = workouts.reduce((s, w) => s + (w.calories || 0), 0);
  const avgDuration = average(workouts.map((w) => w.duration || 0));

  const last30Workouts = workouts.filter((w) => {
    try {
      return new Date(w.date) >= subDays(new Date(), 30);
    } catch { return false; }
  });

  // ─── Chart config ──────────────────────────────────────────────────────────────
  const chartConfig = {
    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
    backgroundGradientFrom: isDark ? COLORS.dark.card : COLORS.light.card,
    backgroundGradientTo: isDark ? COLORS.dark.card : COLORS.light.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => (isDark ? '#94A3B8' : '#64748B'),
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDark ? '#334155' : '#E2E8F0',
      strokeWidth: 1,
    },
  };

  const calorieChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: COLORS.warning,
    },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  };

  // ─── Generate 30-day labels (every 7th day) ───────────────────────────────────
  const generate30DayLabels = () => {
    return Array.from({ length: 30 }, (_, i) => {
      if (i % 7 === 0) {
        const d = subDays(new Date(), 29 - i);
        return format(d, 'M/d');
      }
      return '';
    });
  };

  // ─── Safe chart data (avoid empty arrays crashing chart) ─────────────────────
  const safeCalorieData = dailyCalories30.length > 0
    ? dailyCalories30
    : Array(30).fill(0);

  const hasWeightData = weightTrend30.some((w) => w > 0);
  const safeWeightData = hasWeightData
    ? weightTrend30
    : Array(30).fill(profile?.weightKg || 70);

  const safeWeeklyData = weeklyVolume4.length > 0
    ? weeklyVolume4.map((w) => w.count)
    : [0, 0, 0, 0];

  const weeklyLabels = weeklyVolume4.length > 0
    ? weeklyVolume4.map((w) => w.week)
    : ['W1', 'W2', 'W3', 'W4'];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Last 30 days
          </Text>
        </View>

        {loading && !refreshing ? (
          <LoadingSpinner
            size="large"
            message="Loading your progress..."
            fullScreen
          />
        ) : (
          <>
            {/* ── Hero Stats ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heroStatsRow}
            >
              <HeroStat
                icon="fitness-outline"
                iconColor={COLORS.primary}
                value={workouts.length}
                label="Total Workouts"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="flame-outline"
                iconColor={COLORS.warning}
                value={totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories}
                unit="kcal"
                label="Total Burned"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="trending-up-outline"
                iconColor={COLORS.success}
                value={streak}
                unit="days"
                label="Current Streak"
                isDark={isDark}
                colors={colors}
              />
              <HeroStat
                icon="time-outline"
                iconColor={COLORS.info}
                value={formatDuration(avgDuration)}
                label="Avg Duration"
                isDark={isDark}
                colors={colors}
              />
            </ScrollView>

            {/* ── This Month Summary ── */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                This Month
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                    {last30Workouts.length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    Workouts
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
                  ]}
                />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                    {last30Workouts.reduce((s, w) => s + (w.calories || 0), 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    Calories
                  </Text>
                </View>
                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
                  ]}
                />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    {streak}🔥
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    Streak
                  </Text>
                </View>
              </View>
            </View>

            {chartDataReady && (
              <>
                {/* ── Calories Burned Chart ── */}
                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    🔥 Calories Burned — Last 30 Days
                  </Text>
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                      },
                    ]}
                  >
                    <LineChart
                      data={{
                        labels: generate30DayLabels(),
                        datasets: [{ data: safeCalorieData, strokeWidth: 2 }],
                      }}
                      width={CHART_WIDTH - 32}
                      height={200}
                      chartConfig={calorieChartConfig}
                      bezier
                      withDots={false}
                      withShadow={false}
                      style={styles.chart}
                    />
                  </View>
                </View>

                {/* ── Weekly Workout Count Bar Chart ── */}
                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    📅 Weekly Workout Count — Last 4 Weeks
                  </Text>
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                      },
                    ]}
                  >
                    <BarChart
                      data={{
                        labels: weeklyLabels,
                        datasets: [{ data: safeWeeklyData }],
                      }}
                      width={CHART_WIDTH - 32}
                      height={180}
                      chartConfig={barChartConfig}
                      style={styles.chart}
                      showValuesOnTopOfBars
                      fromZero
                    />
                  </View>
                </View>

                {/* ── Weight Trend Chart ── */}
                <View style={styles.chartSection}>
                  <Text style={[styles.chartTitle, { color: colors.text }]}>
                    ⚖️ Body Weight Trend — Last 30 Days
                  </Text>
                  {hasWeightData ? (
                    <View
                      style={[
                        styles.chartCard,
                        {
                          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                        },
                      ]}
                    >
                      <LineChart
                        data={{
                          labels: generate30DayLabels(),
                          datasets: [{ data: safeWeightData, strokeWidth: 2 }],
                        }}
                        width={CHART_WIDTH - 32}
                        height={200}
                        chartConfig={{
                          ...chartConfig,
                          color: (opacity = 1) => `rgba(236, 72, 153, ${opacity})`,
                          propsForDots: { r: '4', strokeWidth: '2', stroke: '#EC4899' },
                        }}
                        bezier
                        withDots
                        withShadow={false}
                        style={styles.chart}
                        yAxisSuffix=" kg"
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.chartCard,
                        styles.emptyChartCard,
                        {
                          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                          borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 32 }}>⚖️</Text>
                      <Text style={[styles.emptyChartText, { color: colors.textMuted }]}>
                        Log your body weight when logging workouts to see your weight trend here.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* ── Personal Records ── */}
            {workouts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No data yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Log your first workout to start tracking your progress
                </Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 4, fontWeight: '400' },
  heroStatsRow: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 0,
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  summaryDivider: { width: 1, height: 48 },
  chartSection: { marginBottom: 20 },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  chartCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  chart: { borderRadius: 8 },
  emptyChartCard: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyChartText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

export default ProgressScreen;
