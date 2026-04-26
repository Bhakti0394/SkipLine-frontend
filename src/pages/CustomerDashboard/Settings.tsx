// pages/CustomerDashboard/Settings.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Shield, LogOut,
  Volume2, Clock, Zap,
  Settings as SettingsIcon,
  Sparkles, CheckCircle2, XCircle,
  BellOff, BellRing, VolumeX,
  CalendarX2, CalendarCheck2,
  ZapOff, Timer, TimerOff,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { toast } from '../../customer-hooks/use-toast';
import { useNotifications } from '../../customer-context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

import '../../components/CustomerDashboard/styles/Settings.scss';

// ── Stable particles ──────────────────────────────────────────────────────────
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
// ── Confetti burst on enable ───────────────────────────────────────────────────
const CONFETTI_COLORS = ['#ff6b35', '#f7931e', '#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
const ConfettiBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="settings__confetti-wrap" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={i}
          className="settings__confetti-dot"
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0.5],
            x: Math.cos((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
            y: Math.sin((i / 12) * Math.PI * 2) * (40 + Math.random() * 30),
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
        />
      ))}
    </div>
  );
};

// ── Feedback config ───────────────────────────────────────────────────────────
const FEEDBACK = {
  orderUpdates: {
    on: {
      icon: BellRing,
      headline: 'Status tracking live',
      body: 'You\'ll see confirmed → cooking → ready in real-time for every order.',
      color: 'green',
    },
    off: {
      icon: BellOff,
      headline: 'Status updates muted',
      body: 'Only critical alerts will reach you. Check the app to track orders manually.',
      color: 'muted',
    },
  },
  readyAlerts: {
    on: {
      icon: CheckCircle2,
      headline: 'Pickup alerts on',
      body: 'You\'ll be notified the moment your order is ready — don\'t miss your slot.',
      color: 'orange',
    },
    off: {
      icon: XCircle,
      headline: 'Pickup alerts off',
      body: 'No notifications when your order is ready. Keep an eye on the app yourself.',
      color: 'muted',
    },
  },
weeklySummary: {
    on: {
      icon: CalendarCheck2,
      headline: 'Weekly digest enabled',
      body: 'A summary of your orders and activity is emailed to your registered email every Monday morning.',
      color: 'blue',
    },
    off: {
      icon: CalendarX2,
      headline: 'Weekly digest off',
      body: 'No summary emails. Your order history is still available in your profile.',
      color: 'muted',
    },
  },  soundEnabled: {
    on: {
      icon: Volume2,
      headline: 'Sounds on',
      body: 'A satisfying chime plays every time you get a new notification.',
      color: 'purple',
    },
    off: {
      icon: VolumeX,
      headline: 'Silent mode',
      body: 'All notifications are silent. Badges and banners still appear.',
      color: 'muted',
    },
  },
};

const SMART_SLOT_FEEDBACK = {
  on: {
    icon: Timer,
    headline: 'Slot picker active',
    body: 'Pick a preferred time like 12:30 PM or 1:00 PM when placing your order.',
    color: 'amber',
  },
  off: {
    icon: TimerOff,
    headline: 'Auto-scheduled',
    body: 'System assigns the earliest available slot — chefs still get a target time.',
    color: 'muted',
  },
};

// ── Animated feedback block ───────────────────────────────────────────────────
function FeedbackBlock({
  feedback,
  justToggled,
}: {
  feedback: { icon: React.ElementType; headline: string; body: string; color: string };
  justToggled: boolean;
}) {
  const Icon = feedback.icon;
  return (
    <motion.div
      key={feedback.headline}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={`settings__feedback settings__feedback--${feedback.color}`}
    >
      <div className="settings__feedback-icon-wrap">
        <motion.div
          initial={justToggled ? { scale: 0, rotate: -30 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.05 }}
        >
          <Icon className="settings__feedback-icon" />
        </motion.div>
      </div>
      <div className="settings__feedback-text">
        <motion.p
          className="settings__feedback-headline"
          initial={justToggled ? { opacity: 0, x: -6 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
        >
          {feedback.headline}
        </motion.p>
        <motion.p
          className="settings__feedback-body"
          initial={justToggled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14 }}
        >
          {feedback.body}
        </motion.p>
      </div>
      {justToggled && feedback.color !== 'muted' && <ConfettiBurst active />}
    </motion.div>
  );
}

// ── Smart Slot (controlled + persisted) ──────────────────────────────────────
const SMART_SLOT_KEY = 'SkipLine_smart_slot';
function loadSmartSlot(): boolean {
  try {
    const saved = localStorage.getItem(SMART_SLOT_KEY);
    if (saved !== null) return saved === 'true';
  } catch { /* ignore */ }
  return true;
}
function saveSmartSlot(val: boolean) {
  try { localStorage.setItem(SMART_SLOT_KEY, String(val)); } catch { /* ignore */ }
}

// ── Sign Out Modal ────────────────────────────────────────────────────────────
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
          }}>Sign Out</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Settings Component
