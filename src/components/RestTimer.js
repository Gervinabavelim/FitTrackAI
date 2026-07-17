import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../hooks/useTheme';
import { COLORS } from '../utils/constants';

const PRESETS = [30, 60, 90, 120, 180];

const RestTimer = () => {
  const { isDark, colors } = useTheme();
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            Vibration.vibrate([0, 300, 100, 300]);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [running]);

  const start = () => {
    setRemaining(seconds);
    setRunning(true);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = seconds > 0 ? remaining / seconds : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
          borderColor: running ? COLORS.primary : (isDark ? COLORS.dark.border : COLORS.light.border),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="timer-outline" size={16} color={COLORS.primary} />
          <Text style={[styles.title, { color: colors.text }]}>Rest Timer</Text>
        </View>
        {running && (
          <TouchableOpacity onPress={stop}>
            <Text style={[styles.stopText, { color: COLORS.danger }]}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {running ? (
        <Animated.View style={[styles.timerDisplay, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={[styles.timerText, { color: remaining <= 5 ? COLORS.danger : COLORS.primary }]}>
            {formatTime(remaining)}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: `${COLORS.primary}20` }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: remaining <= 5 ? COLORS.danger : COLORS.primary },
              ]}
            />
          </View>
        </Animated.View>
      ) : (
        <>
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setSeconds(p)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: seconds === p ? COLORS.primary : `${COLORS.primary}15`,
                  },
                ]}
              >
                <Text style={{ color: seconds === p ? '#FFF' : COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                  {p < 60 ? `${p}s` : `${p / 60}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: COLORS.primary }]}
            onPress={start}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={16} color="#FFF" />
            <Text style={styles.startText}>Start {formatTime(seconds)}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '700' },
  stopText: { fontSize: 13, fontWeight: '700' },
  timerDisplay: { alignItems: 'center', paddingVertical: 8 },
  timerText: { fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  presets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default RestTimer;
