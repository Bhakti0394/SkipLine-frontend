import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Gift, Star, Crown, Sparkles, Trophy, Medal,
  Zap, ChevronRight, Info, Tag, Clock, Shield,
} from 'lucide-react';
import { useSkipLine } from '../../../customer-context/SkipLineContext';
import { Button } from '@/components/ui/button';
import { useNotifications } from '../../../customer-context/NotificationContext';
import '../overview-styles/StreakCard.scss';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reward {
  id: string;
  name: string;
  emoji: string;
  icon: any;
  streakRequired: number;
  description: string;
  unlocked: boolean;
  type: 'badge' | 'perk' | 'vip';
  color: string;
}

interface StreakCelebrationProps {
  reward: Reward;
  onClose: () => void;
}

// ─── Celebration Popup ────────────────────────────────────────────────────────

function StreakCelebration({ reward, onClose }: StreakCelebrationProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="streak-celebration"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="streak-celebration__modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti particles */}
        <div className="streak-celebration__confetti">
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-20, -80],
                x: Math.sin(i * 25) * 50,
              }}
              transition={{
                duration: 1.8,
                delay: i * 0.08,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              className="streak-celebration__particle"
              style={{ left: `${5 + i * 6}%`, top: '50%' }}
            >
              {['✨', '🎉', '⭐', '🔥', '👑'][i % 5]}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="streak-celebration__emoji"
        >
          {reward.emoji}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="streak-celebration__title"
        >
          🎉 Achievement Unlocked!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="streak-celebration__name"
        >
          {reward.name}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="streak-celebration__description"
        >
          {reward.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button onClick={onClose} className="streak-celebration__button">
            Awesome! 🙌
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export function StreakCard() {
  const { metrics } = useSkipLine();
  const { addNotification } = useNotifications();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingReward, setCelebratingReward] = useState<Reward | null>(null);
  const [showBenefits, setShowBenefits] = useState(false);

  const currentStreak = metrics.streak;

  const rewards: Reward[] = [
    {
      id: '1',
      name: 'First Steps',
      emoji: '🌟',
      icon: Star,
      streakRequired: 3,
      description: "You're on a roll! Badge added to your profile.",
      unlocked: currentStreak >= 3,
      type: 'badge',
      color: 'from-yellow-400 to-amber-500',
    },
    {
      id: '2',
      name: 'On Fire!',
      emoji: '🔥',
      icon: Flame,
      streakRequired: 7,
      description: 'Score a free topping on your next order — on us! 🎁',
      unlocked: currentStreak >= 7,
      type: 'perk',
      color: 'from-orange-400 to-red-500',
    },
    {
      id: '3',
      name: 'Streak Master',
      emoji: '🏅',
      icon: Medal,
      streakRequired: 14,
      description: 'Skip the wait — your orders jump to the priority queue! ⚡',
      unlocked: currentStreak >= 14,
      type: 'perk',
      color: 'from-blue-400 to-purple-500',
    },
    {
      id: '4',
      name: 'Champion',
      emoji: '🏆',
      icon: Trophy,
      streakRequired: 21,
      description: '10% off every order, automatically applied at checkout. 💸',
      unlocked: currentStreak >= 21,
      type: 'vip',
      color: 'from-purple-400 to-pink-500',
    },
    {
      id: '5',
      name: 'Legendary VIP',
      emoji: '👑',
      icon: Crown,
      streakRequired: 30,
      description: 'VIP status unlocked! Access exclusive menu items & special perks. 👑',
      unlocked: currentStreak >= 30,
      type: 'vip',
      color: 'from-amber-400 to-yellow-300',
    },
  ];

  // Customer benefit highlights — 100% customer-facing, no operator language
  const customerBenefits = [
    {
      icon: Tag,
      colorClass: 'benefit--savings',
      label: 'Save More',
      detail: 'Unlock discounts & free items the longer you streak.',
    },
    {
      icon: Clock,
      colorClass: 'benefit--speed',
      label: 'Skip the Queue',
      detail: 'Priority pickup so your order is always ready fast.',
    },
    {
      icon: Shield,
      colorClass: 'benefit--vip',
      label: 'VIP Access',
      detail: 'Exclusive menu items only loyal customers can see.',
    },
  ];

  // Listen for streak milestone events
  useEffect(() => {
    const handleMilestone = (event: CustomEvent<{ streak: number }>) => {
      const milestoneReward = rewards.find(
        (r) => r.streakRequired === event.detail.streak,
      );
      if (milestoneReward) {
        setCelebratingReward({ ...milestoneReward, unlocked: true });
        setShowCelebration(true);
        addNotification({
          title: `🎉 ${milestoneReward.name} Unlocked!`,
          message: milestoneReward.description,
          type: 'streak_milestone',
        });
      }
    };

    window.addEventListener('streak-milestone', handleMilestone as EventListener);
    return () =>
      window.removeEventListener('streak-milestone', handleMilestone as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, currentStreak]);

  const nextReward =
    rewards.find((r) => !r.unlocked) || rewards[rewards.length - 1];
  const prevRewardStreak =
    rewards.filter((r) => r.unlocked).pop()?.streakRequired || 0;
  const progressToNext = nextReward.unlocked
    ? 100
    : ((currentStreak - prevRewardStreak) /
        (nextReward.streakRequired - prevRewardStreak)) *
      100;

  const handleRewardClick = (reward: Reward) => {
    if (reward.unlocked) {
      setCelebratingReward(reward);
      setShowCelebration(true);
    }
  };

  const getEncouragement = () => {
    if (currentStreak === 0) return 'Start your streak today! 🚀';
    if (currentStreak < 3) return "You're building momentum! 💪";
    if (currentStreak < 7) return 'Keep it up, superstar! ⭐';
    if (currentStreak < 14) return "You're on fire! 🔥";
    if (currentStreak < 21) return 'Unstoppable! 🚀';
    if (currentStreak < 30) return 'Legend in the making! 👑';
    return "You're a true champion! 🏆";
  };

  const nextPerkPreview = () => {
    if (nextReward.unlocked) return "All rewards unlocked! You're a legend. 🏆";
    return nextReward.description;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="streak-enhanced"
      >
        {/* Background decorations */}
        <div className="streak-enhanced__bg-decoration streak-enhanced__bg-decoration--top" />
        <div className="streak-enhanced__bg-decoration streak-enhanced__bg-decoration--bottom" />

        {/* ── Header ── */}
        <div className="streak-enhanced__header">
          <div className="streak-enhanced__title-wrapper">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse' }}
              className="streak-enhanced__fire-icon"
            >
              🔥
            </motion.div>
            <div>
              <h3 className="streak-enhanced__title">Daily Streak</h3>
              <p className="streak-enhanced__subtitle">{getEncouragement()}</p>
            </div>
          </div>

          {/* Streak counter pill */}
          <motion.div
            key={currentStreak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="streak-enhanced__counter"
          >
            <Flame className="streak-enhanced__counter-icon" />
            <span className="streak-enhanced__counter-number">{currentStreak}</span>
            <span className="streak-enhanced__counter-label">days</span>
          </motion.div>
        </div>

        {/* ── Why Streaks Benefit You ── */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="streak-enhanced__benefits-section"
        >
          <button
            onClick={() => setShowBenefits(!showBenefits)}
            className="streak-enhanced__benefits-toggle"
          >
            <Info className="streak-enhanced__benefits-toggle-icon" />
            <span className="streak-enhanced__benefits-toggle-text">
              Why streaks benefit you
            </span>
            <motion.div
              animate={{ rotate: showBenefits ? 90 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronRight className="streak-enhanced__benefits-toggle-chevron" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showBenefits && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="streak-enhanced__benefits-content"
              >
                <div className="streak-enhanced__benefits-grid">
                  {customerBenefits.map((b) => (
                    <div
                      key={b.label}
                      className={`streak-enhanced__benefit-card streak-enhanced__benefit-card${b.colorClass}`}
                    >
                      <b.icon className="streak-enhanced__benefit-icon" />
                      <div>
                        <p className="streak-enhanced__benefit-label">{b.label}</p>
                        <p className="streak-enhanced__benefit-detail">{b.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="streak-enhanced__benefits-explanation">
                  <Zap className="streak-enhanced__benefits-explanation-icon" />
                  The longer your streak, the better the rewards — free items, priority
                  pickup, and exclusive VIP perks are all waiting for you. 🎯
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Progress to next reward ── */}
        <div className="streak-enhanced__progress-section">
          <div className="streak-enhanced__progress-header">
            <span className="streak-enhanced__progress-title">
              Next: {nextReward.emoji} {nextReward.name}
            </span>
            <span className="streak-enhanced__progress-remaining">
              {nextReward.unlocked
                ? 'Unlocked! 🎉'
                : `${nextReward.streakRequired - currentStreak} days to go`}
            </span>
          </div>

          <div className="streak-enhanced__progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressToNext, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="streak-enhanced__progress-fill"
            >
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="streak-enhanced__progress-shine"
              />
            </motion.div>
          </div>

          <p className="streak-enhanced__progress-description">
            {nextPerkPreview()}
          </p>
        </div>

        {/* ── Reward badges ── */}
        <div className="streak-enhanced__rewards">
          <div className="streak-enhanced__rewards-header">
            <Gift className="streak-enhanced__rewards-icon" />
            <span className="streak-enhanced__rewards-title">Your Rewards</span>
          </div>

          <div className="streak-enhanced__rewards-list">
            {rewards.map((reward, index) => (
              <motion.button
                key={reward.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.08, type: 'spring', stiffness: 300 }}
                onClick={() => handleRewardClick(reward)}
                whileHover={reward.unlocked ? { scale: 1.15, rotate: 5 } : {}}
                whileTap={reward.unlocked ? { scale: 0.95 } : {}}
                className={`streak-enhanced__reward-badge ${
                  reward.unlocked
                    ? 'streak-enhanced__reward-badge--unlocked'
                    : 'streak-enhanced__reward-badge--locked'
                }`}
                data-color={reward.color}
                disabled={!reward.unlocked}
                aria-label={
                  reward.unlocked
                    ? `${reward.name} – ${reward.description}`
                    : `Locked – order ${reward.streakRequired} days in a row to unlock`
                }
              >
                {reward.emoji}

                {reward.unlocked && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="streak-enhanced__reward-sparkle"
                  >
                    <Sparkles className="streak-enhanced__sparkle-icon" />
                  </motion.div>
                )}

                {!reward.unlocked && (
                  <div className="streak-enhanced__reward-lock">
                    <span className="streak-enhanced__reward-lock-text">
                      {reward.streakRequired}
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="streak-enhanced__footer"
        >
          <div className="streak-enhanced__footer-content">
            <Zap className="streak-enhanced__footer-icon" />
            <p className="streak-enhanced__footer-text">
              <span className="streak-enhanced__footer-highlight">Pro tip: </span>
              Order daily to keep your streak alive and unlock bigger perks faster! 🎯
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Celebration popup */}
      <AnimatePresence>
        {showCelebration && celebratingReward && (
          <StreakCelebration
            reward={celebratingReward}
            onClose={() => {
              setShowCelebration(false);
              setCelebratingReward(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}