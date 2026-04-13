import firebase from 'firebase/compat/app';
import { db } from '../config/firebase';
import { differenceInDays } from 'date-fns';
import { captureException } from '../config/sentry';

/**
 * Social layer — friends + weekly leaderboard. Firestore-only, no new native
 * dependencies. Friendships are stored as a single document per pair, ID
 * formed from the two UIDs sorted alphabetically. Either user can read the
 * doc; either user can accept; either user can delete.
 *
 * Collection shape:
 *   friendships/{sortedPairId}
 *     users: [uidA, uidB]       (for array-contains queries)
 *     requesterId: uid
 *     status: 'pending' | 'accepted'
 *     createdAt: serverTimestamp
 *     acceptedAt: serverTimestamp | null
 */

const COLLECTION = 'friendships';

function pairId(a, b) {
  return [a, b].sort().join('_');
}

export async function findUserByEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) return null;
  const snap = await db
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { uid: doc.id, ...doc.data() };
}

export async function sendFriendRequest(myUid, otherEmail) {
  const other = await findUserByEmail(otherEmail);
  if (!other) throw new Error('No account found with that email.');
  if (other.uid === myUid) throw new Error("That's you!");

  const id = pairId(myUid, other.uid);
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data();
    if (data.status === 'accepted') throw new Error('You are already friends.');
    if (data.requesterId === myUid) throw new Error('Request already sent.');
    // They sent you one — accept it
    await ref.update({
      status: 'accepted',
      acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return { accepted: true };
  }

  await ref.set({
    users: [myUid, other.uid].sort(),
    requesterId: myUid,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    acceptedAt: null,
  });
  return { sent: true };
}

export async function acceptFriendRequest(myUid, otherUid) {
  const id = pairId(myUid, otherUid);
  await db.collection(COLLECTION).doc(id).update({
    status: 'accepted',
    acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

export async function removeFriend(myUid, otherUid) {
  const id = pairId(myUid, otherUid);
  await db.collection(COLLECTION).doc(id).delete();
}

async function hydrateUsers(uids) {
  if (uids.length === 0) return {};
  // Firestore `in` supports up to 30 values. Chunk if needed.
  const map = {};
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const snap = await db
      .collection('users')
      .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
      .get();
    snap.forEach((d) => {
      map[d.id] = { uid: d.id, ...d.data() };
    });
  }
  return map;
}

export async function listFriendships(myUid) {
  const snap = await db
    .collection(COLLECTION)
    .where('users', 'array-contains', myUid)
    .get();

  const accepted = [];
  const incoming = [];
  const outgoing = [];
  const otherUids = new Set();

  snap.forEach((d) => {
    const data = d.data();
    const otherUid = data.users.find((u) => u !== myUid);
    if (!otherUid) return;
    otherUids.add(otherUid);
    const entry = { id: d.id, otherUid, ...data };
    if (data.status === 'accepted') accepted.push(entry);
    else if (data.requesterId === myUid) outgoing.push(entry);
    else incoming.push(entry);
  });

  const users = await hydrateUsers([...otherUids]);
  const decorate = (entry) => ({ ...entry, user: users[entry.otherUid] || { uid: entry.otherUid } });
  return {
    friends: accepted.map(decorate),
    incoming: incoming.map(decorate),
    outgoing: outgoing.map(decorate),
  };
}

async function getWeeklyStats(uid) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  try {
    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('workouts')
      .where('date', '>=', sevenDaysAgo.toISOString())
      .get();
    let count = 0;
    let minutes = 0;
    snap.forEach((d) => {
      const w = d.data();
      const date = w.date ? new Date(w.date) : null;
      if (!date || isNaN(date)) return;
      if (differenceInDays(new Date(), date) > 7) return;
      count += 1;
      minutes += Number(w.duration) || 0;
    });
    return { count, minutes };
  } catch (err) {
    captureException(err);
    return { count: 0, minutes: 0 };
  }
}

/**
 * Returns me + accepted friends, each with weekly workout count and minutes,
 * sorted descending by minutes. Fan-out reads — keep friend lists reasonable.
 */
export async function getWeeklyLeaderboard(myUid) {
  const { friends } = await listFriendships(myUid);
  const uids = [myUid, ...friends.map((f) => f.otherUid)];
  const users = await hydrateUsers(uids);
  const rows = await Promise.all(
    uids.map(async (uid) => {
      const stats = await getWeeklyStats(uid);
      return {
        uid,
        isMe: uid === myUid,
        user: users[uid] || { uid },
        ...stats,
      };
    })
  );
  rows.sort((a, b) => b.minutes - a.minutes || b.count - a.count);
  return rows;
}
