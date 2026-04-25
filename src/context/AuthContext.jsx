import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    // Decode exp from JWT payload — no library needed
try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Guard: if exp is missing treat token as expired — never trust unverifiable tokens
      const isExpired = !payload.exp || payload.exp * 1000 < Date.now();

      if (isExpired) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_role');
        localStorage.removeItem('auth_email');
        localStorage.removeItem('auth_full_name');
        // user stays null — ProtectedRoute redirects to /auth?mode=login
      } else {
        setUser({ email, fullName: fullName ?? email, role });
      }
    } catch {
      // Malformed token — treat as expired, clear storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_role');
      localStorage.removeItem('auth_email');
      localStorage.removeItem('auth_full_name');
    }
  }

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
    // Always clear local state regardless of server response —
    // a failed server-side invalidation is better than a stuck session.
    // Fire-and-forget: we don't want a network error to block logout.
    fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST', credentials: 'include',
    }).catch((err) => console.warn('[AuthContext] logout endpoint failed:', err));

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_full_name');
    setUser(null);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
// ── Helpers ────────────────────────────────────────────────────────────────
  const isCustomer = user?.role === 'CUSTOMER';
  const isKitchen  = user?.role === 'KITCHEN';
  const isLoggedIn = !!user;

  // syncUser — the ONLY safe way to set user from outside AuthContext.
  // Atomically writes all 4 localStorage keys AND updates React state so
  // context and localStorage never diverge (unlike raw setUser which only
  // updates React state and leaves localStorage out of sync if caller forgets).
const syncUser = useCallback((userData) => {
    if (!userData.token) throw new Error('syncUser: token is required');
    if (!userData.role)  throw new Error('syncUser: role is required');
    if (!userData.email) throw new Error('syncUser: email is required');
    localStorage.setItem('auth_token',     userData.token);
    localStorage.setItem('auth_role',      userData.role);
    localStorage.setItem('auth_email',     userData.email);
    localStorage.setItem('auth_full_name', userData.fullName ?? userData.email);
    setUser({ email: userData.email, fullName: userData.fullName ?? userData.email, role: userData.role });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading,
      login, register, logout,
      isCustomer, isKitchen, isLoggedIn,
      syncUser,
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