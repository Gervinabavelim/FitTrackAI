import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';
import { generateWorkoutPlan } from '../../services/aiService';
import { saveAIWorkoutPlan } from '../../services/workoutService';
import { AILoadingState } from '../../components/LoadingSpinner';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAIRateLimit } from '../../utils/rateLimiter';

// ─── Day Card ─────────────────────────────────────────────────────────────────
const DayCard = ({ day, isDark, colors }) => {
  const [expanded, setExpanded] = useState(false);
  const isRest = day.type?.toLowerCase() === 'rest';

  const typeColors = {
    strength: COLORS.primary,
    cardio: COLORS.warning,
    rest: COLORS.success,
    hiit: COLORS.danger,
    flexibility: '#EC4899',
    default: COLORS.info,
  };
  const typeColor = typeColors[day.type?.toLowerCase()] || typeColors.default;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
      style={[
        styles.dayCard,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: expanded ? typeColor : (isDark ? COLORS.dark.border : COLORS.light.border),
        },
      ]}
    >
      {/* Card Header */}
      <View style={styles.dayCardHeader}>
        <View
          style={[
            styles.dayBadge,
            { backgroundColor: isRest ? `${COLORS.success}20` : `${typeColor}20` },
          ]}
        >
          <Text style={[styles.dayNumber, { color: isRest ? COLORS.success : typeColor }]}>
            Day {day.day}
          </Text>
          <Text style={[styles.dayName, { color: isRest ? COLORS.success : typeColor }]}>
            {day.dayName}
          </Text>
        </View>

        <View style={styles.dayInfo}>
          <Text style={[styles.dayFocus, { color: colors.text }]} numberOfLines={1}>
            {day.focus || (isRest ? 'Rest & Recovery' : 'Workout')}
          </Text>
          <View style={styles.dayMeta}>
            {day.duration && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.metaChipText, { color: colors.textMuted }]}>
                  {day.duration} min
                </Text>
              </View>
            )}
            {day.estimatedCalories && (
              <View style={styles.metaChip}>
                <Ionicons name="flame-outline" size={11} color={COLORS.warning} />
                <Text style={[styles.metaChipText, { color: COLORS.warning }]}>
                  {day.estimatedCalories} kcal
                </Text>
              </View>
            )}
            <View
              style={[
                styles.typePill,
                { backgroundColor: `${typeColor}20` },
              ]}
            >
              <Text style={[styles.typePillText, { color: typeColor }]}>
                {day.type || 'Workout'}
              </Text>
            </View>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>

      {/* Expanded Detail */}
      {expanded && (
        <View style={styles.dayDetail}>
          <View
            style={[
              styles.divider,
              { backgroundColor: isDark ? COLORS.dark.border : COLORS.light.border },
            ]}
          />

          {/* Warmup */}
          {day.warmup && (
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: COLORS.success }]}>
                🔥 Warm-up
              </Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {day.warmup}
              </Text>
            </View>
          )}

          {/* Exercises */}
          {day.exercises && day.exercises.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: typeColor }]}>
                💪 Exercises
              </Text>
              {day.exercises.map((ex, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.exerciseRow,
                    {
                      backgroundColor: isDark ? COLORS.dark.background : '#F8FAFC',
                      borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                    },
                  ]}
                >
                  <View style={styles.exerciseRowHeader}>
                    <Text style={[styles.exerciseRowName, { color: colors.text }]}>
                      {idx + 1}. {ex.name}
                    </Text>
                    <View style={styles.exerciseRowStats}>
                      {ex.sets && (
                        <Text style={[styles.exStatBadge, { backgroundColor: `${typeColor}18`, color: typeColor }]}>
                          {ex.sets} sets
                        </Text>
                      )}
                      {ex.reps && (
                        <Text style={[styles.exStatBadge, { backgroundColor: `${typeColor}18`, color: typeColor }]}>
                          × {ex.reps}
                        </Text>
                      )}
                    </View>
                  </View>
                  {ex.rest && (
                    <Text style={[styles.exSubDetail, { color: colors.textMuted }]}>
                      Rest: {ex.rest}
                    </Text>
                  )}
                  {ex.targetMuscles && ex.targetMuscles.length > 0 && (
                    <Text style={[styles.exSubDetail, { color: colors.textMuted }]}>
                      Target: {ex.targetMuscles.join(', ')}
                    </Text>
                  )}
                  {ex.notes && (
                    <Text style={[styles.exNotes, { color: colors.textSecondary }]}>
                      💡 {ex.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Cooldown */}
          {day.cooldown && (
            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionTitle, { color: COLORS.info }]}>
                ❄️ Cool-down
              </Text>
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {day.cooldown}
              </Text>
            </View>
          )}

          {/* Pro Tip */}
          {day.tips && (
            <View
              style={[
                styles.tipBox,
                { backgroundColor: `${COLORS.primary}12`, borderColor: `${COLORS.primary}30` },
              ]}
            >
              <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '500', lineHeight: 20 }}>
                ✨ {day.tips}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AIScreen = () => {
  const { user, profile } = useAuthStore();
  const { recentWorkouts, fetchRecentWorkouts } = useWorkoutStore();
  const { isDark, colors } = useTheme();

  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchRecentWorkouts(user.uid);
    }
  }, [user?.uid]);

  // ─── Generate Plan ───────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!profile) {
      Alert.alert('Profile Required', 'Please complete your profile first.');
      return;
    }

    const rateCheck = checkAIRateLimit();
    if (!rateCheck.allowed) {
      Alert.alert('Slow Down', rateCheck.message);
      return;
    }

    setGenerating(true);
    setPlan(null);
    setPlanSaved(false);

    try {
      const generatedPlan = await generateWorkoutPlan(profile, recentWorkouts);
      setPlan(generatedPlan);
    } catch (error) {
      Alert.alert(
        'Generation Failed',
        error.message || 'Unable to generate plan. Please check your internet connection and API key.'
      );
    } finally {
      setGenerating(false);
    }
  };

  // ─── Save Plan to Firestore ──────────────────────────────────────────────────
  const handleSavePlan = async () => {
    if (!plan || !user?.uid) return;
    setSaving(true);
    try {
      await saveAIWorkoutPlan(user.uid, plan);
      setPlanSaved(true);
      Alert.alert('Plan Saved! 🎉', 'Your workout plan has been saved to your profile.');
    } catch (error) {
      Alert.alert('Save Failed', 'Unable to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coach</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Powered by GPT-4o-mini
            </Text>
          </View>
          <View style={[styles.aiBadge, { backgroundColor: `${COLORS.primary}20` }]}>
            <Text style={styles.aiBadgeText}>✨ AI</Text>
          </View>
        </View>

        {/* Profile context pill */}
        {profile && (
          <View
            style={[
              styles.contextPill,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.contextText, { color: colors.textSecondary }]}>
              {profile.name} · {profile.fitnessLevel} · {profile.fitnessGoal?.replace(/_/g, ' ')}
            </Text>
            <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.contextText, { color: colors.textMuted }]}>
              {recentWorkouts.length} recent workouts
            </Text>
          </View>
        )}

        {/* Generate Button */}
        {!generating && (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              { opacity: generating ? 0.7 : 1 },
            ]}
            onPress={handleGenerate}
            disabled={generating}
            activeOpacity={0.85}
          >
            <View style={styles.generateGradient}>
              <Ionicons name="sparkles" size={22} color="#FFF" />
              <Text style={styles.generateBtnText}>
                {plan ? 'Regenerate Plan' : 'Generate 7-Day Plan'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Loading State */}
        {generating && (
          <View
            style={[
              styles.loadingCard,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              },
            ]}
          >
            <AILoadingState isDark={isDark} />
          </View>
        )}

        {/* Plan Display */}
        {plan && !generating && (
          <View style={styles.planContainer}>
            {/* Plan Header */}
            <View
              style={[
                styles.planHeader,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.planTitle, { color: colors.text }]}>
                {plan.planTitle}
              </Text>
              <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                {plan.planDescription}
              </Text>

              <View style={styles.planMetaRow}>
                <View style={[styles.planMetaChip, { backgroundColor: `${COLORS.primary}18` }]}>
                  <Ionicons name="trophy-outline" size={14} color={COLORS.primary} />
                  <Text style={[styles.planMetaChipText, { color: COLORS.primary }]}>
                    {plan.weeklyGoal}
                  </Text>
                </View>
              </View>

              {plan.estimatedCaloriesPerWeek && (
                <Text style={[styles.planCalories, { color: colors.textMuted }]}>
                  ~{plan.estimatedCaloriesPerWeek.toLocaleString()} kcal/week estimated
                </Text>
              )}
            </View>

            {/* Day Cards */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Your 7-Day Schedule
            </Text>
            {plan.days.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                isDark={isDark}
                colors={colors}
              />
            ))}

            {/* Nutrition Tips */}
            {plan.nutritionTips && plan.nutritionTips.length > 0 && (
              <View
                style={[
                  styles.tipsCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <Text style={[styles.tipsTitle, { color: colors.text }]}>
                  🥗 Nutrition Tips
                </Text>
                {plan.nutritionTips.map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    <View style={[styles.tipDot, { backgroundColor: COLORS.success }]} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recovery Advice */}
            {plan.recoveryAdvice && (
              <View
                style={[
                  styles.tipsCard,
                  {
                    backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                    borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  },
                ]}
              >
                <Text style={[styles.tipsTitle, { color: colors.text }]}>
                  😴 Recovery Advice
                </Text>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {plan.recoveryAdvice}
                </Text>
              </View>
            )}

            {/* Progression Note */}
            {plan.progressionNote && (
              <View
                style={[
                  styles.progressionBox,
                  {
                    backgroundColor: `${COLORS.primary}12`,
                    borderColor: `${COLORS.primary}30`,
                  },
                ]}
              >
                <Ionicons name="trending-up" size={16} color={COLORS.primary} />
                <Text style={[styles.progressionText, { color: COLORS.primary }]}>
                  {plan.progressionNote}
                </Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: planSaved ? COLORS.success : COLORS.primary,
                  opacity: saving ? 0.7 : 1,
                },
              ]}
              onPress={handleSavePlan}
              disabled={saving || planSaved}
              activeOpacity={0.85}
            >
              {saving ? (
                <View style={styles.btnContent}>
                  <InlineSpinner color="#FFF" size={18} />
                  <Text style={styles.saveBtnText}>Saving...</Text>
                </View>
              ) : (
                <View style={styles.btnContent}>
                  <Ionicons
                    name={planSaved ? 'checkmark-circle' : 'bookmark-outline'}
                    size={20}
                    color="#FFF"
                  />
                  <Text style={styles.saveBtnText}>
                    {planSaved ? 'Plan Saved ✓' : 'Save This Plan'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!plan && !generating && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Your AI Coach is Ready
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Press "Generate 7-Day Plan" and your AI coach will analyze your profile and recent
              workouts to build a personalized training program just for you.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '400' },
  aiBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  aiBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexWrap: 'wrap',
  },
  contextText: { fontSize: 12, fontWeight: '500' },
  generateBtn: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  generateGradient: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  generateBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  loadingCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  planContainer: { paddingHorizontal: 20 },
  planHeader: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  planDescription: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  planMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  planMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  planMetaChipText: { fontSize: 12, fontWeight: '600' },
  planCalories: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dayBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayNumber: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayName: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  dayInfo: { flex: 1 },
  dayFocus: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  dayMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaChipText: { fontSize: 11, fontWeight: '500' },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayDetail: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, marginBottom: 12 },
  detailSection: { marginBottom: 14 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  detailText: { fontSize: 13, lineHeight: 20 },
  exerciseRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  exerciseRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  exerciseRowName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  exerciseRowStats: { flexDirection: 'row', gap: 4 },
  exStatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  exSubDetail: { fontSize: 12, marginTop: 2 },
  exNotes: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  tipBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
  },
  tipsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  tipsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: { fontSize: 13, lineHeight: 20, flex: 1 },
  progressionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  progressionText: { fontSize: 13, lineHeight: 20, flex: 1, fontWeight: '500' },
  saveBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default AIScreen;
