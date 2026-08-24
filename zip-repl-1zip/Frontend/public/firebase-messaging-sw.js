/* ================================================================
   BII — Push Notification Service Worker
   Handles both Firebase Cloud Messaging and native Web Push (VAPID).

   2026-08-08: Added native 'push' event handler for zero-Firebase mode.
   ================================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

let isInitialized = false;
const APP_ICON = new URL('logo192.png', self.registration.scope).href;

function notificationContent(payload) {
  const notification = payload?.notification || {};
  const data = payload?.data || payload || {};

  return {
    title: notification.title
      || data.title
      || data.title_bn
      || data.title_en
      || 'বাঙালি ইসলামিক ইনস্টিটিউট',
    body: notification.body
      || data.body
      || data.body_bn
      || data.body_en
      || '',
    image: notification.image || data.image || data.image_url || '',
    clickUrl: data.click_action
      || data.clickAction
      || payload?.fcmOptions?.link
      || '/',
  };
}

function notificationOptions(content) {
  const options = {
    body: content.body,
    icon: APP_ICON,
    badge: APP_ICON,
    data: { click_action: content.clickUrl },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: 'bii-push',
    renotify: true,
  };
  if (content.image) options.image = content.image;
  return options;
}

async function initFirebase() {
  if (isInitialized) return;
  try {
    const resp = await fetch('/api/configs/firebase-web');
    if (!resp.ok) return;
    const cfg = await resp.json();
    const firebaseWebEnabled = cfg.firebase_web_enabled === true
      || cfg.firebase_web_enabled === 1
      || cfg.firebase_web_enabled === '1'
      || cfg.firebase_web_enabled === 'true';
    if (!firebaseWebEnabled || !cfg.api_key || !cfg.messaging_sender_id) return;

    firebase.initializeApp({
      apiKey:            cfg.api_key,
      authDomain:        cfg.auth_domain,
      projectId:         cfg.project_id,
      storageBucket:     cfg.storage_bucket,
      messagingSenderId: cfg.messaging_sender_id,
      appId:             cfg.app_id,
    });
    isInitialized = true;

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const content = notificationContent(payload);
      self.registration.showNotification(content.title, notificationOptions(content));
    });
  } catch (err) {
    console.warn('[BII FCM SW] init failed:', err);
  }
}

self.addEventListener('install',  (e) => { self.skipWaiting(); e.waitUntil(initFirebase()); });
self.addEventListener('activate', (e) => { e.waitUntil(clients.claim()); });

/* ── Native Web Push (VAPID) — handles push events when Firebase is not configured.
   Firebase's onBackgroundMessage intercepts push events when Firebase is active,
   so this only fires in VAPID-only mode (no Firebase SDK loaded). */
self.addEventListener('push', (event) => {
  // If Firebase is active, skip — it handles push via onBackgroundMessage
  if (isInitialized) return;

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: event.data.text() };
    }
  }

  const content = notificationContent(data);

  event.waitUntil(
    self.registration.showNotification(content.title, notificationOptions(content))
  );
});

/* ── Notification click — shared by both Firebase and native push */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.click_action || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return clients.openWindow(url);
    })
  );
});
