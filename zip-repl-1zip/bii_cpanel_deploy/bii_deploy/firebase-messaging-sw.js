/* ================================================================
   BII — Firebase Cloud Messaging Service Worker
   Handles background push notifications
   ================================================================ */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let isInitialized = false;

async function initFirebase() {
  if (isInitialized) return;
  try {
    const resp = await fetch('/api/configs/firebase-web');
    if (!resp.ok) return;
    const cfg = await resp.json();
    if (!cfg.api_key || !cfg.messaging_sender_id) return;

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
      const title      = payload.notification?.title || 'বাঙালি ইসলামিক ইনস্টিটিউট';
      const body       = payload.notification?.body  || '';
      const image      = payload.notification?.image;
      const clickUrl   = payload.data?.click_action  || payload.fcmOptions?.link || '/';

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
