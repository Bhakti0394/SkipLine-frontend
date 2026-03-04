import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          console.log("[AuthContext] ✅ User:", data);
          setUser({ email: data.email, role: data.role });
        } else {
          console.warn("[AuthContext] ❌ Not authenticated:", res.status);
          setUser(null);
        }
      } catch (e) {
        console.error("[AuthContext] Fetch failed (CORS or network):", e.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const logout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("[AuthContext] Logout error:", e);
    } finally {
      setUser(null);
      window.location.href = "/auth?mode=login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);