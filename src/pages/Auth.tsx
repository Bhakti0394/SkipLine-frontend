import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, ChefHat, Shield,
  Building2, UtensilsCrossed, Leaf, Clock, TrendingUp, Send, KeyRound,
} from "lucide-react";
import SkipLineLogo from "@/components/landing/SkipLineLogo";
import { useAuth } from "@/context/AuthContext";
import "./Auth.scss";

// FIX: use VITE_API_BASE_URL everywhere — removes hardcoded localhost:8080
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type Mode      = "login" | "signup";
type Role      = "customer" | "admin";
type AdminStep = "email" | "otp";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();

  // ── FIX: use AuthContext.login() so setUser() fires ───────────────────────
  // Previously Auth.tsx called fetch() directly, stored token in localStorage,
  // and used window.location.href to navigate. This bypassed AuthContext
  // entirely — setUser() was never called, so SkipLineContext's
  // useEffect([user, authLoading]) never re-ran, and real orders/metrics/streak
  // were never fetched (causing 401/403 on every page load).
  //
  // Now: login() → setUser() → SkipLineContext re-runs → real data fetched ✓
  const { login } = useAuth();

  const [mode,          setMode]          = useState<Mode>("login");
  const [role,          setRole]          = useState<Role>("customer");
  const [adminStep,     setAdminStep]     = useState<AdminStep>("email");
  const [showPassword,  setShowPassword]  = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [errorMessage,  setErrorMessage]  = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    otp: "", organisation: "", kitchenName: "",
  });

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "login" || m === "signup") setMode(m as Mode);
  }, [searchParams]);

  useEffect(() => {
    setAdminStep("email");
    setFormData(prev => ({ ...prev, otp: "" }));
    setErrorMessage(null);
  }, [mode, role]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage(null);
  };

  // ── Admin Login Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/auth/start-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setAdminStep("otp");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Admin Login Step 2: Verify OTP ────────────────────────────────────────
  // Admin login keeps direct fetch + window.location.href because the kitchen
  // dashboard doesn't use SkipLineContext — no need to go through AuthContext.login().
  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res  = await fetch(`${API_BASE}/api/admin/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, otp: formData.otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid or expired OTP");

      if (data.token)    localStorage.setItem("auth_token",     data.token);
      if (data.role)     localStorage.setItem("auth_role",      data.role);
      if (data.email)    localStorage.setItem("auth_email",     data.email);
      if (data.fullName) localStorage.setItem("auth_full_name", data.fullName);

      window.location.href = "/kitchen-dashboard";
    } catch (error: any) {
      setErrorMessage(error.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Customer Login + Signup / Admin Signup ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // ── CUSTOMER LOGIN ─────────────────────────────────────────────────────
      // FIX: use AuthContext.login() instead of raw fetch.
      // AuthContext.login() calls the same /api/auth/login endpoint, stores
      // the token in localStorage, AND calls setUser() — which triggers
      // SkipLineContext's useEffect([user, authLoading]) to re-run and fetch
      // real orders/metrics/streak with the valid Bearer token.
      //
      // Old code used raw fetch + window.location.href which stored the token
      // but never called setUser(), so SkipLineContext always saw user=null
      // and never made authenticated API calls → 401/403 on every page load.
      if (role === "customer" && mode === "login") {
        const userData = await login(formData.email, formData.password);

        // Use navigate() instead of window.location.href so React state
        // (including the updated user from setUser()) is preserved across
        // the route transition. window.location.href causes a full page
        // reload which wipes React state before SkipLineContext can re-fetch.
        if (userData.role === "CUSTOMER") {
          navigate("/customer-dashboard/overview");
        } else {
          navigate("/kitchen-dashboard");
        }
        return;
      }

      // ── CUSTOMER SIGNUP ────────────────────────────────────────────────────
      if (role === "customer" && mode === "signup") {
        if (formData.password !== formData.confirmPassword)
          throw new Error("Passwords do not match");
        if (formData.password.length < 6)
          throw new Error("Password must be at least 6 characters");

        const res  = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            email:    formData.email,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Registration failed. Please try again.");

        alert("✅ Account created successfully! Please log in.");
        navigate("/auth?mode=login");
        return;
      }

      // ── ADMIN SIGNUP ───────────────────────────────────────────────────────
      if (role === "admin" && mode === "signup") {
        if (!formData.fullName.trim())     throw new Error("Full name is required");
        if (!formData.email.trim())        throw new Error("Email is required");
        if (!formData.organisation.trim()) throw new Error("Organisation is required");
        if (!formData.kitchenName.trim())  throw new Error("Kitchen name is required");

        const res = await fetch(`${API_BASE}/api/admin/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName:     formData.fullName.trim(),
            email:        formData.email.trim(),
            organisation: formData.organisation.trim(),
            kitchenName:  formData.kitchenName.trim(),
          }),
        });

        let data: any = {};
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        }
        if (!res.ok) throw new Error(data?.message || `Signup failed with status ${res.status}`);

        alert("✅ Account created! Please login with OTP to access your dashboard.");
        setFormData({
          fullName: "", email: formData.email, password: "",
          confirmPassword: "", otp: "", organisation: "", kitchenName: "",
        });
        setMode("login");
        setRole("admin");
        setAdminStep("email");
      }
    } catch (error: any) {
      console.error("[Auth] Submit error:", error);
      setErrorMessage(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowFullName       = (mode === "signup" && role === "customer") || (mode === "signup" && role === "admin");
  const shouldShowPassword       = mode === "login"  && role === "customer";
  const shouldShowPasswordFields = mode === "signup" && role === "customer";
  const shouldShowOTP            = mode === "login"  && role === "admin" && adminStep === "otp";
  const shouldShowAdminFields    = mode === "signup" && role === "admin";

  const features = [
    { icon: Clock,      text: "Zero queue time"  },
    { icon: Leaf,       text: "Reduce food waste" },
    { icon: TrendingUp, text: "Smart scheduling"  },
  ];

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <motion.div
        initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }} className="auth-left-panel"
      >
        <div className="background-gradient" />
        <div className="grid-pattern" />
        <div className="floating-orb orb-primary" />
        <div className="floating-orb orb-accent" />
        <div className="left-panel-content">
          <div className="logo-section" onClick={() => navigate("/")}>
            <SkipLineLogo size="md" />
            <span className="logo-text">SkipLine</span>
          </div>
          <div className="feature-showcase">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }} className="showcase-content"
            >
              <div className="main-message">
                <div className="sustainability-badge" style={{ marginTop: "20px" }}>
                  <Leaf className="badge-icon" /><span className="badge-text">Sustainability First</span>
                </div>
                <h2 className="main-heading">
                  Zero Food Waste.<br />
                  <span className="gradient-text">Maximum Efficiency.</span>
                </h2>
                <p className="main-description">
                  Smart pre-ordering enables accurate demand planning and efficient kitchen operations for your campus.
                </p>
              </div>
              <div className="feature-pills">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                    className="feature-pill"
                  >
                    <feature.icon className="pill-icon" /><span className="pill-text">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="stats-grid">
                <div className="stat-item"><p className="stat-value stat-primary">30min</p><p className="stat-label">→ 0 queue time</p></div>
                <div className="stat-item"><p className="stat-value stat-accent">40%</p><p className="stat-label">less food waste</p></div>
                <div className="stat-item"><p className="stat-value">3x</p><p className="stat-label">faster service</p></div>
              </div>
            </motion.div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-text">"SkipLine transformed our canteen operations. Students love the zero-wait experience."</p>
            <p className="testimonial-author">— Campus Dining Director</p>
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div
        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }} className="auth-right-panel"
      >
        <div className="auth-form-wrapper">
          <div className="mobile-logo" onClick={() => navigate("/")}>
            <SkipLineLogo size="lg" /><span className="logo-text">SkipLine</span>
          </div>
          <div className="auth-header">
            <AnimatePresence mode="wait">
              <motion.h1
                key={mode}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                className="auth-title"
              >
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </motion.h1>
            </AnimatePresence>
            <p className="auth-subtitle">
              {mode === "login"
                ? "Sign in to continue to SkipLine"
                : "Start optimizing meal operations with SkipLine"}
            </p>
          </div>

          <div className="role-switch">
            <button onClick={() => setRole("customer")} className={`role-button ${role === "customer" ? "active" : ""}`}>
              <User className="role-icon" />Customer
            </button>
            <button onClick={() => setRole("admin")} className={`role-button ${role === "admin" ? "active" : ""}`}>
              <ChefHat className="role-icon" />Kitchen Admin
            </button>
          </div>

          <form
            onSubmit={
              mode === "login" && role === "admin" && adminStep === "email" ? handleSendOTP :
              mode === "login" && role === "admin" && adminStep === "otp"   ? handleVerifyAdmin :
              handleSubmit
            }
            className="auth-form"
          >
            {shouldShowFullName && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="form-field"
              >
                <label className="field-label">Full Name</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input type="text" name="fullName" value={formData.fullName}
                    onChange={handleInputChange} placeholder="John Doe"
                    className="form-input" required />
                </div>
              </motion.div>
            )}

            <div className="form-field">
              <label className="field-label">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input type="email" name="email" value={formData.email}
                  onChange={handleInputChange} placeholder="you@example.com"
                  className="form-input" disabled={shouldShowOTP} required />
              </div>
            </div>

            {shouldShowPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="form-field"
              >
                <label className="field-label">Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input type={showPassword ? "text" : "password"} name="password"
                    value={formData.password} onChange={handleInputChange}
                    placeholder="••••••••" className="form-input has-action" required />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="input-action">
                    {showPassword ? <EyeOff className="action-icon" /> : <Eye className="action-icon" />}
                  </button>
                </div>
              </motion.div>
            )}

            {shouldShowOTP && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="form-field otp-field"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "2rem", width: "100%" }}>
                  <label className="field-label" style={{ margin: 0 }}>Enter OTP</label>
                  <button type="button" onClick={() => setAdminStep("email")}
                    style={{ fontSize: "0.75rem", fontWeight: 500, color: "hsl(24, 100%, 55%)", background: "transparent", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap", flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                    Change email
                  </button>
                </div>
                <div className="input-wrapper">
                  <KeyRound className="input-icon" />
                  <input type="text" name="otp" value={formData.otp}
                    onChange={handleInputChange} placeholder="000000" maxLength={6}
                    style={{ fontSize: "1.5rem", letterSpacing: "0.75rem", textAlign: "center", fontWeight: 600, fontFamily: "'Courier New', monospace", paddingLeft: "2.5rem" }}
                    className="form-input" autoFocus required />
                </div>
                <p style={{ fontSize: "0.8125rem", color: "hsl(var(--muted-foreground))", marginTop: "0.75rem", marginBottom: 0, lineHeight: 1.4 }}>
                  A 6-digit code was sent to {formData.email}
                </p>
              </motion.div>
            )}

            {shouldShowPasswordFields && (
              <>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="form-field">
                  <label className="field-label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input type={showPassword ? "text" : "password"} name="password"
                      value={formData.password} onChange={handleInputChange}
                      placeholder="••••••••" className="form-input has-action" required />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="input-action">
                      {showPassword ? <EyeOff className="action-icon" /> : <Eye className="action-icon" />}
                    </button>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="form-field">
                  <label className="field-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input type={showConfirm ? "text" : "password"} name="confirmPassword"
                      value={formData.confirmPassword} onChange={handleInputChange}
                      placeholder="••••••••" className="form-input has-action" required />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="input-action">
                      {showConfirm ? <EyeOff className="action-icon" /> : <Eye className="action-icon" />}
                    </button>
                  </div>
                </motion.div>
              </>
            )}

            {shouldShowAdminFields && (
              <>
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="form-field"
                >
                  <label htmlFor="organisation" className="field-label">Organisation</label>
                  <div className="input-wrapper">
                    <Building2 className="input-icon" />
                    <input id="organisation" type="text" name="organisation"
                      value={formData.organisation} onChange={handleInputChange}
                      placeholder="University / College name" className="form-input" required />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="form-field"
                >
                  <label htmlFor="kitchenName" className="field-label">Kitchen Name</label>
                  <div className="input-wrapper">
                    <UtensilsCrossed className="input-icon" />
                    <input id="kitchenName" type="text" name="kitchenName"
                      value={formData.kitchenName} onChange={handleInputChange}
                      placeholder="Main Canteen" className="form-input" required />
                  </div>
                </motion.div>
              </>
            )}

            {errorMessage && <div className="auth-error">{errorMessage}</div>}

            <button type="submit" disabled={isLoading} className="submit-button">
              {isLoading ? <div className="loading-spinner" /> : (
                <>
                  {mode === "login" && role === "admin" && adminStep === "email" ? <><Send className="button-arrow" />Send Code</> :
                   mode === "login" && role === "admin" && adminStep === "otp"   ? <>Verify & Login <ArrowRight className="button-arrow" /></> :
                   <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight className="button-arrow" /></>}
                </>
              )}
            </button>

            <div className="security-note">
              <Shield className="security-icon" />Secure & private authentication
            </div>
          </form>

          <div className="mode-switch">
            {mode === "login"
              ? <>Don't have an account? <button onClick={() => setMode("signup")} className="switch-link">Sign up</button></>
              : <>Already have an account? <button onClick={() => setMode("login")} className="switch-link">Log in</button></>}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;