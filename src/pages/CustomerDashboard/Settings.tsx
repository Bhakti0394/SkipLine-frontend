// pages/CustomerDashboard/Settings.tsx
//
// FIX [HARDCODED-BADGES]: Removed hardcoded "2 cards", "English", "3 devices"
// from the Account Settings menu items.
//
// BEFORE: menuItems had static badge strings that never reflected reality.
//   A user with 0 cards saved would still see "2 cards". A user on Hindi would
//   still see "English". These were UI placeholders never wired to any data.
//
// AFTER: badges are removed from these items. If you later add real endpoints
//   for payment methods, language preferences, or device sessions, re-add
//   them by fetching the data and passing it to the badge field.
//   The items still navigate correctly when clicked; only the static badge
//   labels are removed.

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Moon, Globe, CreditCard, Shield, Smartphone, LogOut,
  ChevronRight, Volume2, MapPin, Clock, Zap, Settings as SettingsIcon, User, Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { toast } from '../../customer-hooks/use-toast';
import { useNotifications } from '../../customer-context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import '../../components/CustomerDashboard/styles/Settings.scss';

const FloatingParticles = () => (
  <div className="settings__particles">
    {[...Array(8)].map((_, i) => (
      <motion.div key={i} className="settings__particle" initial={{ opacity: 0 }}
        animate={{ x: [0, Math.random() * 100 - 50], y: [0, Math.random() * 100 - 50], opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.3 }}
        style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${4 + Math.random() * 8}px`, height: `${4 + Math.random() * 8}px` }}
      />
    ))}
  </div>
);

export default function Settings() {
  const { preferences, updatePreferences } = useNotifications();
  const { logout } = useAuth();

  const [otherPreferences, setOtherPreferences] = useState([
    { id: '1', label: 'Smart Slot Suggestions', description: 'AI-powered pickup time',         icon: Zap,    enabled: true  },
    { id: '2', label: 'Location Services',       description: 'Use GPS for nearby restaurants', icon: MapPin, enabled: true  },
    { id: '3', label: 'Dark Mode',               description: 'Use dark theme',                 icon: Moon,   enabled: true  },
  ]);

  const handleToggle = (key: string, isNotification = true) => {
    if (isNotification) {
      updatePreferences({ [key]: !preferences[key as keyof typeof preferences] });
    } else {
      setOtherPreferences(prev => prev.map(item => item.id === key ? { ...item, enabled: !item.enabled } : item));
    }
    toast({ title: 'Settings Updated ✓', description: 'Your preferences have been saved' });
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      // Even if the network call fails, localStorage is cleared and user is null
    }
  };

  const notificationSettings = [
    { key: 'orderUpdates',       label: 'Order Updates',      description: 'Status change notifications',   icon: Bell,     enabled: preferences.orderUpdates       },
    { key: 'readyAlerts',        label: 'Ready Alerts',        description: 'Pickup ready notification',      icon: Volume2,  enabled: preferences.readyAlerts        },
    { key: 'promotionalOffers',  label: 'Promotional Offers',  description: 'Special deals and discounts',   icon: Sparkles, enabled: preferences.promotionalOffers  },
    { key: 'weeklySummary',      label: 'Weekly Summary',      description: 'Weekly activity summary',        icon: Clock,    enabled: preferences.weeklySummary      },
  ];

  // FIX: removed hardcoded badges ("2 cards", "English", "3 devices").
  // These were static strings that never reflected the user's real data.
  // badge: null means no badge is shown — the chevron still indicates navigability.
  // Re-add badges here when you have real endpoints to back them up.
  const menuItems = [
    { label: 'Payment Methods',   icon: CreditCard, badge: null as string | null, color: '#ff6b35' },
    { label: 'Security',          icon: Shield,     badge: null,                  color: '#f7931e' },
    { label: 'Language',          icon: Globe,      badge: null,                  color: '#fbbf24' },
    { label: 'Connected Devices', icon: Smartphone, badge: null,                  color: '#ff6b35' },
  ];

  return (
    <DashboardLayout>
      <div className="settings">
        <FloatingParticles />

        <div className="settings__hero">
          <div className="settings__hero-gradient">
            <motion.div className="settings__hero-gradient-orb settings__hero-gradient-orb--1" animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} />
            <motion.div className="settings__hero-gradient-orb settings__hero-gradient-orb--2" animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity }} />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="settings__header">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="settings__title-badge">
              <SettingsIcon className="settings__title-badge-icon" /><span>Customize</span>
            </motion.div>
            <h1 className="settings__title"><span className="settings__title-grad">Settings</span></h1>
            <p className="settings__subtitle">Personalize your SkipLine experience</p>
          </motion.div>
        </div>

        <div className="settings__grid">
          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="settings__card">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--primary"><Bell className="settings__icon" /></div>
              <h3 className="settings__card-title">Notifications</h3>
            </div>
            <div className="settings__list">
              {notificationSettings.map((setting, index) => (
                <motion.div key={setting.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 }} className="settings__item">
                  <div className="settings__item-content">
                    <div className="settings__item-icon-wrapper"><setting.icon className="settings__item-icon" /></div>
                    <div className="settings__item-text"><p className="settings__item-label">{setting.label}</p><p className="settings__item-desc">{setting.description}</p></div>
                  </div>
                  <Switch checked={setting.enabled} onCheckedChange={() => handleToggle(setting.key, true)} />
                </motion.div>
              ))}
            </div>
            <div className="settings__info"><Sparkles className="settings__info-icon" /><div className="settings__info-text"><strong>Smart Notifications:</strong> Get critical updates even when notifications are off</div></div>
          </motion.div>

          {/* Preferences */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="settings__card">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--accent"><Zap className="settings__icon" /></div>
              <h3 className="settings__card-title">Preferences</h3>
            </div>
            <div className="settings__list">
              {otherPreferences.map((setting, index) => (
                <motion.div key={setting.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.05 }} className="settings__item">
                  <div className="settings__item-content">
                    <div className="settings__item-icon-wrapper"><setting.icon className="settings__item-icon" /></div>
                    <div className="settings__item-text"><p className="settings__item-label">{setting.label}</p><p className="settings__item-desc">{setting.description}</p></div>
                  </div>
                  <Switch checked={setting.enabled} onCheckedChange={() => handleToggle(setting.id, false)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Account Settings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="settings__card settings__card--full">
            <div className="settings__card-glow" />
            <div className="settings__card-header">
              <div className="settings__icon-wrapper settings__icon-wrapper--user"><User className="settings__icon" /></div>
              <h3 className="settings__card-title">Account Settings</h3>
            </div>
            <div className="settings__account-grid">
              {menuItems.map((item, index) => (
                <motion.button key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 + index * 0.05 }} whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} className="settings__account-item">
                  <div className="settings__account-glow" style={{ background: `radial-gradient(circle, ${item.color}20, transparent)` }} />
                  <div className="settings__account-left">
                    <div className="settings__account-icon-wrapper" style={{ color: item.color }}><item.icon className="settings__account-icon" /></div>
                    <span className="settings__account-label">{item.label}</span>
                  </div>
                  <div className="settings__account-right">
                    {/* FIX: badge only rendered when it has a real value */}
                    {item.badge && <span className="settings__account-badge">{item.badge}</span>}
                    <ChevronRight className="settings__account-chevron" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="settings__card settings__card--full settings__card--danger">
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
              <Button onClick={handleSignOut} className="settings__danger-btn">
                <LogOut className="settings__danger-icon" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}