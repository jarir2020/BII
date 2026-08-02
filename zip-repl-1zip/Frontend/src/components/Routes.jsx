import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return <div className="p-8 text-center text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return <div className="p-8 text-center text-[var(--bii-text-soft)]">লোড হচ্ছে...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "super_admin") return <Navigate to="/" replace />;
  return children;
}