// ══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  const { preferences, updatePreferences } = useNotifications();
  const { logout, user } = useAuth();
  const WEEKLY_ON_BODY = `A summary of your orders and activity is emailed to ${user?.email ?? localStorage.getItem('auth_email') ?? 'your registered email'} every Monday morning.`;

  const [smartSlot, setSmartSlot] = useState<boolean>(loadSmartSlot);
  const [smartSlotJustToggled, setSmartSlotJustToggled] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Track which notif key was just toggled (for burst animation)
  const [justToggledKey, setJustToggledKey] = useState<string | null>(null);

  const toggleSmartSlot = () => {
    const next = !smartSlot;
    setSmartSlot(next);
    saveSmartSlot(next);
    setSmartSlotJustToggled(true);
    setTimeout(() => setSmartSlotJustToggled(false), 800);
    toast({ title: 'Setting Saved ✓', description: `Smart Slot Suggestions ${next ? 'enabled' : 'disabled'}.` });
  };

const handleNotifToggle = (key: keyof typeof preferences) => {
    const next = !preferences[key];
    updatePreferences({ [key]: next });
    setJustToggledKey(key);
    setTimeout(() => setJustToggledKey(null), 800);

    const label = notificationSettings.find(s => s.key === key)?.label ?? key;
    toast({ title: 'Setting Saved ✓', description: `${label} ${next ? 'enabled' : 'disabled'}.` });

    // Sync weekly digest preference to backend so the scheduler respects it
    if (key === 'weeklySummary') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/auth/weekly-digest`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ enabled: next }),
        }).catch(err => console.warn('[Settings] weekly digest sync failed:', err));
      }
    }
  };

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try { await logout(); } catch { /* AuthContext clears localStorage */ }
  };

  const notificationSettings = [
    { key: 'orderUpdates' as const, label: 'Order Updates', description: 'Confirmed, cooking & preparing alerts', icon: Bell },
    { key: 'readyAlerts' as const, label: 'Ready Alerts', description: 'Notified when your order is ready', icon: Volume2 },
    { key: 'weeklySummary' as const, label: 'Weekly Summary', description: 'Your weekly activity digest', icon: Clock },
    { key: 'soundEnabled' as const, label: 'Sound Effects', description: 'Play sound on notifications', icon: Volume2 },
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
            transition={{ delay: 0.1 }} className="settings__card settings__card--full">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--primary"><Bell className="settings__icon" /></div>
              <h3 className="settings__card-title">Notifications</h3>
            </div>
            <div className="settings__list">
              {notificationSettings.map((s, i) => {
               const enabled = !!preferences[s.key];
                const fb = s.key === 'weeklySummary' && enabled
                  ? { ...FEEDBACK.weeklySummary.on, body: WEEKLY_ON_BODY }
                  : FEEDBACK[s.key][enabled ? 'on' : 'off'];
                const wasJustToggled = justToggledKey === s.key;

                return (
                  <motion.div key={s.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }} className="settings__item">

                    {/* Toggle row */}
                    <div className="settings__item-row">
                      <div className="settings__item-content">
                        <div className="settings__item-icon-wrapper"><s.icon className="settings__item-icon" /></div>
                        <div className="settings__item-text">
                          <p className="settings__item-label">{s.label}</p>
                          <p className="settings__item-desc">{s.description}</p>
                        </div>
                      </div>
                      <div className="settings__switch-wrap">
                        <Switch checked={enabled} onCheckedChange={() => handleNotifToggle(s.key)} />
                      </div>
                    </div>

                    {/* Animated feedback block */}
                    <AnimatePresence mode="wait">
                      <FeedbackBlock
                        key={`${s.key}-${enabled}`}
                        feedback={fb}
                        justToggled={wasJustToggled}
                      />
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            <div className="settings__info">
              <Sparkles className="settings__info-icon" />
              <div className="settings__info-text">
                <strong>Smart Notifications:</strong> Critical order updates are always delivered regardless of other settings.
              </div>
            </div>
          </motion.div>

          {/* ── Appearance ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="settings__card settings__card--full">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--accent">
                <Zap className="settings__icon" />
              </div>
              <h3 className="settings__card-title">Appearance</h3>
            </div>

            <div className="settings__item">
              {/* Toggle row */}
              <div className="settings__item-row">
                <div className="settings__item-content">
                  <div className="settings__item-icon-wrapper"><Zap className="settings__item-icon" /></div>
                  <div className="settings__item-text">
                    <p className="settings__item-label">Smart Slot Suggestions</p>
                    <p className="settings__item-desc">AI-powered pickup time recommendations</p>
                  </div>
                </div>
                <div className="settings__switch-wrap">
                  <Switch checked={smartSlot} onCheckedChange={toggleSmartSlot} />
                </div>
              </div>

              {/* Feedback block */}
              <AnimatePresence mode="wait">
                <FeedbackBlock
                  key={`smartSlot-${smartSlot}`}
                  feedback={SMART_SLOT_FEEDBACK[smartSlot ? 'on' : 'off']}
                  justToggled={smartSlotJustToggled}
                />
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Danger Zone ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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

      <AnimatePresence>
        {showSignOutModal && (
          <SignOutModal onConfirm={handleSignOut} onClose={() => setShowSignOutModal(false)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}