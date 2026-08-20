/* ================================================================
   BII — Push Notification Service Worker
   Handles both Firebase Cloud Messaging and native Web Push (VAPID).

   2026-08-08: Added native 'push' event handler for zero-Firebase mode.
   ================================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

let isInitialized = false;

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
      // FCM v1 may send data-only payloads (no notification block).
      // Check both payload.notification and payload.data for title/body.
      const title = payload.notification?.title
        || payload.data?.title_bn
        || payload.data?.title_en
        || 'বাঙালি ইসলামিক ইনস্টিটিউট';
      const body = payload.notification?.body
        || payload.data?.body_bn
        || payload.data?.body_en
        || '';
      const image = payload.notification?.image || null;
      const clickUrl = payload.data?.click_action
        || payload.fcmOptions?.link
        || '/';

      self.registration.showNotification(title, {
        body,
        icon:             '/logo192.png',
        badge:            '/logo192.png',
        image,
        data:             { click_action: clickUrl },
        vibrate:          [200, 100, 200],
        requireInteraction: true,
        tag:              'bii-push',
        renotify:         true,
      });
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

  const title = data.title
    || data.title_bn
    || data.title_en
    || 'বাঙালি ইসলামিক ইনস্টিটিউট';
  const body = data.body
    || data.body_bn
    || data.body_en
    || '';
  const image = data.image || null;
  const clickUrl = data.click_action || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:               '/logo192.png',
      badge:              '/logo192.png',
      image,
      data:               { click_action: clickUrl },
      vibrate:            [200, 100, 200],
      requireInteraction: true,
      tag:                'bii-push',
      renotify:           true,
    })
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
