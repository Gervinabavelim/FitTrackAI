import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useTheme from '../../hooks/useTheme';
import useHaptics from '../../hooks/useHaptics';
import { COLORS } from '../../utils/constants';

// ─── Knowledge Base ──────────────────────────────────────────────────────────
const KB = [
  {
    keywords: ['log', 'workout', 'add workout', 'record', 'track workout'],
    answer:
      'To log a workout, tap the **+** button in the center of the bottom tab bar. Choose your exercise category, select exercises, enter sets/reps/weight, and hit Save.',
  },
  {
    keywords: ['dashboard', 'home', 'main screen'],
    answer:
      'The Dashboard is your home screen. It shows your current streak, recent workouts, and daily summary. Tap any workout card to see its details.',
  },
  {
    keywords: ['progress', 'stats', 'chart', 'history', 'analytics'],
    answer:
      'Go to the **Progress** tab (bar chart icon) to view your workout history, charts, and analytics over time.',
  },
  {
    keywords: ['ai', 'plan', 'suggestion', 'generate', 'workout plan'],
    answer:
      'The **AI Plan** tab (sparkles icon) can generate a personalized weekly workout plan based on your fitness level and goals. Note: this is a Pro feature.',
  },
  {
    keywords: ['profile', 'edit profile', 'name', 'weight', 'height', 'age'],
    answer:
      'Go to the **Profile** tab and tap the **Edit** button in the top-right corner. You can update your name, age, height, weight, fitness level, and goal.',
  },
  {
    keywords: ['dark mode', 'theme', 'light mode', 'appearance'],
    answer:
      'You can toggle Dark/Light mode in **Profile > Settings**. Look for the sun/moon toggle.',
  },
  {
    keywords: ['notification', 'reminder', 'alert'],
    answer:
      'Workout reminders can be enabled or disabled in **Profile > Settings > Workout Reminders**.',
  },
  {
    keywords: ['export', 'csv', 'download', 'data'],
    answer:
      'You can export your workout data as a CSV file from **Profile > Settings > Export Workout Data**. This is a Pro feature.',
  },
  {
    keywords: ['pro', 'subscription', 'upgrade', 'premium', 'pay', 'price'],
    answer:
      'FitTrack AI Pro unlocks AI workout plans, data export, and advanced analytics. Go to **Profile > Upgrade to Pro** to see pricing and subscribe.',
  },
  {
    keywords: ['bmi', 'body mass'],
    answer:
      'Your BMI is displayed on the Profile screen under Body Stats, along with a visual scale and your ideal weight range.',
  },
  {
    keywords: ['streak', 'flame', 'consecutive'],
    answer:
      'Your workout streak shows how many consecutive days you have logged a workout. Keep it going by logging at least one workout per day!',
  },
  {
    keywords: ['calorie', 'calories', 'burn'],
    answer:
      'Calories burned are estimated using MET values for each exercise. You can see your total calories on the Dashboard and Profile screens.',
  },
  {
    keywords: ['bug', 'crash', 'error', 'not working', 'broken', 'issue', 'problem', 'glitch'],
    answer:
      'Sorry to hear that! Please try these steps:\n1. Close and reopen the app\n2. Check your internet connection\n3. Make sure the app is updated to the latest version\n\nIf the issue persists, please email us at **support@fittrack.ai** with a description of the problem.',
  },
  {
    keywords: ['delete', 'account', 'remove'],
    answer:
      'To delete your account, please contact us at **support@fittrack.ai**. We will process your request within 48 hours.',
  },
  {
    keywords: ['password', 'reset password', 'forgot', 'login issue', 'sign in'],
    answer:
      'If you forgot your password, tap "Forgot Password?" on the login screen to receive a reset email. Check your spam folder if you don\'t see it.',
  },
  {
    keywords: ['photo', 'avatar', 'picture', 'camera'],
    answer:
      'To change your profile photo, go to **Profile** and tap on your avatar. You can take a new photo or choose from your gallery.',
  },
];

const QUICK_ACTIONS = [
  { label: 'How to log a workout?', icon: 'barbell-outline' },
  { label: 'App not working', icon: 'warning-outline' },
  { label: 'How to upgrade to Pro?', icon: 'diamond-outline' },
  { label: 'Edit my profile', icon: 'person-outline' },
];

