import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '');

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // { email, fullName, role }
  const [loading, setLoading] = useState(true);   // true until session restore completes

  // ── Restore session on mount ───────────────────────────────────────────────
  // Reads token + user info from localStorage synchronously so the first
  // render already has the correct auth state (avoids a flash of demo data
  // followed by a refetch when the token is present but user was still null).
  useEffect(() => {
    const token    = localStorage.getItem('auth_token');
    const role     = localStorage.getItem('auth_role');
    const email    = localStorage.getItem('auth_email');
    const fullName = localStorage.getItem('auth_full_name');

    if (token && role && email) {
      setUser({ email, fullName: fullName ?? email, role });
    }
    // FIX: setLoading(false) AFTER setUser so consumers never see
    // (loading=false, user=null) when a valid session exists.
    setLoading(false);
  }, []);

  // ── Customer login ─────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Login failed');

    // Store token + metadata in localStorage so:
    //   • kitchenApi.ts authHeaders() can attach Bearer token to all requests
    //   • AuthContext can restore the session on next page load (above useEffect)
    //   • SkipLineContext re-fetches real data when `user` changes (its useEffect
    //     depends on `user` from useAuth())
    localStorage.setItem('auth_token',     data.token);
    localStorage.setItem('auth_role',      data.role);
    localStorage.setItem('auth_email',     data.email);
    localStorage.setItem('auth_full_name', data.fullName ?? data.email);

    const userData = {
      email:    data.email,
      fullName: data.fullName ?? data.email,
      role:     data.role,
    };
    setUser(userData);   // ← triggers SkipLineContext useEffect([user]) → real fetch
    return userData;
  };

  // ── Customer register ──────────────────────────────────────────────────────
  const register = async (fullName, email, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? 'Registration failed');
    return data;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST', credentials: 'include',
    }).catch(() => {});

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_full_name');
    setUser(null);  // ← triggers SkipLineContext useEffect([user]) → demo data
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isCustomer = user?.role === 'CUSTOMER';
  const isKitchen  = user?.role === 'KITCHEN';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout,
      isCustomer, isKitchen, isLoggedIn,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}