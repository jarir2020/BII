// In dev, CRACO proxies /api → localhost:8000 so BACKEND_URL should be "".
// Fall back to "" so relative /api paths work via the dev-server proxy.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://www.bengaliislamicinstitute.com";
export const API = `${BACKEND_URL}/api`;

export function imgUrl(v) {
  if (!v) return "";
  if (v.startsWith("http") || v.startsWith("data:") || v.startsWith("blob:")) return v;
  return `${BACKEND_URL}${v}`;
}

// keep token in localStorage too as Bearer fallback
const TOKEN_KEY = "bii_token";

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function request(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : `${API}${url}`;
  return fetch(fullUrl, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(text || res.statusText);
      err.status = res.status;
      err.response = { status: res.status, data: text };
      throw err;
    }
    return text ? JSON.parse(text) : {};
  });
}

export const api = {
  get: (url, options) => request(url, { ...options, method: "GET" }),
  post: (url, body, options) => request(url, { ...options, method: "POST", body: JSON.stringify(body) }),
  delete: (url, options) => request(url, { ...options, method: "DELETE" }),
};

export function formatApiError(err) {
  // Network error (no response from server)
  if (err?.message === "Failed to fetch" || err?.status === 0) {
    return "Network Error — could not reach the server. Check your internet connection and try again.";
  }

  let body = err?.response?.data;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { /* ignore */ }
  }
  const d = body?.detail ?? body?.message ?? body?.error ?? body?.errors;
  if (d == null) return err?.message || "কিছু একটা ভুল হয়েছ̈ে";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (typeof d?.msg === "string") return d.msg;
  return JSON.stringify(d);
}
