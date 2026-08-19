/**
 * BII — Firebase / FCM helpers
 * Lazy-initialised: config is fetched from the backend so the admin
 * can update it through Settings → Firebase without a code deploy.
 *
 * 2026-08-08: Branches between native (Capacitor), Firebase Web, and VAPID-only modes.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { api } from './api';
import { isNativePlatform, requestNativePushToken } from './capacitor-push';

let _app       = null;
let _messaging = null;
let _config    = null;

async function fetchConfig() {
  if (_config) return _config;
  try {
    const { data } = await api.get('/configs/firebase-web');
    _config = data;
  } catch {
    _config = {};
  }
  return _config;
}

async function getFirebaseApp() {
  if (_app) return _app;
  const cfg = await fetchConfig();
  if (!cfg.api_key || !cfg.messaging_sender_id) return null;
  _app = getApps().length ? getApp() : initializeApp({
    apiKey:            cfg.api_key,
    authDomain:        cfg.auth_domain,
    projectId:         cfg.project_id,
    storageBucket:     cfg.storage_bucket,
    messagingSenderId: cfg.messaging_sender_id,
    appId:             cfg.app_id,
  });
  return _app;
}

/**
 * VAPID-only push: use the browser's native PushManager without Firebase.
 * Falls back when Firebase config is missing (no api_key/vapid_key from Firebase).
 */
async function requestVapidOnlyToken() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Fetch our own VAPID public key from the backend
    const { data } = await api.get('/web-push/vapid-key');
    const vapidPublicKey = data?.public_key;
    if (!vapidPublicKey) {
      return null;
    }

    // Convert VAPID key to Uint8Array for PushManager
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const subscription = await swReg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const sub = subscription.toJSON();
    // Send subscription to our backend for storage
    await api.post('/web-push/subscribe', {
      endpoint: sub.endpoint,
      p256dh:   sub.keys?.p256dh || '',
      auth:     sub.keys?.auth   || '',
    });

    return sub.endpoint; // Return endpoint as the "token" identifier
  } catch (err) {
    return null;
  }
}

/**
 * Convert a base64url string to Uint8Array (for VAPID applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission, register the SW, and return the FCM token.
 * Returns null if Firebase is not configured or permission is denied.
 *
 * On native (Capacitor) platforms, delegates to the native push plugin.
 * On web: tries Firebase first, falls back to VAPID-only if Firebase is not configured.
 */
export async function requestFCMToken() {
  try {
    // Native platform: use Capacitor push plugin
    if (isNativePlatform()) {
      return await requestNativePushToken();
    }

    // Web platform
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    // Ask immediately while the call still has the user's click activation.
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const cfg = await fetchConfig();

    // If Firebase has a vapid_key, use Firebase Web Push
    if (cfg.api_key && cfg.vapid_key) {
      const app = await getFirebaseApp();
      if (!app) {
        return null;
      }

      if (!_messaging) _messaging = getMessaging(app);

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(_messaging, {
        vapidKey:                    cfg.vapid_key,
        serviceWorkerRegistration:   swReg,
      });
      if (!token) {
      }
      return token || null;
    }

    // No Firebase config — use VAPID-only mode (our own Web Push)
    return await requestVapidOnlyToken();
  } catch (err) {
    return null;
  }
}

// The same token-registration platform value must be sent with the token.
// Native Capacitor tokens use Android/iOS FCM payload rules; browser tokens
// use Web Push rules.
export function getPushPlatform() {
  return isNativePlatform() ? "android" : "web";
}

/**
 * Listen for foreground messages (app is open).
 * Returns an unsubscribe function.
 */
export async function onForegroundMessage(callback) {
  try {
    const app = await getFirebaseApp();
    if (!app) return () => {};
    if (!_messaging) _messaging = getMessaging(app);
    return onMessage(_messaging, callback);
  } catch {
    return () => {};
  }
}
