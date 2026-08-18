import { Capacitor } from "@capacitor/core";

let pluginPromise;
let initialized = false;

function getPlugin() {
  if (!pluginPromise) pluginPromise = import("@capacitor-community/admob");
  return pluginPromise;
}

async function initializeAdMob(plugin) {
  if (initialized) return;
  await plugin.AdMob.initialize();
  try {
    let consent = await plugin.AdMob.requestConsentInfo();
    if (!consent.canRequestAds && consent.isConsentFormAvailable) {
      consent = await plugin.AdMob.showConsentForm();
    }
  } catch (_) {
    // If consent services are unavailable, leave the native SDK in control.
  }
  initialized = true;
}

export async function showAdMobBanner(adId) {
  if (!Capacitor.isNativePlatform() || !adId) return false;

  const plugin = await getPlugin();
  await initializeAdMob(plugin);

  await plugin.AdMob.showBanner({
    adId,
    adSize: plugin.BannerAdSize.BANNER,
    position: plugin.BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
  });
  return true;
}

export async function hideAdMobBanner() {
  if (!Capacitor.isNativePlatform() || !pluginPromise) return;
  const plugin = await pluginPromise;
  await plugin.AdMob.hideBanner();
}

export async function showAdMobInterstitial(adId) {
  if (!Capacitor.isNativePlatform() || !adId) return false;

  const plugin = await getPlugin();
  await initializeAdMob(plugin);
  await plugin.AdMob.prepareInterstitial({ adId });
  await plugin.AdMob.showInterstitial();
  return true;
}
