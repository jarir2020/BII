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
      return null;
    }

    // Install listeners before registering. The native plugin can emit the
    // token immediately, so registering first can miss the event.
    const token = await new Promise((resolve, reject) => {
      let registrationHandle;
      let errorHandle;
      let settled = false;
      let timeout;

      const cleanup = () => {
        clearTimeout(timeout);
        registrationHandle?.remove();
        errorHandle?.remove();
      };

      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve(value);
      };

      timeout = setTimeout(() => finish(new Error("Push token timeout")), 10000);

      (async () => {
        registrationHandle = await PushNotifications.addListener("registration", (info) => {
          finish(null, info.token);
        });
        if (settled) {
          registrationHandle.remove();
          return;
        }

        errorHandle = await PushNotifications.addListener("registrationError", (err) => {
          finish(err);
        });
        if (settled) {
          errorHandle.remove();
          return;
        }

        await PushNotifications.register();
      })().catch((error) => finish(error));
    });

    return token || null;
  } catch (err) {
    return null;
  }
}
