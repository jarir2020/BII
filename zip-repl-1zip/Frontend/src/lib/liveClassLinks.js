// Live-class destinations must never fall back to a relative route.
export function getValidLiveClassUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  let raw = value.trim();
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[^\s/]+\.[^\s/]+/.test(raw)) {
      raw = `https://${raw}`;
    } else {
      return null;
    }
  }

  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
