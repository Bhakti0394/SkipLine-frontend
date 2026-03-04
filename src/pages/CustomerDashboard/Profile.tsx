import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Award,
  Flame,
  TrendingUp,
  Calendar,
  Gift,
  Shield,
  Save,
  X,
  Crown,
  Sparkles,
  Target,
} from 'lucide-react';
import { DashboardLayout } from '../../components/CustomerDashboard/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from '../../customer-hooks/use-toast';
import '../../components/CustomerDashboard/styles/Profile.scss';

// Floating particles for premium effect
const FloatingParticles = () => (
  <div className="profile__particles">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="profile__particle"
        initial={{ opacity: 0 }}
        animate={{
          x: [0, Math.random() * 100 - 50],
          y: [0, Math.random() * 100 - 50],
          opacity: [0, 0.6, 0],
          scale: [0, 1, 0],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.3,
        }}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${4 + Math.random() * 8}px`,
          height: `${4 + Math.random() * 8}px`,
        }}
      />
    ))}
  </div>
);

const achievements = [
  { id: '1', name: 'First Order', icon: '🎉', earned: true },
  { id: '2', name: '10 Orders', icon: '🔥', earned: true },
  { id: '3', name: 'Speed Demon', icon: '⚡', earned: true },
  { id: '4', name: 'Eco Warrior', icon: '🌱', earned: true },
  { id: '5', name: 'Platinum', icon: '💎', earned: true },
  { id: '6', name: '100 Orders', icon: '👑', earned: false },
];

const stats = [
  { label: 'Total Orders', value: '47', icon: Calendar, color: '#ff6b35' },
  { label: 'Time Saved', value: '3.2h', icon: TrendingUp, color: '#f7931e' },
  { label: 'Points Earned', value: '2,450', icon: Gift, color: '#fbbf24' },
  { label: 'Streak', value: '7 days', icon: Flame, color: '#ff6b35' },
];

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    phone: '+1 (555) 123-4567',
    location: '123 Main St, San Francisco, CA',
  });

  const handleSave = () => {
    setIsEditing(false);
    toast({
      title: "Profile Updated! ✓",
      description: "Your changes have been saved",
    });
  };

  return (
    <DashboardLayout>
      <div className="profile">
        <FloatingParticles />

        {/* Hero Section */}
        <div className="profile__hero">
          <div className="profile__hero-gradient">
            <motion.div
              className="profile__hero-gradient-orb profile__hero-gradient-orb--1"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 20, repeat: Infinity }}
            />
            <motion.div
              className="profile__hero-gradient-orb profile__hero-gradient-orb--2"
              animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
              transition={{ duration: 25, repeat: Infinity }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="profile__header"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="profile__title-badge"
            >
              <User className="profile__title-badge-icon" />
              <span>Your Account</span>
            </motion.div>

            <h1 className="profile__title">
              My <span className="profile__title-grad">Profile</span>
            </h1>
            <p className="profile__subtitle">
              Manage your account and track your journey
            </p>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="profile__stats-grid">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="profile__stat-card"
            >
              <div className="profile__stat-glow" style={{ background: `radial-gradient(circle, ${stat.color}20, transparent)` }} />
              <div className="profile__stat-icon" style={{ color: stat.color }}>
                <stat.icon />
              </div>
              <div className="profile__stat-content">
                <div className="profile__stat-value">{stat.value}</div>
                <div className="profile__stat-label">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="profile__grid">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="profile__card"
          >
            <div className="profile__card-glow" />
            
            <div className="profile__avatar-wrapper">
              <div className="profile__avatar">
                <User className="profile__avatar-icon" />
              </div>
              <div className="profile__badge">
                <Crown className="profile__badge-icon" />
              </div>
            </div>

            <h2 className="profile__name">{profile.name}</h2>
            <p className="profile__member-type">Premium Member</p>

            <div className="profile__tags">
              <div className="profile__tag profile__tag--rank">
                <Award className="profile__tag-icon" />
                Platinum
              </div>
              <div className="profile__tag profile__tag--streak">
                <Flame className="profile__tag-icon" />
                7 day streak
              </div>
            </div>

            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="profile__edit-btn"
            >
              {isEditing ? (
                <>
                  <X className="profile__edit-icon" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit3 className="profile__edit-icon" />
                  Edit Profile
                </>
              )}
            </Button>
          </motion.div>

          {/* Personal Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="profile__info"
          >
            <div className="profile__card-glow" />
            
            <div className="profile__section-header">
              <Sparkles className="profile__section-icon" />
              <h3 className="profile__section-title">Personal Information</h3>
            </div>

            <div className="profile__fields">
              <div className="profile__field">
                <div className="profile__field-icon-wrapper">
                  <User className="profile__field-icon" />
                </div>
                <div className="profile__field-content">
                  <label className="profile__field-label">Full Name</label>
                  {isEditing ? (
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="profile__field-input"
                    />
                  ) : (
                    <p className="profile__field-value">{profile.name}</p>
                  )}
                </div>
              </div>

              <div className="profile__field">
                <div className="profile__field-icon-wrapper">
                  <Mail className="profile__field-icon" />
                </div>
                <div className="profile__field-content">
                  <label className="profile__field-label">Email</label>
                  {isEditing ? (
                    <Input
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="profile__field-input"
                    />
                  ) : (
                    <p className="profile__field-value">{profile.email}</p>
                  )}
                </div>
              </div>

              <div className="profile__field">
                <div className="profile__field-icon-wrapper">
                  <Phone className="profile__field-icon" />
                </div>
                <div className="profile__field-content">
                  <label className="profile__field-label">Phone</label>
                  {isEditing ? (
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="profile__field-input"
                    />
                  ) : (
                    <p className="profile__field-value">{profile.phone}</p>
                  )}
                </div>
              </div>

              <div className="profile__field">
                <div className="profile__field-icon-wrapper">
                  <MapPin className="profile__field-icon" />
                </div>
                <div className="profile__field-content">
                  <label className="profile__field-label">Pickup Location</label>
                  {isEditing ? (
                    <Input
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      className="profile__field-input"
                    />
                  ) : (
                    <p className="profile__field-value">{profile.location}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <Button
                  onClick={handleSave}
                  className="profile__save-btn"
                >
                  <Save className="profile__save-icon" />
                  Save Changes
                </Button>
              )}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="profile__achievements"
          >
            <div className="profile__card-glow" />
            
            <div className="profile__section-header">
              <Target className="profile__section-icon" />
              <h3 className="profile__section-title">Achievements</h3>
              <span className="profile__achievements-count">
                {achievements.filter(a => a.earned).length}/{achievements.length}
              </span>
            </div>

            <div className="profile__achievements-grid">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={achievement.earned ? { scale: 1.1, rotate: 5 } : {}}
                  className={`profile__achievement ${
                    achievement.earned
                      ? 'profile__achievement--earned'
                      : 'profile__achievement--locked'
                  }`}
                >
                  <div className="profile__achievement-icon">{achievement.icon}</div>
                  <p className="profile__achievement-name">{achievement.name}</p>
                  {!achievement.earned && (
                    <div className="profile__achievement-overlay">
                      <Shield className="profile__achievement-lock" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}