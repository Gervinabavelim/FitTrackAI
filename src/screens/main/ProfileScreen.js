import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useWorkoutStore from '../../store/workoutStore';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { useToast } from '../../contexts/ToastContext';
import {
  COLORS,
  FITNESS_LEVELS,
  FITNESS_GOALS,
  WORKOUT_LOCATIONS,
  WORKOUT_FREQUENCIES,
  SESSION_DURATIONS,
  ROUTES,
} from '../../utils/constants';
import { calculateBMI, idealWeightRange } from '../../utils/calculations';
import { cancelAllNotifications, setupNotifications } from '../../services/notificationService';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkProfileUpdateRateLimit } from '../../utils/rateLimiter';
import { exportWorkoutsCSV } from '../../utils/exportData';
import useSubscriptionStore from '../../store/subscriptionStore';
import { ProBadge } from '../../components/ProBadge';
import { PRO_FEATURES } from '../../utils/proFeatures';

const ProfileScreen = ({ navigation }) => {
  const { user, profile, updateProfile, logout, loading } = useAuthStore();
  const { workouts, streak, totalCalories, reset: resetWorkoutStore } = useWorkoutStore();
  const { isDark, colors, toggleTheme } = useTheme();
  const haptics = useHaptics();
  const { showToast } = useToast();
  const { isPro, reset: resetSubscriptionStore } = useSubscriptionStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [errors, setErrors] = useState({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ─── Profile Photo ─────────────────────────────────────────────────────────
  const pickImage = async (useCamera = false) => {
    try {
      const permissionMethod = useCamera
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

      const { status } = await permissionMethod();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          `Please allow access to your ${useCamera ? 'camera' : 'photo library'} in Settings.`
        );
        return;
      }

      const launchMethod = useCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

      const result = await launchMethod({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setUploadingPhoto(true);
        const photoUri = result.assets[0].uri;
        const updateResult = await updateProfile({ photoUri });
        if (updateResult.success) {
          haptics.success();
          showToast('Profile photo updated!', 'success');
        } else {
          showToast('Failed to update photo.', 'error');
        }
        setUploadingPhoto(false);
      }
    } catch (error) {
      setUploadingPhoto(false);
      showToast('Could not update photo.', 'error');
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', ...(profile?.photoUri ? ['Remove Photo'] : [])],
          cancelButtonIndex: 0,
          destructiveButtonIndex: profile?.photoUri ? 3 : undefined,
        },
        (index) => {
          if (index === 1) pickImage(true);
          else if (index === 2) pickImage(false);
          else if (index === 3) removePhoto();
        }
      );
    } else {
      Alert.alert('Profile Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        ...(profile?.photoUri ? [{ text: 'Remove Photo', style: 'destructive', onPress: removePhoto }] : []),
      ]);
    }
  };

  const removePhoto = async () => {
    const result = await updateProfile({ photoUri: null });
    if (result.success) {
      haptics.success();
      showToast('Photo removed.', 'success');
    }
  };

  const bmiInfo = profile
    ? calculateBMI(profile.weightKg, profile.heightCm)
    : null;

  const idealWeight = profile?.heightCm
    ? idealWeightRange(profile.heightCm)
    : null;

  // ─── Edit Profile ──────────────────────────────────────────────────────────────
  const startEditing = () => {
    setEditData({
      name: profile?.name || '',
      age: String(profile?.age || ''),
      heightCm: String(profile?.heightCm || ''),
      weightKg: String(profile?.weightKg || ''),
      fitnessLevel: profile?.fitnessLevel || '',
      fitnessGoal: profile?.fitnessGoal || '',
      targetWeightKg: profile?.targetWeightKg ? String(profile.targetWeightKg) : '',
      workoutDaysPerWeek: profile?.workoutDaysPerWeek || 3,
      workoutLocation: profile?.workoutLocation || '',
      sessionDurationMin: profile?.sessionDurationMin || 45,
    });
    setErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({});
    setErrors({});
  };

  const validateEdit = () => {
    const errs = {};
    if (!editData.name?.trim()) errs.name = 'Name is required';
    const ageNum = parseInt(editData.age);
    if (!editData.age || isNaN(ageNum) || ageNum < 13 || ageNum > 100)
      errs.age = 'Enter a valid age (13–100)';
    const h = parseFloat(editData.heightCm);
    if (!editData.heightCm || isNaN(h) || h < 100 || h > 250)
      errs.heightCm = 'Enter valid height (100–250 cm)';
    const w = parseFloat(editData.weightKg);
    if (!editData.weightKg || isNaN(w) || w < 30 || w > 300)
      errs.weightKg = 'Enter valid weight (30–300 kg)';
    if (editData.targetWeightKg) {
      const t = parseFloat(editData.targetWeightKg);
      if (isNaN(t) || t < 30 || t > 300) errs.targetWeightKg = 'Enter valid weight (30–300 kg)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveEdit = async () => {
    if (!validateEdit()) return;

    const rateCheck = checkProfileUpdateRateLimit();
    if (!rateCheck.allowed) {
      Alert.alert('Slow Down', rateCheck.message);
      return;
    }

    const wantsTarget = editData.fitnessGoal === 'lose_weight' || editData.fitnessGoal === 'build_muscle';
    const payload = {
      name: editData.name.trim(),
      age: parseInt(editData.age),
      heightCm: parseFloat(editData.heightCm),
      weightKg: parseFloat(editData.weightKg),
      fitnessLevel: editData.fitnessLevel || profile?.fitnessLevel,
      fitnessGoal: editData.fitnessGoal || profile?.fitnessGoal,
      workoutDaysPerWeek: editData.workoutDaysPerWeek || 3,
      sessionDurationMin: editData.sessionDurationMin || 45,
    };
    if (editData.workoutLocation) payload.workoutLocation = editData.workoutLocation;
    if (wantsTarget && editData.targetWeightKg) {
      payload.targetWeightKg = parseFloat(editData.targetWeightKg);
    }
    const result = await updateProfile(payload);
    if (result.success) {
      haptics.success();
      showToast('Profile updated!', 'success');
      setIsEditing(false);
    } else {
      showToast(result.error || 'Update failed. Please try again.', 'error');
    }
  };

  // ─── Toggle Notifications ──────────────────────────────────────────────────────
  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    if (value) {
      const firstName = profile?.name?.split(' ')[0] || 'Athlete';
      await setupNotifications(firstName);
    } else {
      await cancelAllNotifications();
    }
  };

  // ─── Export Data ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!isPro) {
      navigation.navigate('Paywall', { feature: PRO_FEATURES.DATA_EXPORT });
      return;
    }
    if (workouts.length === 0) {
      showToast('No workouts to export yet.', 'warning');
      return;
    }
    setExporting(true);
    try {
      await exportWorkoutsCSV(workouts);
      showToast('Workout data exported!', 'success');
    } catch (error) {
      showToast(error.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            resetWorkoutStore();
            resetSubscriptionStore();
            await logout();
          },
        },
      ]
    );
  };

  const goalLabel = FITNESS_GOALS.find((g) => g.value === profile?.fitnessGoal)?.label || profile?.fitnessGoal;
  const levelLabel = FITNESS_LEVELS.find((l) => l.value === profile?.fitnessLevel)?.label || profile?.fitnessLevel;

  const inputStyle = (field) => ({
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: errors[field] ? COLORS.danger : (isDark ? COLORS.dark.border : COLORS.light.border),
    backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  });

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          {!isEditing && (
            <TouchableOpacity
              onPress={startEditing}
              style={[styles.editBtn, { backgroundColor: `${COLORS.primary}18` }]}
            >
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.editBtnText, { color: COLORS.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Avatar + Name ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
            {profile?.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${COLORS.primary}25` },
                ]}
              >
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploadingPhoto ? (
                <InlineSpinner color="#FFF" size={14} />
              ) : (
                <Ionicons name="camera" size={14} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile?.name || 'Your Name'}
            </Text>
            {isPro && <ProBadge size="medium" />}
          </View>
          <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
            {user?.email}
          </Text>
          <View
            style={[
              styles.goalBadge,
              { backgroundColor: `${COLORS.primary}18` },
            ]}
          >
            <Text style={[styles.goalBadgeText, { color: COLORS.primary }]}>
              {goalLabel || 'No goal set'}
            </Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Workouts', value: workouts.length, icon: 'fitness-outline', color: COLORS.primary },
            { label: 'Streak', value: streak, icon: 'flame-outline', color: COLORS.warning, showFlame: true },
            { label: 'Calories', value: totalCalories > 999 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories, icon: 'flash-outline', color: COLORS.danger },
          ].map((stat, i) => (
            <View
              key={i}
              style={[
                styles.statBox,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                  marginLeft: i > 0 ? 12 : 0,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                {stat.showFlame && <Ionicons name="flame" size={16} color={stat.color} />}
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Edit Form ── */}
        {isEditing ? (
          <View
            style={[
              styles.editCard,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Profile</Text>

            {[
              { key: 'name', label: 'Full Name', placeholder: 'John Doe', keyboardType: 'default', autoCapitalize: 'words' },
              { key: 'age', label: 'Age', placeholder: '25', keyboardType: 'number-pad', maxLength: 3 },
              { key: 'heightCm', label: 'Height (cm)', placeholder: '175', keyboardType: 'decimal-pad', maxLength: 6 },
              { key: 'weightKg', label: 'Weight (kg)', placeholder: '70', keyboardType: 'decimal-pad', maxLength: 6 },
            ].map(({ key, label, placeholder, keyboardType, autoCapitalize, maxLength }) => (
              <View key={key} style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  value={editData[key]}
                  onChangeText={(t) => {
                    let filtered = t;
                    if (keyboardType === 'number-pad') filtered = t.replace(/[^0-9]/g, '');
                    else if (keyboardType === 'decimal-pad') filtered = t.replace(/[^0-9.]/g, '');
                    setEditData((d) => ({ ...d, [key]: filtered }));
                    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
                  }}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={keyboardType}
                  autoCapitalize={autoCapitalize || 'none'}
                  maxLength={maxLength}
                  style={inputStyle(key)}
                />
                {errors[key] && <Text style={styles.fieldError}>{errors[key]}</Text>}
              </View>
            ))}

            {/* Fitness Level Selector */}
            <Text style={[styles.editLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
              Fitness Level
            </Text>
            <View style={styles.selectorRow}>
              {FITNESS_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  onPress={() => setEditData((d) => ({ ...d, fitnessLevel: level.value }))}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: editData.fitnessLevel === level.value ? COLORS.primary : `${COLORS.primary}12`,
                      borderColor: editData.fitnessLevel === level.value ? COLORS.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: editData.fitnessLevel === level.value ? '#FFF' : COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Goal Selector */}
            <Text style={[styles.editLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 8 }]}>
              Fitness Goal
            </Text>
            <View style={styles.selectorRow}>
              {FITNESS_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.value}
                  onPress={() => setEditData((d) => ({ ...d, fitnessGoal: goal.value }))}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: editData.fitnessGoal === goal.value ? COLORS.primary : `${COLORS.primary}12`,
                      borderColor: editData.fitnessGoal === goal.value ? COLORS.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: editData.fitnessGoal === goal.value ? '#FFF' : COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                    {goal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Training Location */}
            <Text style={[styles.editLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 8 }]}>
              Training Location
            </Text>
            <View style={styles.selectorRow}>
              {WORKOUT_LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc.value}
                  onPress={() => setEditData((d) => ({ ...d, workoutLocation: loc.value }))}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: editData.workoutLocation === loc.value ? COLORS.primary : `${COLORS.primary}12`,
                      borderColor: editData.workoutLocation === loc.value ? COLORS.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: editData.workoutLocation === loc.value ? '#FFF' : COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Days per week */}
            <Text style={[styles.editLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 8 }]}>
              Days per week
            </Text>
            <View style={styles.selectorRow}>
              {WORKOUT_FREQUENCIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setEditData((ed) => ({ ...ed, workoutDaysPerWeek: d }))}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: editData.workoutDaysPerWeek === d ? COLORS.primary : `${COLORS.primary}12`,
                      borderColor: editData.workoutDaysPerWeek === d ? COLORS.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: editData.workoutDaysPerWeek === d ? '#FFF' : COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Session length */}
            <Text style={[styles.editLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 8 }]}>
              Session length
            </Text>
            <View style={styles.selectorRow}>
              {SESSION_DURATIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setEditData((ed) => ({ ...ed, sessionDurationMin: m }))}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor: editData.sessionDurationMin === m ? COLORS.primary : `${COLORS.primary}12`,
                      borderColor: editData.sessionDurationMin === m ? COLORS.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: editData.sessionDurationMin === m ? '#FFF' : COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                    {m} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target weight (only for lose/build goals) */}
            {(editData.fitnessGoal === 'lose_weight' || editData.fitnessGoal === 'build_muscle') && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.editLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                  Target weight (kg)
                </Text>
                <TextInput
                  value={editData.targetWeightKg}
                  onChangeText={(t) => setEditData((ed) => ({ ...ed, targetWeightKg: t.replace(/[^0-9.]/g, '') }))}
                  placeholder="Optional"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={inputStyle('targetWeightKg')}
                  maxLength={6}
                />
                {errors.targetWeightKg && <Text style={styles.fieldError}>{errors.targetWeightKg}</Text>}
              </View>
            )}

            {/* Save / Cancel */}
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={cancelEdit}
                style={[
                  styles.cancelBtn,
                  { borderColor: isDark ? COLORS.dark.border : COLORS.light.border },
                ]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={[styles.saveBtn, { opacity: loading ? 0.7 : 1 }]}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.btnRow}>
                    <InlineSpinner color="#FFF" size={16} />
                    <Text style={styles.saveBtnText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── Profile Info Cards ── */
          <>
            {/* Body Stats */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Stats</Text>
              {[
                { icon: 'resize-outline', label: 'Height', value: profile?.heightCm ? `${profile.heightCm} cm` : '—', color: COLORS.info },
                { icon: 'scale-outline', label: 'Weight', value: profile?.weightKg ? `${profile.weightKg} kg` : '—', color: COLORS.primary },
                { icon: 'calendar-outline', label: 'Age', value: profile?.age ? `${profile.age} years` : '—', color: COLORS.warning },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}

              {/* BMI with visual bar */}
              {bmiInfo && bmiInfo.bmi > 0 && (
                <View
                  style={[
                    styles.bmiRow,
                    { backgroundColor: `${bmiInfo.color}12`, borderColor: `${bmiInfo.color}25` },
                  ]}
                >
                  <View style={styles.bmiHeader}>
                    <Text style={[styles.bmiLabel, { color: colors.textSecondary }]}>BMI</Text>
                    <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>{bmiInfo.bmi}</Text>
                    <Text style={[styles.bmiCategory, { color: bmiInfo.color }]}>{bmiInfo.category}</Text>
                  </View>
                  {/* Visual BMI bar */}
                  <View style={styles.bmiBarContainer}>
                    <View style={styles.bmiBar}>
                      <View style={[styles.bmiSegment, { backgroundColor: '#60A5FA', flex: 3.5 }]} />
                      <View style={[styles.bmiSegment, { backgroundColor: '#22C55E', flex: 6.5 }]} />
                      <View style={[styles.bmiSegment, { backgroundColor: '#FBBF24', flex: 5 }]} />
                      <View style={[styles.bmiSegment, { backgroundColor: '#EF4444', flex: 10 }]} />
                    </View>
                    {/* BMI indicator dot */}
                    <View
                      style={[
                        styles.bmiIndicator,
                        {
                          left: `${Math.min(Math.max(((bmiInfo.bmi - 15) / 25) * 100, 0), 100)}%`,
                          backgroundColor: bmiInfo.color,
                        },
                      ]}
                    />
                    <View style={styles.bmiLabelsRow}>
                      <Text style={[styles.bmiBarLabel, { color: colors.textMuted }]}>15</Text>
                      <Text style={[styles.bmiBarLabel, { color: colors.textMuted }]}>18.5</Text>
                      <Text style={[styles.bmiBarLabel, { color: colors.textMuted }]}>25</Text>
                      <Text style={[styles.bmiBarLabel, { color: colors.textMuted }]}>30</Text>
                      <Text style={[styles.bmiBarLabel, { color: colors.textMuted }]}>40</Text>
                    </View>
                  </View>
                  {idealWeight && (
                    <Text style={[styles.idealWeight, { color: colors.textMuted }]}>
                      Ideal weight: {idealWeight.min}–{idealWeight.max} kg
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Fitness Info */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                  borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Fitness</Text>
              {[
                { icon: 'podium-outline', label: 'Level', value: levelLabel || '—', color: COLORS.success },
                { icon: 'flag-outline', label: 'Goal', value: goalLabel || '—', color: COLORS.primary },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Settings ── */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>

          {/* DEV: Pro Toggle — remove before production */}
          {__DEV__ && (
            <View style={styles.settingRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${COLORS.warning}18` }]}>
                <Ionicons name="diamond" size={16} color={COLORS.warning} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                DEV: Pro Mode
              </Text>
              <Switch
                value={isPro}
                onValueChange={() => { haptics.selection(); useSubscriptionStore.getState().toggleProDev(); }}
                trackColor={{ false: '#E0E0E0', true: `${COLORS.warning}60` }}
                thumbColor={isPro ? COLORS.warning : '#999999'}
              />
            </View>
          )}

          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.primary}18` }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={16} color={COLORS.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Switch
              value={isDark}
              onValueChange={(v) => { haptics.selection(); toggleTheme(v); }}
              trackColor={{ false: '#E0E0E0', true: `${COLORS.primary}60` }}
              thumbColor={isDark ? COLORS.primary : '#999999'}
            />
          </View>

          {/* Notifications Toggle */}
          <View style={styles.settingRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.warning}18` }]}>
              <Ionicons name="notifications-outline" size={16} color={COLORS.warning} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Workout Reminders
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={(v) => { haptics.selection(); handleToggleNotifications(v); }}
              trackColor={{ false: '#E0E0E0', true: `${COLORS.warning}60` }}
              thumbColor={notificationsEnabled ? COLORS.warning : '#999999'}
            />
          </View>

          {/* Export Data */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.success}18` }]}>
              <Ionicons name="download-outline" size={16} color={COLORS.success} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Export Workout Data
            </Text>
            {!isPro && <ProBadge />}
            {exporting ? (
              <InlineSpinner color={COLORS.success} size={16} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          {/* Upgrade / Manage Subscription */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Paywall', { feature: 'profile' })}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.warning}18` }]}>
              <Ionicons name="diamond-outline" size={16} color={COLORS.warning} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
            </Text>
            {!isPro && (
              <View style={{ backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700' }}>Unlock All</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Friends */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => { haptics.light(); navigation.navigate(ROUTES.SOCIAL); }}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.primary}18` }]}>
              <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Friends & Leaderboard
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Contact Us */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => { haptics.light(); navigation.navigate('Contact'); }}
            activeOpacity={0.7}
          >
            <View style={[styles.infoIcon, { backgroundColor: `${COLORS.info}18` }]}>
              <Ionicons name="chatbubbles-outline" size={16} color={COLORS.info} />
            </View>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Contact Us
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>
          FitTrack AI v1.0.0
        </Text>

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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  editBtnText: { fontSize: 13, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingBottom: 24 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 8,
    right: -4,
    backgroundColor: COLORS.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  profileName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  profileEmail: { fontSize: 13, marginTop: 4 },
  goalBadge: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  goalBadgeText: { fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700' },
  bmiRow: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bmiLabel: { fontSize: 13, fontWeight: '600' },
  bmiValue: { fontSize: 22, fontWeight: '800' },
  bmiCategory: { fontSize: 13, fontWeight: '700', flex: 1 },
  bmiBarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  bmiBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bmiSegment: {
    height: '100%',
  },
  bmiIndicator: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  bmiLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bmiBarLabel: { fontSize: 9, fontWeight: '500' },
  idealWeight: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  editCard: {
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  editField: { marginBottom: 14 },
  editLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: 6,
  },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 4, fontWeight: '500' },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  settingLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  logoutBtn: {
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: `${COLORS.danger}40`,
    backgroundColor: `${COLORS.danger}08`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
  },
  logoutText: { color: COLORS.danger, fontSize: 15, fontWeight: '700' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});

export default ProfileScreen;
