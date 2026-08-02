/**
 * BII — Firebase / FCM helpers
 * Lazy-initialised: config is fetched from the backend so the admin
 * can update it through Settings → Firebase without a code deploy.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { api } from './api';

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
 * Request notification permission, register the SW, and return the FCM token.
 * Returns null if Firebase is not configured or permission is denied.
 */
export async function requestFCMToken() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

    // Ask immediately while the call still has the user's click activation.
    // Waiting for the network/config before this can be ignored by mobile
    // browsers as an unsolicited permission request.
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const cfg = await fetchConfig();
    if (!cfg.api_key || !cfg.vapid_key) return null;

    const app = await getFirebaseApp();
    if (!app) return null;

    if (!_messaging) _messaging = getMessaging(app);

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(_messaging, {
      vapidKey:                    cfg.vapid_key,
      serviceWorkerRegistration:   swReg,
    });
    return token || null;
  } catch (err) {
    console.warn('[BII FCM] token error:', err);
    return null;
  }
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
