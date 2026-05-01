import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';
import { useSkipLine } from '../../../customer-context/SkipLineContext';
import '../overview-styles/Streakcard.scss';

const MILESTONES = [3, 7, 14, 21, 30];

function getEncouragement(streak: number): string {
  if (streak === 0) return 'Place an order to start your streak';
  if (streak < 3) return 'Building momentum — keep going!';
  if (streak < 7) return 'Nice consistency! 🔥';
  if (streak < 14) return "You're on a roll!";
  if (streak < 21) return 'Unstoppable ordering streak!';
  if (streak < 30) return 'Elite level consistency 👑';
  return 'Legendary — 30 day streak!';
}

function buildWeekGrid(streak: number): boolean[] {
  return Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    return daysAgo < streak;
  });
}

export function StreakCard() {
  const { metrics } = useSkipLine();
  const streak = metrics.streak;
  const perks  = metrics.perks;

  const weekGrid = buildWeekGrid(streak);
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const nextMilestone = MILESTONES.find(m => m > streak) ?? MILESTONES[MILESTONES.length - 1];
  const prevMilestone = MILESTONES.filter(m => m <= streak).pop() ?? 0;
  const progress =
    streak >= nextMilestone
      ? 100
      : ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="streak-enhanced"
    >
      <div className="streak-enhanced__bg-decoration streak-enhanced__bg-decoration--top" />
      <div className="streak-enhanced__bg-decoration streak-enhanced__bg-decoration--bottom" />

      {/* Header */}
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
            <h3 className="streak-enhanced__title">Daily streak</h3>
            <p className="streak-enhanced__subtitle">{getEncouragement(streak)}</p>
          </div>
        </div>

        <motion.div
          key={streak}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="streak-enhanced__counter"
        >
          <Flame className="streak-enhanced__counter-icon" />
          <span className="streak-enhanced__counter-number">{streak}</span>
          <span className="streak-enhanced__counter-label">days</span>
        </motion.div>
      </div>

      {/* 7-day activity grid */}
      <div className="streak-enhanced__week-section">
        <p className="streak-enhanced__week-label">This week</p>
        <div className="streak-enhanced__week-grid">
          {weekGrid.map((active, i) => (
            <div key={i} className="streak-enhanced__week-day">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                className={`streak-enhanced__week-dot ${active ? 'streak-enhanced__week-dot--active' : ''}`}
              />
              <span className="streak-enhanced__week-day-label">{DAY_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="streak-enhanced__progress-section">
        <div className="streak-enhanced__progress-header">
          <span className="streak-enhanced__progress-title">
            {streak >= 30 ? 'All milestones reached!' : `Next milestone: ${nextMilestone} days`}
          </span>
          <span className="streak-enhanced__progress-remaining">
            {streak >= nextMilestone ? '✓ Reached!' : `${nextMilestone - streak} to go`}
          </span>
        </div>

        <div className="streak-enhanced__progress-bar">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
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
      </div>

      {/* Milestone dots */}
      <div className="streak-enhanced__milestones">
        {MILESTONES.map((m) => {
          const reached = streak >= m;
          return (
            <div key={m} className="streak-enhanced__milestone">
              <motion.div
                animate={reached ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`streak-enhanced__milestone-dot ${reached ? 'streak-enhanced__milestone-dot--reached' : ''}`}
              >
                {reached ? '🔥' : m}
              </motion.div>
              <span className="streak-enhanced__milestone-label">{m}d</span>
            </div>
          );
        })}
      </div>

      {/* Why keep the streak — perks */}
{/* Why keep the streak — perks */}
<div className="streak-enhanced__perks-section">
  <p className="streak-enhanced__perks-label">Why keep the streak</p>
  {perks.map((perk) => (
    <motion.div
      key={perk.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={`streak-enhanced__perk ${
        perk.active
          ? 'streak-enhanced__perk--active'
          : 'streak-enhanced__perk--locked'
      }`}
    >
      <div className="streak-enhanced__perk-icon">{perk.icon}</div>
      <div className="streak-enhanced__perk-body">
        <p className="streak-enhanced__perk-name">{perk.name}</p>
        <p className="streak-enhanced__perk-desc">{perk.desc}</p>
      </div>
      {perk.active ? (
        <span className="streak-enhanced__badge streak-enhanced__badge--active">
          Active
        </span>
      ) : (
        <span className="streak-enhanced__badge streak-enhanced__badge--locked">
          Unlocked at {perk.unlockAt} days
        </span>
      )}
    </motion.div>
  ))}
</div>

      {/* Footer */}
      <div className="streak-enhanced__footer">
        <div className="streak-enhanced__footer-content">
          <Zap className="streak-enhanced__footer-icon" />
          <p className="streak-enhanced__footer-text">
            <span className="streak-enhanced__footer-highlight">Pro tip: </span>
            Order daily to keep your streak alive! 🎯
          </p>
        </div>
      </div>


    </motion.div>
  );
}