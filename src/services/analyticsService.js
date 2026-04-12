import firebase from 'firebase/compat/app';
import { db, auth } from '../config/firebase';
import { Platform } from 'react-native';
import { captureException } from '../config/sentry';

/**
 * Lightweight analytics service backed by Firestore.
 *
 * Events are written to /analytics_events/{autoId} with userId, timestamp, and
 * props. Writes are best-effort and non-blocking — failures are silent so they
 * never disrupt UX. Batches fire-and-forget; we never await them from callers.
 *
 * To migrate to Mixpanel / PostHog / Firebase Analytics later, swap the
 * implementations of trackEvent / trackScreen / identify. No screen-level
 * changes needed.
 */

const EVENT_COLLECTION = 'analytics_events';
const MAX_PROP_LEN = 500;

function scrubProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') out[k] = v.slice(0, MAX_PROP_LEN);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else out[k] = String(v).slice(0, MAX_PROP_LEN);
  }
  return out;
}

function write(record) {
  try {
    db.collection(EVENT_COLLECTION)
      .add({
        ...record,
        serverTs: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch(() => {});
  } catch (err) {
    captureException(err);
  }
}

export function trackEvent(name, props = {}) {
  if (typeof name !== 'string' || name.length === 0) return;
  const uid = auth.currentUser?.uid || null;
  const record = {
    type: 'event',
    name: name.slice(0, 80),
    userId: uid,
    platform: Platform.OS,
    props: scrubProps(props),
    ts: new Date().toISOString(),
  };
  if (__DEV__) {
    console.log(`[Analytics] Event: ${name}`, props);
  }
  write(record);
}

export function trackScreen(name) {
  if (typeof name !== 'string' || name.length === 0) return;
  const uid = auth.currentUser?.uid || null;
  const record = {
    type: 'screen',
    name: name.slice(0, 80),
    userId: uid,
    platform: Platform.OS,
    ts: new Date().toISOString(),
  };
  if (__DEV__) {
    console.log(`[Analytics] Screen: ${name}`);
  }
  write(record);
}

/**
 * Attach persistent user traits (fitness goal, pro status, etc.) to all future
 * events. Stored in memory; not written as its own record.
 */
const traits = {};
export function identify(updates = {}) {
  Object.assign(traits, scrubProps(updates));
  if (__DEV__) {
    console.log('[Analytics] Identify:', traits);
  }
}

export function getTraits() {
  return { ...traits };
}
