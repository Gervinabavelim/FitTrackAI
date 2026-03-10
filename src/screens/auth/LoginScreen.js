import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, ROUTES } from '../../utils/constants';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAuthRateLimit } from '../../utils/rateLimiter';

const LoginScreen = ({ navigation }) => {
  const { login, resetPassword, loading, authError, clearError } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const passwordRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ─── Entrance Animations ────────────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(-30)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const footerTranslateY = useRef(new Animated.Value(20)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance sequence
    Animated.sequence([
      // 1. Logo pops in with spring
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 2. Hero text slides down
      Animated.parallel([
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 3. Form card slides up
      Animated.parallel([
        Animated.spring(formTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 4. Footer fades in
      Animated.parallel([
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(footerTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle continuous logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // ─── Button press animation ─────────────────────────────────────────────────
  const onBtnPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };
  const onBtnPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Shake animation for error ───────────────────────────────────────────────
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  // ─── Handle Login ─────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    clearError();
    setFieldErrors({});

    if (!validate()) {
      shake();
      return;
    }

    const rateCheck = checkAuthRateLimit();
    if (!rateCheck.allowed) {
      setFieldErrors({ email: rateCheck.message });
      shake();
      return;
    }

    const result = await login(email.trim().toLowerCase(), password);

    if (!result.success) {
      shake();
      return;
    }
  };

  const inputStyle = (field) => [
    styles.input,
    {
      backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
      borderColor: fieldErrors[field]
        ? COLORS.danger
        : isDark
        ? COLORS.dark.border
        : COLORS.light.border,
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Hero */}
          <View style={styles.heroSection}>
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: `${COLORS.primary}20`,
                  transform: [{ scale: Animated.multiply(logoScale, logoPulse) }],
                  opacity: logoOpacity,
                },
              ]}
            >
              <Text style={styles.logoEmoji}>💪</Text>
            </Animated.View>
            <Animated.Text
              style={[
                styles.appName,
                {
                  color: colors.text,
                  opacity: heroOpacity,
                  transform: [{ translateY: heroTranslateY }],
                },
              ]}
            >
              FitTrack AI
            </Animated.Text>
            <Animated.Text
              style={[
                styles.tagline,
                {
                  color: colors.textSecondary,
                  opacity: heroOpacity,
                  transform: [{ translateY: heroTranslateY }],
                },
              ]}
            >
              Your intelligent fitness companion
            </Animated.Text>
          </View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                transform: [{ translateX: shakeAnim }, { translateY: formTranslateY }],
                opacity: formOpacity,
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Sign in to continue your fitness journey
            </Text>

            {/* Auth error banner */}
            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FFF" />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={fieldErrors.email ? COLORS.danger : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={inputStyle('email')}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: null }));
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                  maxLength={254}
                />
              </View>
              {fieldErrors.email && (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              )}
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={fieldErrors.password ? COLORS.danger : colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[inputStyle('password'), { paddingRight: 48 }]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: null }));
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                  maxLength={128}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              )}
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={async () => {
                const trimmedEmail = email.trim().toLowerCase();
                if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                  Alert.alert('Enter Your Email', 'Please enter your email address above, then tap "Forgot password?" again.');
                  return;
                }
                const result = await resetPassword(trimmedEmail);
                if (result.success) {
                  Alert.alert(
                    'Check Your Inbox',
                    `We've sent a password reset link to ${trimmedEmail}. Check your spam folder if you don't see it.`
                  );
                } else {
                  Alert.alert('Reset Failed', result.error);
                }
              }}
            >
              <Text style={[styles.forgotText, { color: COLORS.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[
                  styles.loginBtn,
                  {
                    backgroundColor: COLORS.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleLogin}
                onPressIn={onBtnPressIn}
                onPressOut={onBtnPressOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <View style={styles.btnContent}>
                    <InlineSpinner color="#FFF" size={18} />
                    <Text style={styles.loginBtnText}>Signing in...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Register link */}
          <Animated.View
            style={[
              styles.registerRow,
              {
                opacity: footerOpacity,
                transform: [{ translateY: footerTranslateY }],
              },
            ]}
          >
            <Text style={[styles.registerPrompt, { color: colors.textSecondary }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
              disabled={loading}
            >
              <Text style={[styles.registerLink, { color: COLORS.primary }]}>
                {' '}Create account
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '400',
  },
  formCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingLeft: 44,
    paddingRight: 16,
    fontSize: 16,
    fontWeight: '400',
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    zIndex: 1,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerPrompt: {
    fontSize: 14,
    fontWeight: '400',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;
