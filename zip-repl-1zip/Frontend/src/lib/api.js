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

function isFormDataBody(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function appendParams(url, params) {
  if (!params || typeof params !== "object") return url;

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

function request(url, options = {}) {
  const { params, ...fetchOptions } = options || {};
  const baseUrl = url.startsWith("http") ? url : `${API}${url}`;
  const fullUrl = appendParams(baseUrl, params);
  const multipart = isFormDataBody(fetchOptions.body);
  const headers = {
    ...(multipart ? {} : { "Content-Type": "application/json" }),
    ...authHeaders(),
    ...(fetchOptions.headers || {}),
  };

  // Let the browser add the multipart boundary. A manually supplied
  // Content-Type without that boundary makes PHP see an empty $_FILES array.
  if (multipart) {
    Object.keys(headers).forEach((key) => {
      if (key.toLowerCase() === "content-type") delete headers[key];
    });
  }

  return fetch(fullUrl, {
    ...fetchOptions,
    credentials: "include",
    headers,
  }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      const err = new Error(text || res.statusText);
      err.status = res.status;
      err.response = { status: res.status, data: text };
      throw err;
    }
    const parsed = text ? JSON.parse(text) : {};
    // Return an Axios-like shape so existing call sites that read `r.data`
    // or destructure `{ data }` keep working across the app.
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? { data: parsed, ...parsed }
      : { data: parsed };
  });
}

export const api = {
  get: (url, options) => request(url, { ...options, method: "GET" }),
  post: (url, body, options) => request(url, {
    ...options,
    method: "POST",
    body: isFormDataBody(body) ? body : JSON.stringify(body),
  }),
  put: (url, body, options) => request(url, {
    ...options,
    method: "PUT",
    body: isFormDataBody(body) ? body : JSON.stringify(body),
  }),
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