// ─── Bot Logic ───────────────────────────────────────────────────────────────
const getBotReply = (input) => {
  const lower = input.toLowerCase().trim();

  if (['hi', 'hello', 'hey', 'sup', 'yo'].some((g) => lower === g || lower.startsWith(g + ' '))) {
    return "Hi there! I'm FitBot, your FitTrack AI assistant. How can I help you today? You can ask me about app features, navigation, or report an issue.";
  }

  if (['thank', 'thanks', 'thx'].some((t) => lower.includes(t))) {
    return "You're welcome! Let me know if there's anything else I can help with.";
  }

  if (['bye', 'goodbye'].some((b) => lower.includes(b))) {
    return 'Goodbye! Happy training! Feel free to come back anytime you need help.';
  }

  // Score each KB entry
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        score += kw.split(' ').length; // multi-word matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch) return bestMatch.answer;

  return "I'm not sure I understand that. Here are some things I can help with:\n\n- How to log a workout\n- Viewing your progress & stats\n- Profile & settings\n- Pro subscription info\n- Reporting bugs or issues\n\nTry asking about one of these, or email **support@fittrack.ai** for more help.";
};

// ─── Message Bubble ──────────────────────────────────────────────────────────
const MessageBubble = ({ message, isDark, colors }) => {
  const isBot = message.from === 'bot';

  // Simple markdown-like bold rendering
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={i} style={{ fontWeight: '700' }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View
      style={[
        styles.bubble,
        isBot ? styles.botBubble : styles.userBubble,
        {
          backgroundColor: isBot
            ? isDark ? COLORS.dark.secondaryCard : '#F0F0F0'
            : COLORS.primary,
        },
      ]}
    >
      {isBot && (
        <View style={styles.botHeader}>
          <View style={[styles.botAvatar, { backgroundColor: `${COLORS.primary}20` }]}>
            <Ionicons name="fitness" size={14} color={COLORS.primary} />
          </View>
          <Text style={[styles.botName, { color: COLORS.primary }]}>FitBot</Text>
        </View>
      )}
      <Text
        style={[
          styles.bubbleText,
          { color: isBot ? (isDark ? colors.text : '#1A1A1A') : '#FFFFFF' },
        ]}
      >
        {renderText(message.text)}
      </Text>
      <Text
        style={[
          styles.timestamp,
          { color: isBot ? colors.textMuted : 'rgba(255,255,255,0.6)' },
        ]}
      >
        {message.time}
      </Text>
    </View>
  );
};

// ─── Contact Screen ──────────────────────────────────────────────────────────
const ContactScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const haptics = useHaptics();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      from: 'bot',
      text: "Hi! I'm FitBot, your FitTrack AI support assistant. I can help you navigate the app, answer questions about features, or troubleshoot issues.\n\nTap a quick action below or type your question!",
      time: formatTime(),
    },
  ]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  function formatTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    haptics.light();

    const userMsg = { id: Date.now().toString(), from: 'user', text: trimmed, time: formatTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate typing delay
    setTimeout(() => {
      const reply = getBotReply(trimmed);
      const botMsg = { id: (Date.now() + 1).toString(), from: 'bot', text: reply, time: formatTime() };
      setMessages((prev) => [...prev, botMsg]);
    }, 600);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? COLORS.dark.border : COLORS.light.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: `${COLORS.primary}20` }]}>
            <Ionicons name="fitness" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>FitBot Support</Text>
            <Text style={[styles.headerSubtitle, { color: COLORS.success }]}>Online</Text>
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isDark={isDark} colors={colors} />
          ))}

          {/* Quick Actions — only show at start */}
          {messages.length === 1 && (
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.quickBtn,
                    {
                      backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
                      borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
                    },
                  ]}
                  onPress={() => sendMessage(action.label)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={action.icon} size={16} color={COLORS.primary} />
                  <Text style={[styles.quickBtnText, { color: colors.text }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
              borderTopColor: isDark ? COLORS.dark.border : COLORS.light.border,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? COLORS.dark.secondaryCard : '#F5F5F5',
                color: colors.text,
              },
            ]}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            style={[styles.sendBtn, { opacity: input.trim() ? 1 : 0.4 }]}
            disabled={!input.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '500' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  botBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  botHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  botAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  botName: { fontSize: 12, fontWeight: '700' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  timestamp: { fontSize: 10, marginTop: 6, textAlign: 'right' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ContactScreen;
