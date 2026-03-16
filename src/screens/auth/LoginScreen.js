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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { COLORS, ROUTES } from '../../utils/constants';
import { trackEvent } from '../../services/analyticsService';
import { InlineSpinner } from '../../components/LoadingSpinner';
import { checkAuthRateLimit } from '../../utils/rateLimiter';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Floating Orb Component ──────────────────────────────────────────────────
const FloatingOrb = ({ size, color, startX, startY, duration, delay }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      delay,
      useNativeDriver: true,
    }).start();

    // Floating X
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 30, duration: duration * 0.6, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -20, duration: duration * 0.4, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Floating Y
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -25, duration: duration * 0.5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 15, duration: duration * 0.5, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

const LoginScreen = ({ navigation }) => {
  const { login, resetPassword, loading, authError, clearError } = useAuthStore();
  const { isDark, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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

  // Glow ring
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  // Input focus animations
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(heroTranslateY, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(formTranslateY, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(footerTranslateY, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Glow ring pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ])
    ).start();
  }, []);

  // Focus animations
  const animateFocus = (anim, focused) => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const onBtnPressIn = () => {
    Animated.spring(btnScale, { toValue: 0.95, friction: 8, useNativeDriver: true }).start();
  };
  const onBtnPressOut = () => {
    Animated.spring(btnScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    clearError();
    setFieldErrors({});
    if (!validate()) { shake(); return; }
    const rateCheck = checkAuthRateLimit();
    if (!rateCheck.allowed) { setFieldErrors({ email: rateCheck.message }); shake(); return; }
    const result = await login(email.trim().toLowerCase(), password);
    if (result.success) {
      trackEvent('login_success');
    } else {
      trackEvent('login_failed');
      shake();
    }
  };

  const getInputBorderColor = (field, focusAnim) => {
    if (fieldErrors[field]) return COLORS.danger;
    return focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [isDark ? COLORS.dark.border : COLORS.light.border, COLORS.primary],
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}
    >
      {/* Floating orbs */}
      <FloatingOrb size={120} color={`${COLORS.primary}08`} startX={-30} startY={SCREEN_H * 0.1} duration={6000} delay={0} />
      <FloatingOrb size={80} color={`${COLORS.primary}06`} startX={SCREEN_W * 0.7} startY={SCREEN_H * 0.05} duration={7000} delay={300} />
      <FloatingOrb size={60} color={`${COLORS.primaryLight}08`} startX={SCREEN_W * 0.5} startY={SCREEN_H * 0.7} duration={5000} delay={600} />
      <FloatingOrb size={100} color={`${COLORS.info}05`} startX={SCREEN_W * 0.1} startY={SCREEN_H * 0.6} duration={8000} delay={200} />

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
            {/* Glow ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  borderColor: COLORS.primary,
                  transform: [{ scale: Animated.multiply(glowScale, logoPulse) }],
                  opacity: glowOpacity,
                },
              ]}
            />
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
              <Ionicons name="barbell-outline" size={40} color={COLORS.primary} />
            </Animated.View>
            <Animated.Text
              style={[
                styles.appName,
                { color: colors.text, opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
              ]}
            >
              FitTrack AI
            </Animated.Text>
            <Animated.Text
              style={[
                styles.tagline,
                { color: colors.textSecondary, opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
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

            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#FFF" />
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <Animated.View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: getInputBorderColor('email', emailBorderAnim),
                    backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? COLORS.primary : fieldErrors.email ? COLORS.danger : colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={(text) => { setEmail(text); if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: null })); }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  onFocus={() => { setEmailFocused(true); animateFocus(emailBorderAnim, true); }}
                  onBlur={() => { setEmailFocused(false); animateFocus(emailBorderAnim, false); }}
                  editable={!loading}
                  maxLength={254}
                />
              </Animated.View>
              {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
              <Animated.View
                style={[
                  styles.inputWrapper,
                  {
                    borderColor: getInputBorderColor('password', passwordBorderAnim),
                    backgroundColor: isDark ? COLORS.dark.inputBg : COLORS.light.inputBg,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordFocused ? COLORS.primary : fieldErrors.password ? COLORS.danger : colors.textMuted}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={(text) => { setPassword(text); if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: null })); }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => { setPasswordFocused(true); animateFocus(passwordBorderAnim, true); }}
                  onBlur={() => { setPasswordFocused(false); animateFocus(passwordBorderAnim, false); }}
                  editable={!loading}
                  maxLength={128}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
              {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
            </View>

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
                  Alert.alert('Check Your Inbox', `We've sent a password reset link to ${trimmedEmail}. Check your spam folder if you don't see it.`);
                } else {
                  Alert.alert('Reset Failed', result.error);
                }
              }}
            >
              <Text style={[styles.forgotText, { color: COLORS.primary }]}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: COLORS.primary, opacity: loading ? 0.7 : 1 }]}
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
            style={[styles.registerRow, { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] }]}
          >
            <Text style={[styles.registerPrompt, { color: colors.textSecondary }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER)} disabled={loading}>
              <Text style={[styles.registerLink, { color: COLORS.primary }]}> Create account</Text>
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
  heroSection: { alignItems: 'center', marginBottom: 32 },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    top: 0,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 14, marginTop: 6, fontWeight: '400' },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  formTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  formSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 24 },
  errorBanner: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: { color: '#FFF', fontSize: 13, fontWeight: '500', flex: 1 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    padding: 0,
  },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 6, fontWeight: '500' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  loginBtn: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  registerPrompt: { fontSize: 14, fontWeight: '400' },
  registerLink: { fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;
