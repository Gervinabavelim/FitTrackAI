import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import { COLORS } from '../../utils/constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'barbell-outline',
    iconColor: COLORS.primary,
    title: 'Track Your Workouts',
    subtitle:
      'Log exercises, sets, reps, and calories with just a few taps. Build a complete history of your training.',
  },
  {
    icon: 'sparkles',
    iconColor: COLORS.warning,
    title: 'AI-Powered Plans',
    subtitle:
      'Get a personalized 7-day workout plan crafted by AI based on your goals, fitness level, and history.',
  },
  {
    icon: 'bar-chart-outline',
    iconColor: COLORS.success,
    title: 'Monitor Progress',
    subtitle:
      'Visualize your gains with charts, track your streak, and watch your consistency grow over time.',
  },
];

const OnboardingScreen = ({ onComplete }) => {
  const { isDark, colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (event) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const goToNext = () => {
    if (currentPage < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentPage + 1) * width,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const isLastSlide = currentPage === SLIDES.length - 1;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? COLORS.dark.background
              : COLORS.light.background,
          },
        ]}
      >
        <View style={styles.skipRow}>
          {!isLastSlide ? (
            <TouchableOpacity
              onPress={onComplete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.skipText, { color: colors.textMuted }]}>
                Skip
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide, index) => (
            <View key={index} style={styles.slide}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: `${slide.iconColor}15` },
                ]}
              >
                <Ionicons name={slide.icon} size={64} color={slide.iconColor} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {slide.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {slide.subtitle}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentPage
                      ? COLORS.primary
                      : isDark
                        ? COLORS.dark.border
                        : COLORS.light.border,
                  width: i === currentPage ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={goToNext}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            {!isLastSlide && (
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipText: { fontSize: 15, fontWeight: '600' },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 18,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default OnboardingScreen;
