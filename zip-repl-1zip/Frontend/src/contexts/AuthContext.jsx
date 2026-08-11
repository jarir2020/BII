import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setToken, formatApiError } from "../lib/api";
import { requestFCMToken } from "../lib/firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/**
 * Silently refresh FCM token only when the browser has ALREADY granted
 * notification permission. Never triggers the permission popup — that is
 * handled by <NotificationPrompt />.
 */
async function tryRegisterFCMToken() {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return; // NotificationPrompt handles the rest
    const token = await requestFCMToken();
    if (token) {
      await api.post("/notifications/register-device", { token, platform: "web" });
    }
  } catch {
    // Non-critical — never block login
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = checking, false = guest, {} = user
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      const authenticatedUser = data?.user || data;
      if (!authenticatedUser || typeof authenticatedUser !== "object") {
        throw new Error("Invalid authentication response");
      }
      setUser(authenticatedUser);
    } catch (err) {
      // A rejected persisted token must not leave protected pages in a blank state.
      if ([401, 403].includes(err?.response?.status)) setToken(null);
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    // Register FCM token after login (best-effort, non-blocking)
    tryRegisterFCMToken();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setToken(data.token);
    setUser(data.user);
    tryRegisterFCMToken();
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setToken(null);
    setUser(false);
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put("/users/me", payload);
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refresh, formatApiError }}>
      {children}
    </AuthContext.Provider>
  );
}
