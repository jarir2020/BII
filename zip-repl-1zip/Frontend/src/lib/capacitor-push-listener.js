/**
 * Capacitor Push Listener — Handles foreground push + notification taps
 * when running inside a Capacitor native shell.
 *
 * 2026-08-08: Created for Android push notification support.
 */
import { Capacitor } from "@capacitor/core";

let _registered = false;

/**
 * Register listeners for native push events (foreground messages + taps).
 * Call once from App.js when the user is logged in.
 */
export function registerNativePushListeners() {
  if (_registered || !Capacitor.isNativePlatform()) return;
  _registered = true;

  import("@capacitor/push-notifications").then(({ PushNotifications }) => {
    // Foreground message received
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[BII] Foreground push received:", notification.title);
      // The web React Notification API doesn't work in WebView,
      // so we rely on the native notification tray for display.
    });

    // Notification tapped
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification?.data || {};
      const url = data.click_action || "/home";
      console.log("[BII] Push tapped, navigating to:", url);
      window.location.assign(url);
    });
  }).catch((err) => {
    console.warn("[BII] Failed to load PushNotifications:", err);
  });
}
