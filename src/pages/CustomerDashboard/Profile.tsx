import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Edit3, Award, Flame,
  TrendingUp, Calendar, Gift, Shield, Save, X,
  Crown, Sparkles, Target, Loader2,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from '../../customer-hooks/use-toast';
import { useAuth } from '../../context/AuthContext';
import { useSkipLine } from '../../customer-context/SkipLineContext';
import '../../components/CustomerDashboard/styles/Profile.scss';

const FloatingParticles = () => (
  <div className="profile__particles">
    {[...Array(8)].map((_, i) => (
      <motion.div key={i} className="profile__particle" initial={{ opacity: 0 }}
        animate={{ x: [0, Math.random() * 100 - 50], y: [0, Math.random() * 100 - 50], opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: i * 0.3 }}
        style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${4 + Math.random() * 8}px`, height: `${4 + Math.random() * 8}px` }}
      />
    ))}
  </div>
);

// Achievements are unlocked based on real order count + streak from backend.
// No hardcoded "earned: true" — all driven by metrics.
function buildAchievements(totalOrders: number, streak: number) {
  return [
    { id: '1', name: 'First Order',  icon: '🎉', earned: totalOrders >= 1  },
    { id: '2', name: '10 Orders',    icon: '🔥', earned: totalOrders >= 10 },
    { id: '3', name: 'Speed Demon',  icon: '⚡', earned: streak >= 3       },
    { id: '4', name: 'Eco Warrior',  icon: '🌱', earned: totalOrders >= 5  },
    { id: '5', name: 'Platinum',     icon: '💎', earned: totalOrders >= 25 },
    { id: '6', name: '100 Orders',   icon: '👑', earned: totalOrders >= 100 },
  ];
}

// Format time saved: 190 min → "3.2h", 45 min → "45 min"
function formatTimeSaved(minutes: number): string {
  if (minutes <= 0) return '0 min';
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${Math.round(minutes)} min`;
}

// Format streak with units
function formatStreak(streak: number): string {
  if (streak <= 0) return '0 days';
  return `${streak} day${streak === 1 ? '' : 's'}`;
}

export default function Profile() {
  const { user } = useAuth();
  // FIX: all stats come from SkipLineContext (which fetches from backend on load)
  const { metrics, orderHistory } = useSkipLine();

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name:     user?.fullName ?? 'Your Name',
    email:    user?.email    ?? 'your@email.com',
    phone:    '',
    location: '',
  });

  // Keep profile name/email in sync if auth user changes (e.g. after login)
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      name:  prev.name  === 'Your Name'       ? (user?.fullName ?? 'Your Name')       : prev.name,
      email: prev.email === 'your@email.com'  ? (user?.email    ?? 'your@email.com')  : prev.email,
    }));
  }, [user]);

  const handleSave = () => {
    setIsEditing(false);
    if (profile.name) localStorage.setItem('auth_full_name', profile.name);
    toast({ title: 'Profile Updated! ✓', description: 'Your changes have been saved' });
  };

  // FIX: stats derived from real metrics fetched by SkipLineContext
  const totalOrders = (metrics.ordersThisMonth ?? 0) + (orderHistory?.length ?? 0);

  const stats = [
    { label: 'Total Orders',  value: totalOrders > 0 ? String(totalOrders) : '—',                     icon: Calendar,   color: '#ff6b35' },
    { label: 'Time Saved',    value: metrics.timeSaved > 0 ? formatTimeSaved(metrics.timeSaved) : '—', icon: TrendingUp, color: '#f7931e' },
    { label: 'Points Earned', value: metrics.loyaltyPoints > 0 ? metrics.loyaltyPoints.toLocaleString() : '—', icon: Gift, color: '#fbbf24' },
    { label: 'Streak',        value: formatStreak(metrics.streak ?? 0),                               icon: Flame,      color: '#ff6b35' },
  ];

  const achievements = buildAchievements(totalOrders, metrics.streak ?? 0);
  const earnedCount  = achievements.filter(a => a.earned).length;

  // Derive membership tier from total orders
  const memberTier =
    totalOrders >= 100 ? 'Legendary'  :
    totalOrders >= 50  ? 'Platinum'   :
    totalOrders >= 25  ? 'Gold'       :
    totalOrders >= 10  ? 'Silver'     :
                         'Member';

  const streakLabel = (metrics.streak ?? 0) > 0
    ? `${metrics.streak} day streak`
    : 'No active streak';

  return (
    <DashboardLayout>
      <div className="profile">
        <FloatingParticles />

        <div className="profile__hero">
          <div className="profile__hero-gradient">
            <motion.div className="profile__hero-gradient-orb profile__hero-gradient-orb--1" animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity }} />
            <motion.div className="profile__hero-gradient-orb profile__hero-gradient-orb--2" animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity }} />
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="profile__header">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="profile__title-badge">
              <User className="profile__title-badge-icon" /><span>Your Account</span>
            </motion.div>
            <h1 className="profile__title">My <span className="profile__title-grad">Profile</span></h1>
            <p className="profile__subtitle">Manage your account and track your journey</p>
          </motion.div>
        </div>

        {/* FIX: stats grid now uses real metrics from backend via SkipLineContext */}
        <div className="profile__stats-grid">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }} className="profile__stat-card">
              <div className="profile__stat-glow" style={{ background: `radial-gradient(circle, ${stat.color}20, transparent)` }} />
              <div className="profile__stat-icon" style={{ color: stat.color }}><stat.icon /></div>
              <div className="profile__stat-content">
                <div className="profile__stat-value">{stat.value}</div>
                <div className="profile__stat-label">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="profile__grid">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="profile__card">
            <div className="profile__card-glow" />
            <div className="profile__avatar-wrapper">
              <div className="profile__avatar"><User className="profile__avatar-icon" /></div>
              <div className="profile__badge"><Crown className="profile__badge-icon" /></div>
            </div>
            <h2 className="profile__name">{profile.name}</h2>
            {/* FIX: tier is dynamic based on order count, not hardcoded "Premium Member" */}
            <p className="profile__member-type">{memberTier} Member</p>
            <div className="profile__tags">
              {/* FIX: tier badge is dynamic */}
              <div className="profile__tag profile__tag--rank"><Award className="profile__tag-icon" />{memberTier}</div>
              {/* FIX: streak label is dynamic */}
              <div className="profile__tag profile__tag--streak"><Flame className="profile__tag-icon" />{streakLabel}</div>
            </div>
            <Button onClick={() => setIsEditing(!isEditing)} className="profile__edit-btn">
              {isEditing ? <><X className="profile__edit-icon" />Cancel</> : <><Edit3 className="profile__edit-icon" />Edit Profile</>}
            </Button>
          </motion.div>

          {/* Personal Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="profile__info">
            <div className="profile__card-glow" />
            <div className="profile__section-header"><Sparkles className="profile__section-icon" /><h3 className="profile__section-title">Personal Information</h3></div>
            <div className="profile__fields">
              {[
                { icon: User,   field: 'name',     label: 'Full Name',       placeholder: 'Your name'       },
                { icon: Mail,   field: 'email',    label: 'Email',           placeholder: 'your@email.com'  },
                { icon: Phone,  field: 'phone',    label: 'Phone',           placeholder: '+91 98765 43210' },
                { icon: MapPin, field: 'location', label: 'Pickup Location', placeholder: 'Your campus address' },
              ].map(({ icon: Icon, field, label, placeholder }) => (
                <div key={field} className="profile__field">
                  <div className="profile__field-icon-wrapper"><Icon className="profile__field-icon" /></div>
                  <div className="profile__field-content">
                    <label className="profile__field-label">{label}</label>
                    {isEditing ? (
                      <Input value={profile[field as keyof typeof profile]} onChange={(e) => setProfile({ ...profile, [field]: e.target.value })} className="profile__field-input" placeholder={placeholder} />
                    ) : (
                      <p className="profile__field-value">{profile[field as keyof typeof profile] || <span style={{ opacity: 0.4 }}>Not set</span>}</p>
                    )}
                  </div>
                </div>
              ))}
              {isEditing && (
                <Button onClick={handleSave} className="profile__save-btn">
                  <Save className="profile__save-icon" />Save Changes
                </Button>
              )}
            </div>
          </motion.div>

          {/* Achievements — FIX: earned status driven by real metrics */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="profile__achievements">
            <div className="profile__card-glow" />
            <div className="profile__section-header">
              <Target className="profile__section-icon" />
              <h3 className="profile__section-title">Achievements</h3>
              {/* FIX: count is dynamic */}
              <span className="profile__achievements-count">{earnedCount}/{achievements.length}</span>
            </div>
            <div className="profile__achievements-grid">
              {achievements.map((achievement, index) => (
                <motion.div key={achievement.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + index * 0.05 }} whileHover={achievement.earned ? { scale: 1.1, rotate: 5 } : {}}
                  className={`profile__achievement ${achievement.earned ? 'profile__achievement--earned' : 'profile__achievement--locked'}`}>
                  <div className="profile__achievement-icon">{achievement.icon}</div>
                  <p className="profile__achievement-name">{achievement.name}</p>
                  {!achievement.earned && (<div className="profile__achievement-overlay"><Shield className="profile__achievement-lock" /></div>)}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}