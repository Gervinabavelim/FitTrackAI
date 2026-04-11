import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { useToast } from '../../contexts/ToastContext';
import { COLORS, ROUTES } from '../../utils/constants';
import { estimateCalories } from '../../utils/calculations';
import ExercisePicker from '../../components/ExercisePicker';
import RestTimer from '../../components/RestTimer';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { sendImmediateNotification, sendStreakMilestoneNotification } from '../../services/notificationService';
import { checkWorkoutLogRateLimit } from '../../utils/rateLimiter';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import useSubscriptionStore from '../../store/subscriptionStore';
import { canLogWorkout, FREE_DAILY_WORKOUT_LIMIT } from '../../utils/proFeatures';
import { trackEvent } from '../../services/analyticsService';

const LogWorkoutScreen = ({ navigation, route }) => {
  const { user, profile } = useAuthStore();
  const { logWorkout, loading, streak, recentWorkouts, fetchRecentWorkouts } = useWorkoutStore();
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { isConnected } = useNetworkStatus();
  const isPro = useSubscriptionStore((s) => s.isPro);

  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [isCaloriesManual, setIsCaloriesManual] = useState(false);

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill form when editing an existing workout
  useEffect(() => {
    const editWorkout = route?.params?.editWorkout;
    if (editWorkout) {
      setExerciseName(editWorkout.exerciseName || '');
      if (editWorkout.sets) setSets(String(editWorkout.sets));
      if (editWorkout.reps) setReps(String(editWorkout.reps));
      if (editWorkout.weight) setWeight(String(editWorkout.weight));
      if (editWorkout.duration) setDuration(String(editWorkout.duration));
      if (editWorkout.calories) { setCalories(String(editWorkout.calories)); setIsCaloriesManual(true); }
      if (editWorkout.bodyWeight) setBodyWeight(String(editWorkout.bodyWeight));
      if (editWorkout.notes) setNotes(editWorkout.notes);
      if (editWorkout.date) setWorkoutDate(new Date(editWorkout.date));
    }
  }, [route?.params?.editWorkout]);

  useEffect(() => {
    if (user?.uid) fetchRecentWorkouts(user.uid);
  }, [user?.uid]);

  const recentExercises = useMemo(() => {
    const seen = new Set();
    return recentWorkouts.filter((w) => {
      if (seen.has(w.exerciseName)) return false;
      seen.add(w.exerciseName);
      return true;
    }).slice(0, 5);
  }, [recentWorkouts]);

  const setsRef = useRef(null);
  const repsRef = useRef(null);
  const weightRef = useRef(null);
  const durationRef = useRef(null);
  const caloriesRef = useRef(null);
  const notesRef = useRef(null);

  const handleDurationChange = (val) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setDuration(cleanVal);
    if (!isCaloriesManual && exerciseName && cleanVal) {
      const userWeight = parseFloat(profile?.weightKg || 70);
      const estimated = estimateCalories(exerciseName, parseInt(cleanVal), userWeight);
      if (estimated > 0) setCalories(String(estimated));
    }
  };

  const handleExerciseSelect = (name) => {
    setExerciseName(name);
    if (!isCaloriesManual && duration) {
      const userWeight = parseFloat(profile?.weightKg || 70);
      const estimated = estimateCalories(name, parseInt(duration), userWeight);
      if (estimated > 0) setCalories(String(estimated));
    }
    if (errors.exerciseName) setErrors((e) => ({ ...e, exerciseName: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!exerciseName.trim()) newErrors.exerciseName = 'Please select an exercise';
    if (!duration && !sets) newErrors.duration = 'Enter duration or at least sets';
    if (sets && isNaN(parseInt(sets))) newErrors.sets = 'Sets must be a number';
    if (reps && isNaN(parseInt(reps))) newErrors.reps = 'Reps must be a number';
    if (weight && isNaN(parseFloat(weight))) newErrors.weight = 'Weight must be a number';
    if (duration && (isNaN(parseInt(duration)) || parseInt(duration) <= 0))
      newErrors.duration = 'Enter a valid duration in minutes';
    if (calories && isNaN(parseInt(calories))) newErrors.calories = 'Calories must be a number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Free-tier daily workout limit
    if (!isPro) {
      const { allowed, remaining } = canLogWorkout(recentWorkouts);
      if (!allowed) {
        showToast(
          `Daily limit reached (${FREE_DAILY_WORKOUT_LIMIT}/day). Upgrade to Pro for unlimited workouts!`,
          'warning'
        );
        navigation.navigate('Paywall', { feature: 'unlimited_workouts' });
        return;
      }
    }

    if (!isConnected) {
      showToast("You're offline. Connect to the internet to save your workout.", 'warning');
      return;
    }

    const rateCheck = checkWorkoutLogRateLimit();
    if (!rateCheck.allowed) {
      showToast(rateCheck.message, 'warning');
      return;
    }

    const workoutData = {
      exerciseName: exerciseName.trim(),
      date: workoutDate.toISOString(),
      ...(sets && { sets: parseInt(sets) }),
      ...(reps && { reps: parseInt(reps) }),
      ...(weight && { weight: parseFloat(weight) }),
      ...(duration && { duration: parseInt(duration) }),
      ...(calories && { calories: parseInt(calories) }),
      ...(bodyWeight && { bodyWeight: parseFloat(bodyWeight) }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    const result = await logWorkout(user.uid, workoutData);

    if (result.success) {
      haptics.success();
      showToast('Workout saved successfully!', 'success');
      trackEvent('workout_logged', { exercise: exerciseName });

      await sendImmediateNotification(
        'Workout Logged!',
        `Great job logging ${exerciseName}${calories ? ` — ${calories} calories burned!` : '!'}`
      );

      const newStreak = streak + 1;
      await sendStreakMilestoneNotification(newStreak, profile?.name?.split(' ')[0]);

      resetForm();
      setTimeout(() => navigation.navigate(ROUTES.DASHBOARD), 500);
    } else {
      haptics.warning();
      showToast(result.error || 'Failed to save workout. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setExerciseName('');
    setSets('');
    setReps('');
    setWeight('');
    setDuration('');
    setCalories('');
    setBodyWeight('');
    setNotes('');
    setWorkoutDate(new Date());
    setIsCaloriesManual(false);
    setErrors({});
  };

  const adjustDate = (days) => {
    const d = new Date(workoutDate);
    d.setDate(d.getDate() + days);
    if (d > new Date()) return;
    setWorkoutDate(d);
  };

  const isToday =
    format(workoutDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const inputStyle = (field) => ({
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: errors[field] ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border),
    backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
  });

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Log Workout</Text>
          <TouchableOpacity onPress={resetForm}>
            <Text style={[styles.clearText, { color: COLORS.primary }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Free-tier limit banner */}
          {!isPro && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: `${COLORS.warning}12`,
                borderColor: `${COLORS.warning}30`,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Ionicons name="information-circle" size={18} color={COLORS.warning} />
              <Text style={{ flex: 1, fontSize: 13, color: COLORS.warning, fontWeight: '600' }}>
                {canLogWorkout(recentWorkouts).remaining} of {FREE_DAILY_WORKOUT_LIMIT} free workouts remaining today
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Paywall', { feature: 'unlimited_workouts' })}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Repeat Recent */}
          {recentExercises.length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Repeat Recent</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPickRow}
              >
                {recentExercises.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    onPress={() => {
                      haptics.selection();
                      handleExerciseSelect(w.exerciseName);
                      if (w.sets) setSets(String(w.sets));
                      if (w.reps) setReps(String(w.reps));
                      if (w.weight) setWeight(String(w.weight));
                      if (w.duration) handleDurationChange(String(w.duration));
                    }}
                    style={[
                      styles.recentCard,
                      {
                        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                        borderColor: exerciseName === w.exerciseName ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border),
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                      {w.exerciseName}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
                      {[w.sets && `${w.sets}x${w.reps || ''}`, w.weight && `${w.weight}kg`, w.duration && `${w.duration}m`].filter(Boolean).join(' · ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Quick Pick */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quick Pick</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPickRow}
            >
              {[
                { name: 'Running', icon: 'walk-outline', color: '#FBBF24' },
                { name: 'Bench Press', icon: 'barbell-outline', color: '#3B82F6' },
                { name: 'Squat', icon: 'fitness-outline', color: '#3B82F6' },
                { name: 'Push-up', icon: 'body-outline', color: '#22C55E' },
                { name: 'Cycling', icon: 'bicycle-outline', color: '#FBBF24' },
                { name: 'HIIT', icon: 'flash-outline', color: '#EF4444' },
                { name: 'Yoga', icon: 'leaf-outline', color: '#A78BFA' },
                { name: 'Deadlift', icon: 'barbell-outline', color: '#3B82F6' },
              ].map((ex) => (
                <TouchableOpacity
                  key={ex.name}
                  onPress={() => { haptics.selection(); handleExerciseSelect(ex.name); }}
                  style={[
                    styles.quickPickChip,
                    {
                      backgroundColor: exerciseName === ex.name ? ex.color : `${ex.color}15`,
                      borderColor: exerciseName === ex.name ? ex.color : `${ex.color}30`,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={ex.icon}
                    size={14}
                    color={exerciseName === ex.name ? '#FFF' : ex.color}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: exerciseName === ex.name ? '#FFF' : ex.color,
                    }}
                  >
                    {ex.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Exercise Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Exercise *</Text>
            <TouchableOpacity
              onPress={() => setShowExercisePicker(true)}
              style={[
                styles.exercisePickerBtn,
                {
                  backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
                  borderColor: errors.exerciseName ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border),
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={exerciseName ? 'barbell-outline' : 'search-outline'}
                size={18}
                color={exerciseName ? COLORS.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.exercisePickerText,
                  { color: exerciseName ? colors.text : colors.textMuted },
                ]}
              >
                {exerciseName || 'Select an exercise...'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.exerciseName && (
              <Text style={styles.fieldError}>{errors.exerciseName}</Text>
            )}
          </View>

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <View
              style={[
                styles.datePicker,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <TouchableOpacity onPress={() => adjustDate(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {isToday ? 'Today' : format(workoutDate, 'EEE, MMM d, yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => adjustDate(1)}
                disabled={isToday}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isToday ? colors.textMuted : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sets / Reps / Weight */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Sets</Text>
              <TextInput
                ref={setsRef}
                style={inputStyle('sets')}
                value={sets}
                onChangeText={(t) => { setSets(t.replace(/[^0-9]/g, '')); if (errors.sets) setErrors((e) => ({ ...e, sets: null })); }}
                placeholder="3"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => repsRef.current?.focus()}
                maxLength={3}
              />
              {errors.sets && <Text style={styles.fieldError}>{errors.sets}</Text>}
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reps</Text>
              <TextInput
                ref={repsRef}
                style={inputStyle('reps')}
                value={reps}
                onChangeText={(t) => { setReps(t.replace(/[^0-9]/g, '')); if (errors.reps) setErrors((e) => ({ ...e, reps: null })); }}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
                maxLength={4}
              />
              {errors.reps && <Text style={styles.fieldError}>{errors.reps}</Text>}
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.fieldGroup, { flex: 1.3 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Weight (kg)</Text>
              <TextInput
                ref={weightRef}
                style={inputStyle('weight')}
                value={weight}
                onChangeText={(t) => { setWeight(t.replace(/[^0-9.]/g, '')); if (errors.weight) setErrors((e) => ({ ...e, weight: null })); }}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => durationRef.current?.focus()}
                maxLength={6}
              />
              {errors.weight && <Text style={styles.fieldError}>{errors.weight}</Text>}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (minutes)</Text>
            <View style={styles.row}>
              <TextInput
                ref={durationRef}
                style={[inputStyle('duration')]}
                value={duration}
                onChangeText={handleDurationChange}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="next"
                onSubmitEditing={() => caloriesRef.current?.focus()}
                maxLength={4}
              />
              <View style={styles.durationShortcuts}>
                {[15, 30, 45, 60].map((min) => (
                  <TouchableOpacity
                    key={min}
                    onPress={() => { haptics.selection(); handleDurationChange(String(min)); }}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: duration === String(min)
                          ? COLORS.primary
                          : `${COLORS.primary}15`,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: duration === String(min) ? '#FFF' : COLORS.primary,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {min}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {errors.duration && <Text style={styles.fieldError}>{errors.duration}</Text>}
          </View>

          {/* Calories */}
          <View style={styles.fieldGroup}>
            <View style={styles.caloriesHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Calories Burned
              </Text>
              <TouchableOpacity onPress={() => setIsCaloriesManual(!isCaloriesManual)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name={isCaloriesManual ? 'refresh-outline' : 'create-outline'}
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={[styles.autoLabel, { color: COLORS.primary }]}>
                    {isCaloriesManual ? 'Auto-calculate' : 'Manual'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TextInput
                ref={caloriesRef}
                style={inputStyle('calories')}
                value={calories}
                onChangeText={(t) => {
                  setCalories(t.replace(/[^0-9]/g, ''));
                  setIsCaloriesManual(true);
                  if (errors.calories) setErrors((e) => ({ ...e, calories: null }));
                }}
                placeholder={isCaloriesManual ? '250' : 'Auto-calculated'}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={5}
                editable={isCaloriesManual}
              />
              <View
                style={[
                  styles.caloriesBadge,
                  { backgroundColor: `${COLORS.warning}18` },
                ]}
              >
                <Ionicons name="flame" size={18} color={COLORS.warning} />
                <Text style={{ color: COLORS.warning, fontWeight: '700', fontSize: 12 }}>kcal</Text>
              </View>
            </View>
            {errors.calories && <Text style={styles.fieldError}>{errors.calories}</Text>}
          </View>

          {/* Body Weight */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Body Weight Today (kg) — optional
            </Text>
            <TextInput
              style={[inputStyle('bodyWeight')]}
              value={bodyWeight}
              onChangeText={(t) => setBodyWeight(t.replace(/[^0-9.]/g, ''))}
              placeholder={profile?.weightKg ? String(profile.weightKg) : '70'}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => notesRef.current?.focus()}
              maxLength={6}
            />
          </View>

          {/* Rest Timer */}
          <RestTimer />

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Notes — optional
            </Text>
            <TextInput
              ref={notesRef}
              style={[
                inputStyle('notes'),
                {
                  height: 90,
                  textAlignVertical: 'top',
                  paddingTop: 12,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did the workout feel? Any PRs?"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnContent}>
                <InlineSpinner color="#FFF" size={18} />
                <Text style={styles.saveBtnText}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Workout</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={showExercisePicker}
        onSelect={handleExerciseSelect}
        onClose={() => setShowExercisePicker(false)}
        selectedExercise={exerciseName}
      />
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
  clearText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  recentCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 110,
  },
  recentName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  recentMeta: { fontSize: 11, fontWeight: '500' },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  quickPickRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  exercisePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  exercisePickerText: { flex: 1, fontSize: 16, fontWeight: '400' },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  durationShortcuts: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexShrink: 0,
  },
  durationChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  caloriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoLabel: { fontSize: 12, fontWeight: '600' },
  caloriesBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

export default LogWorkoutScreen;
