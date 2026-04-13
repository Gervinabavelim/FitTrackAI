import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import { useToast } from '../../contexts/ToastContext';
import { COLORS } from '../../utils/constants';
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  listFriendships,
  getWeeklyLeaderboard,
} from '../../services/socialService';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import { trackEvent } from '../../services/analyticsService';

const TABS = ['Leaderboard', 'Friends', 'Requests'];

const SocialScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const [tab, setTab] = useState('Leaderboard');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [rels, board] = await Promise.all([
        listFriendships(user.uid),
        getWeeklyLeaderboard(user.uid),
      ]);
      setFriends(rels.friends);
      setIncoming(rels.incoming);
      setOutgoing(rels.outgoing);
      setLeaderboard(board);
    } catch (err) {
      showToast(err.message || 'Could not load social data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await sendFriendRequest(user.uid, email.trim());
      setEmail('');
      trackEvent('friend_request_sent', { autoAccepted: !!res.accepted });
      showToast(res.accepted ? 'Friend added!' : 'Request sent', 'success');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not send request', 'error');
    } finally {
      setSending(false);
    }
  };

  const onAccept = async (otherUid) => {
    try {
      await acceptFriendRequest(user.uid, otherUid);
      trackEvent('friend_request_accepted');
      showToast('Friend added!', 'success');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not accept', 'error');
    }
  };

  const onRemove = async (otherUid) => {
    try {
      await removeFriend(user.uid, otherUid);
      trackEvent('friend_removed');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not remove', 'error');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? COLORS.dark.background : COLORS.light.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Friends</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t;
          const badgeCount = t === 'Requests' ? incoming.length : 0;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                active && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? COLORS.primary : colors.textMuted },
                ]}
              >
                {t}
                {badgeCount > 0 ? ` (${badgeCount})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Add friend input — shown on Friends + Requests tabs */}
          {tab !== 'Leaderboard' && (
            <View
              style={[
                styles.addCard,
                { backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card },
              ]}
            >
              <Text style={[styles.addLabel, { color: colors.textMuted }]}>
                Add a friend by email
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="friend@example.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
                <TouchableOpacity
                  onPress={onSend}
                  disabled={sending || !email.trim()}
                  style={[
                    styles.sendBtn,
                    { backgroundColor: sending || !email.trim() ? colors.border : COLORS.primary },
                  ]}
                >
                  <Ionicons name="send" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {loading ? (
            <View style={{ padding: 16, gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={64} borderRadius={14} />
              ))}
            </View>
          ) : tab === 'Leaderboard' ? (
            <LeaderboardList rows={leaderboard} colors={colors} isDark={isDark} />
          ) : tab === 'Friends' ? (
            <FriendsList
              friends={friends}
              colors={colors}
              isDark={isDark}
              onRemove={onRemove}
            />
          ) : (
            <RequestsList
              incoming={incoming}
              outgoing={outgoing}
              colors={colors}
              isDark={isDark}
              onAccept={onAccept}
              onRemove={onRemove}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Row = ({ children, colors, isDark }) => (
  <View
    style={[
      styles.row,
      {
        backgroundColor: isDark ? COLORS.dark.card : COLORS.light.card,
        borderColor: isDark ? COLORS.dark.border : COLORS.light.border,
      },
    ]}
  >
    {children}
  </View>
);

const Avatar = ({ name }) => {
  const letter = (name || '?').trim()[0]?.toUpperCase() || '?';
  return (
    <View style={[styles.avatar, { backgroundColor: `${COLORS.primary}22` }]}>
      <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{letter}</Text>
    </View>
  );
};

const LeaderboardList = ({ rows, colors, isDark }) => {
  if (!rows.length) {
    return (
      <EmptyState
        icon="trophy-outline"
        title="No leaderboard yet"
        subtitle="Add a few friends to see how you stack up against them this week."
      />
    );
  }
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {rows.map((r, i) => (
        <Row key={r.uid} colors={colors} isDark={isDark}>
          <Text style={[styles.rank, { color: i < 3 ? COLORS.primary : colors.textMuted }]}>
            {i + 1}
          </Text>
          <Avatar name={r.user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {r.isMe ? 'You' : r.user?.name || 'Friend'}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {r.count} workout{r.count === 1 ? '' : 's'} · {r.minutes} min
            </Text>
          </View>
        </Row>
      ))}
    </View>
  );
};

const FriendsList = ({ friends, colors, isDark, onRemove }) => {
  if (!friends.length) {
    return (
      <EmptyState
        icon="people-outline"
        title="No friends yet"
        subtitle="Send a request above and start a weekly competition."
      />
    );
  }
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {friends.map((f) => (
        <Row key={f.id} colors={colors} isDark={isDark}>
          <Avatar name={f.user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {f.user?.name || 'Friend'}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{f.user?.email}</Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(f.otherUid)} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </Row>
      ))}
    </View>
  );
};

const RequestsList = ({ incoming, outgoing, colors, isDark, onAccept, onRemove }) => {
  if (!incoming.length && !outgoing.length) {
    return (
      <EmptyState
        icon="mail-outline"
        title="No pending requests"
        subtitle="When someone invites you, their request shows up here."
      />
    );
  }
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {incoming.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>INCOMING</Text>
      )}
      {incoming.map((r) => (
        <Row key={r.id} colors={colors} isDark={isDark}>
          <Avatar name={r.user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{r.user?.name || 'Someone'}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{r.user?.email}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onAccept(r.otherUid)}
            style={[styles.acceptBtn, { backgroundColor: COLORS.primary }]}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(r.otherUid)} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </Row>
      ))}

      {outgoing.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 12 }]}>
          SENT
        </Text>
      )}
      {outgoing.map((r) => (
        <Row key={r.id} colors={colors} isDark={isDark}>
          <Avatar name={r.user?.name} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{r.user?.name || 'Pending'}</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Waiting for them to accept
            </Text>
          </View>
          <TouchableOpacity onPress={() => onRemove(r.otherUid)} style={styles.iconBtn}>
            <Ionicons name="close-circle" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </Row>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  addCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
  },
  addLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rank: { fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  iconBtn: { padding: 4 },
  acceptBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  acceptText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});

export default SocialScreen;
