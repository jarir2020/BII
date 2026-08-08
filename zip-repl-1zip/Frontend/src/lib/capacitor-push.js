/**
 * Capacitor Push — Native push registration for Android/iOS.
 *
 * Uses @capacitor/push-notifications to get a native FCM token
 * when running inside a Capacitor shell. Falls back to null on web.
 *
 * 2026-08-08: Created for Android push notification support.
 */
import { Capacitor } from "@capacitor/core";

/**
 * Check if running inside a native Capacitor shell.
 */
export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Request native push notification permission and return the FCM token.
 * Returns null if not on a native platform or if permission is denied.
 */
export async function requestNativePushToken() {
  if (!isNativePlatform()) return null;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    let permResult = await PushNotifications.checkPermissions();
    if (permResult.receive === "prompt") {
      permResult = await PushNotifications.requestPermissions();
    }

    if (permResult.receive !== "granted") {
      console.warn("[BII] Native push permission not granted:", permResult.receive);
      return null;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Wait for token (max 10 seconds)
    const token = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        PushNotifications.removeAllListeners();
        reject(new Error("Push token timeout"));
      }, 10000);

      PushNotifications.addListener("registration", (info) => {
        clearTimeout(timeout);
        PushNotifications.removeAllListeners();
        resolve(info.token);
      });

      PushNotifications.addListener("registrationError", (err) => {
        clearTimeout(timeout);
        PushNotifications.removeAllListeners();
        reject(err);
      });
    });

    return token || null;
  } catch (err) {
    console.error("[BII] Native push registration failed:", err?.message || err);
    return null;
  }
}
