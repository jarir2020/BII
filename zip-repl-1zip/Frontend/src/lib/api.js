import axios from "axios";

// In dev, CRACO proxies /api → localhost:8000 so BACKEND_URL should be "".
// Fall back to "" so relative /api paths work via the dev-server proxy.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;

export function imgUrl(v) {
  if (!v) return "";
  if (v.startsWith("http") || v.startsWith("data:") || v.startsWith("blob:")) return v;
  return `${BACKEND_URL}${v}`;
}

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// keep token in localStorage too as Bearer fallback
const TOKEN_KEY = "bii_token";

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatApiError(err) {
  // Log full error details for debugging
  console.error("[API Error]", {
    message: err?.message,
    status: err?.response?.status,
    data: err?.response?.data,
    url: err?.config?.url,
    baseURL: err?.config?.baseURL,
  });

  // Network error (no response from server)
  if (err?.message === "Network Error") {
    return "Network Error — could not reach the server. Check your internet connection and try again.";
  }

  const body = err?.response?.data;
  const d = body?.detail ?? body?.message ?? body?.error ?? body?.errors;
  if (d == null) return err?.message || "কিছু একটা ভুল হয়েছে";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (typeof d?.msg === "string") return d.msg;
  return JSON.stringify(d);
}
