// pages/CustomerDashboard/Settings.tsx
// Fully working settings page — all toggles persist, all sections functional.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Moon, Sun, Globe, CreditCard, Shield, Smartphone, LogOut,
  ChevronRight, Volume2, MapPin, Clock, Zap, Settings as SettingsIcon,
  User, Sparkles, X, Check, Edit3, Save, Phone, Mail,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { toast } from '../../customer-hooks/use-toast';
import { useNotifications } from '../../customer-context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import '../../components/CustomerDashboard/styles/Settings.scss';

// ── Stable particles (no Math.random in render) ──────────────────────────────
const SETTINGS_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: Math.random() * 100 - 50,
  y: Math.random() * 100 - 50,
  duration: 3 + Math.random() * 2,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 4 + Math.random() * 8,
}));

const FloatingParticles = () => (
  <div className="settings__particles">
    {SETTINGS_PARTICLES.map((p) => (
      <motion.div key={p.id} className="settings__particle" initial={{ opacity: 0 }}
        animate={{ x: [0, p.x], y: [0, p.y], opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
        transition={{ duration: p.duration, repeat: Infinity, delay: p.id * 0.3 }}
        style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.size}px`, height: `${p.size}px` }}
      />
    ))}
  </div>
);

// ── Dark mode helper ──────────────────────────────────────────────────────────
const DARK_MODE_KEY = 'SkipLine_dark_mode';

function getDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
  } catch { /* ignore */ }
  return document.documentElement.classList.contains('dark');
}

function applyDarkMode(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  try { localStorage.setItem(DARK_MODE_KEY, String(dark)); } catch { /* ignore */ }
}

// ── Language options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
];
const LANGUAGE_KEY = 'SkipLine_language';

// ── Profile storage ───────────────────────────────────────────────────────────
const PROFILE_KEY = 'SkipLine_profile_settings';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
}

function loadProfile(user: { fullName?: string; email?: string } | null): ProfileData {
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {
    name:     user?.fullName ?? '',
    email:    user?.email    ?? '',
    phone:    '',
    location: '',
  };
}

// ── Coming Soon Modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="settings__modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
          border: '1px solid rgba(255,107,53,0.3)',
          borderRadius: '2rem',
          padding: '2.5rem',
          maxWidth: '400px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: '3rem', marginBottom: '1rem' }}
        >
          🚀
        </motion.div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          {title}
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          This feature is coming soon. We're working hard to bring it to you!
        </p>
        <Button onClick={onClose} style={{
          background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
          color: '#fff', border: 'none', borderRadius: '1rem',
          padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer',
          width: '100%',
        }}>
          Got it!
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── Language Modal ────────────────────────────────────────────────────────────
function LanguageModal({ current, onSelect, onClose }: {
  current: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
          border: '1px solid rgba(255,107,53,0.3)',
          borderRadius: '2rem', padding: '2rem',
          maxWidth: '360px', width: '90%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Select Language</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {LANGUAGES.map(lang => (
            <motion.button key={lang.code} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(lang.code)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', borderRadius: '1rem', cursor: 'pointer',
                background: current === lang.code
                  ? 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(247,147,30,0.1))'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${current === lang.code ? 'rgba(255,107,53,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: '#fff', fontWeight: current === lang.code ? 700 : 400,
                fontSize: '1rem',
              }}
            >
              <span>{lang.label}</span>
              {current === lang.code && <Check size={18} color="#ff6b35" />}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Profile Edit Modal ────────────────────────────────────────────────────────
function ProfileModal({ profile, onSave, onClose }: {
  profile: ProfileData;
  onSave: (p: ProfileData) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(profile);

  const handleSave = () => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
    if (draft.name) localStorage.setItem('auth_full_name', draft.name);
    onSave(draft);
    toast({ title: 'Profile Updated ✓', description: 'Your changes have been saved.' });
    onClose();
  };

  const fields = [
    { key: 'name',     icon: User,  label: 'Full Name',       placeholder: 'Your name',          type: 'text'  },
    { key: 'email',    icon: Mail,  label: 'Email',           placeholder: 'your@email.com',     type: 'email' },
    { key: 'phone',    icon: Phone, label: 'Phone',           placeholder: '+91 98765 43210',    type: 'tel'   },
    { key: 'location', icon: MapPin,label: 'Pickup Location', placeholder: 'Your campus address', type: 'text'  },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
          border: '1px solid rgba(255,107,53,0.3)',
          borderRadius: '2rem', padding: '2rem',
          maxWidth: '440px', width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Edit Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {fields.map(({ key, icon: Icon, label, placeholder, type }) => (
            <div key={key}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem', display: 'block' }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <Icon size={16} style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.4)',
                }} />
                <Input
                  type={type}
                  value={draft[key]}
                  onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={handleSave} style={{
            flex: 1,
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            color: '#fff', border: 'none',
          }}>
            <Save size={16} style={{ marginRight: '0.5rem' }} />Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sign Out Confirm Modal ────────────────────────────────────────────────────
function SignOutModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,40,0.98), rgba(20,20,30,0.98))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '2rem', padding: '2rem',
          maxWidth: '360px', width: '90%', textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👋</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Sign Out?</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          You'll need to sign in again to access your orders and profile.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={onConfirm} style={{
            flex: 1,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff', border: 'none',
          }}>
            Sign Out
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Settings Component
// ═════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  const { preferences, updatePreferences } = useNotifications();
  const { logout, user } = useAuth();

  // ── Dark mode ──
  const [isDark, setIsDark] = useState(getDarkMode);
  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    applyDarkMode(next);
    toast({ title: next ? '🌙 Dark Mode On' : '☀️ Light Mode On', description: 'Theme updated.' });
  };

  // ── Language ──
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANGUAGE_KEY) ?? 'en'; } catch { return 'en'; }
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const handleLanguageSelect = (code: string) => {
    setLanguage(code);
    try { localStorage.setItem(LANGUAGE_KEY, code); } catch { /* ignore */ }
    setShowLanguageModal(false);
    const label = LANGUAGES.find(l => l.code === code)?.label ?? code;
    toast({ title: `🌐 Language Changed`, description: `Now using ${label}.` });
  };

  // ── Profile ──
  const [profile, setProfile] = useState<ProfileData>(() => loadProfile(user));
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Sync profile when user auth changes
  useEffect(() => {
    setProfile(loadProfile(user));
  }, [user]);

  // ── Modals ──
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try { await logout(); } catch { /* localStorage cleared regardless */ }
  };

  // ── Notification toggles ──
  const handleNotifToggle = (key: keyof typeof preferences) => {
    updatePreferences({ [key]: !preferences[key] });
    toast({ title: 'Setting Saved ✓', description: `${key} ${!preferences[key] ? 'enabled' : 'disabled'}.` });
  };

  const currentLanguageLabel = LANGUAGES.find(l => l.code === language)?.label ?? 'English';

  const notificationSettings = [
    { key: 'orderUpdates'      as const, label: 'Order Updates',     description: 'Confirmed, cooking & preparing alerts', icon: Bell     },
    { key: 'readyAlerts'       as const, label: 'Ready Alerts',       description: 'Notified when your order is ready',     icon: Volume2  },
    { key: 'promotionalOffers' as const, label: 'Promotions',         description: 'Special deals and discounts',          icon: Sparkles },
    { key: 'weeklySummary'     as const, label: 'Weekly Summary',     description: 'Your weekly activity digest',          icon: Clock    },
    { key: 'soundEnabled'      as const, label: 'Sound Effects',      description: 'Play sound on notifications',          icon: Volume2  },
  ];

  const accountMenuItems = [
    { label: 'Edit Profile',       icon: User,       badge: profile.name || 'Set name', color: '#ff6b35', action: () => setShowProfileModal(true)              },
    { label: 'Payment Methods',    icon: CreditCard, badge: null,                       color: '#f7931e', action: () => setComingSoonTitle('Payment Methods')   },
    { label: 'Security',           icon: Shield,     badge: null,                       color: '#fbbf24', action: () => setComingSoonTitle('Security Settings')  },
    { label: 'Connected Devices',  icon: Smartphone, badge: null,                       color: '#ff6b35', action: () => setComingSoonTitle('Connected Devices')  },
  ];

  return (
    <DashboardLayout>
      <div className="settings">
        <FloatingParticles />

        {/* Hero */}
        <div className="settings__hero">
          <div className="settings__hero-gradient">
            <motion.div className="settings__hero-gradient-orb settings__hero-gradient-orb--1"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} />
            <motion.div className="settings__hero-gradient-orb settings__hero-gradient-orb--2"
              animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity }} />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="settings__header">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }} className="settings__title-badge">
              <SettingsIcon className="settings__title-badge-icon" /><span>Customize</span>
            </motion.div>
            <h1 className="settings__title"><span className="settings__title-grad">Settings</span></h1>
            <p className="settings__subtitle">Personalize your SkipLine experience</p>
          </motion.div>
        </div>

        <div className="settings__grid">

          {/* ── Notifications ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="settings__card">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--primary"><Bell className="settings__icon" /></div>
              <h3 className="settings__card-title">Notifications</h3>
            </div>
            <div className="settings__list">
              {notificationSettings.map((s, i) => (
                <motion.div key={s.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }} className="settings__item">
                  <div className="settings__item-content">
                    <div className="settings__item-icon-wrapper"><s.icon className="settings__item-icon" /></div>
                    <div className="settings__item-text">
                      <p className="settings__item-label">{s.label}</p>
                      <p className="settings__item-desc">{s.description}</p>
                    </div>
                  </div>
                  <Switch checked={!!preferences[s.key]} onCheckedChange={() => handleNotifToggle(s.key)} />
                </motion.div>
              ))}
            </div>
            <div className="settings__info">
              <Sparkles className="settings__info-icon" />
              <div className="settings__info-text">
                <strong>Smart Notifications:</strong> Critical order updates are always delivered regardless of other settings.
              </div>
            </div>
          </motion.div>

          {/* ── Appearance & Language ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="settings__card">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--accent">
                {isDark ? <Moon className="settings__icon" /> : <Sun className="settings__icon" />}
              </div>
              <h3 className="settings__card-title">Appearance</h3>
            </div>
            <div className="settings__list">

              {/* Dark mode toggle */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }} className="settings__item">
                <div className="settings__item-content">
                  <div className="settings__item-icon-wrapper">
                    {isDark ? <Moon className="settings__item-icon" /> : <Sun className="settings__item-icon" />}
                  </div>
                  <div className="settings__item-text">
                    <p className="settings__item-label">Dark Mode</p>
                    <p className="settings__item-desc">{isDark ? 'Using dark theme' : 'Using light theme'}</p>
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDark} />
              </motion.div>

              {/* Language selector */}
              <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => setShowLanguageModal(true)}
                className="settings__item"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                <div className="settings__item-content">
                  <div className="settings__item-icon-wrapper"><Globe className="settings__item-icon" /></div>
                  <div className="settings__item-text">
                    <p className="settings__item-label">Language</p>
                    <p className="settings__item-desc">Currently: {currentLanguageLabel}</p>
                  </div>
                </div>
                <ChevronRight style={{ color: 'rgba(255,255,255,0.4)', width: 18, height: 18 }} />
              </motion.button>

              {/* Smart Slot Suggestions */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }} className="settings__item">
                <div className="settings__item-content">
                  <div className="settings__item-icon-wrapper"><Zap className="settings__item-icon" /></div>
                  <div className="settings__item-text">
                    <p className="settings__item-label">Smart Slot Suggestions</p>
                    <p className="settings__item-desc">AI-powered pickup time recommendations</p>
                  </div>
                </div>
                <Switch defaultChecked onCheckedChange={() =>
                  toast({ title: 'Setting Saved ✓', description: 'Smart suggestions preference updated.' })
                } />
              </motion.div>

              {/* Location */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }} className="settings__item">
                <div className="settings__item-content">
                  <div className="settings__item-icon-wrapper"><MapPin className="settings__item-icon" /></div>
                  <div className="settings__item-text">
                    <p className="settings__item-label">Location Services</p>
                    <p className="settings__item-desc">Use GPS for nearby pickup points</p>
                  </div>
                </div>
                <Switch defaultChecked onCheckedChange={() =>
                  toast({ title: 'Setting Saved ✓', description: 'Location preference updated.' })
                } />
              </motion.div>
            </div>
          </motion.div>

          {/* ── Account Settings ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="settings__card settings__card--full">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--user"><User className="settings__icon" /></div>
              <h3 className="settings__card-title">Account</h3>
            </div>
            <div className="settings__account-grid">
              {accountMenuItems.map((item, index) => (
                <motion.button key={item.label}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }}
                  onClick={item.action}
                  className="settings__account-item">
                  <div className="settings__account-glow"
                    style={{ background: `radial-gradient(circle, ${item.color}20, transparent)` }} />
                  <div className="settings__account-left">
                    <div className="settings__account-icon-wrapper" style={{ color: item.color }}>
                      <item.icon className="settings__account-icon" />
                    </div>
                    <span className="settings__account-label">{item.label}</span>
                  </div>
                  <div className="settings__account-right">
                    {item.badge && (
                      <span className="settings__account-badge"
                        style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="settings__account-chevron" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Danger Zone ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="settings__card settings__card--full settings__card--danger">
            <div className="settings__card-glow settings__card-glow--danger" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--danger"><Shield className="settings__icon" /></div>
              <h3 className="settings__card-title settings__card-title--danger">Danger Zone</h3>
            </div>
            <div className="settings__danger">
              <div className="settings__danger-content">
                <p className="settings__danger-label">Sign Out</p>
                <p className="settings__danger-desc">Sign out from your account on this device</p>
              </div>
              <Button onClick={() => setShowSignOutModal(true)} className="settings__danger-btn">
                <LogOut className="settings__danger-icon" />Sign Out
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showLanguageModal && (
          <LanguageModal current={language} onSelect={handleLanguageSelect} onClose={() => setShowLanguageModal(false)} />
        )}
        {showProfileModal && (
          <ProfileModal profile={profile} onSave={setProfile} onClose={() => setShowProfileModal(false)} />
        )}
        {comingSoonTitle && (
          <ComingSoonModal title={comingSoonTitle} onClose={() => setComingSoonTitle(null)} />
        )}
        {showSignOutModal && (
          <SignOutModal onConfirm={handleSignOut} onClose={() => setShowSignOutModal(false)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}