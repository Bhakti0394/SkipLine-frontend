// ============================================================
// SimulationControls.tsx — File 1 look + File 2 backend
// ============================================================
//
// KEPT from File 1: motion.div wrapper with fade-in animation,
//                   Turtle/Rabbit speed icons, "Pause" label (not "Stop"),
//                   prop-based interface (no direct hook call),
//                   N/S keyboard shortcut hint style
//
// KEPT from File 2: stopSimulation() on pause for error clearing,
//                   isSimTriggerPending disabled states,
//                   capacity row (freeSlots, capacityPct, isOverloaded),
//                   burst input + Add N Orders button,
//                   feedback message (burstResult / simulationError),
//                   +1 button disabled when overloaded,
//                   Wind/Zap/Gauge replaced with Turtle/Zap/Rabbit (File 1)

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Plus, Zap, Turtle, Rabbit, Wind } from 'lucide-react';
import { CapacitySnapshot } from '../../../kitchen-types/order';
import '../styles/Simulationcontrols.scss';

interface SimulationControlsProps {
  isSimulating:       boolean;
  simulationSpeed:    'slow' | 'normal' | 'fast';
  simulationError?:   string | null;
  isSimTriggerPending?: boolean;
  capacity:           CapacitySnapshot;
  onToggleSimulation: () => void;       // parent calls stopSimulation() or setIsSimulating()
  onSetSpeed:         (speed: 'slow' | 'normal' | 'fast') => void;
  onAddOne:           () => Promise<{ generated: number; rejected: number; reason?: string }>;
  onBurst:            (count: number) => Promise<{ generated: number; rejected: number; reason?: string }>;
}

export const SimulationControls: React.FC<SimulationControlsProps> = memo(({
  isSimulating,
  simulationSpeed,
  simulationError,
  isSimTriggerPending = false,
  capacity,
  onToggleSimulation,
  onSetSpeed,
  onAddOne,
  onBurst,
}) => {
  const [burst, setBurst]             = useState(5);
  const [burstResult, setBurstResult] = useState<string | null>(null);

  const handleToggle = () => {
    setBurstResult(null);
    onToggleSimulation();
  };

  const handleAddOne = async () => {
    setBurstResult(null);
    try {
      const result = await onAddOne();
      setBurstResult(
        result.rejected > 0
          ? `Rejected: ${result.reason ?? 'Kitchen full'}`
          : 'Order added'
      );
    } catch (err: any) {
      setBurstResult(err.message);
    }
  };

  const handleBurst = async () => {
    setBurstResult(null);
    try {
      const result = await onBurst(burst);
      setBurstResult(
        result.rejected > 0
          ? `${result.generated} added, ${result.rejected} rejected — ${result.reason ?? 'Kitchen full'}`
          : `${result.generated} order${result.generated !== 1 ? 's' : ''} added`
      );
    } catch (err: any) {
      setBurstResult(err.message);
    }
  };

  // File 1: Turtle / Zap / Rabbit icons for speed
  const speeds: Array<{ key: 'slow' | 'normal' | 'fast'; label: string; Icon: React.ElementType }> = [
    { key: 'slow',   label: '0.5×', Icon: Turtle  },
    { key: 'normal', label: '1×',   Icon: Zap     },
    { key: 'fast',   label: '2×',   Icon: Rabbit  },
  ];

  const feedbackMessage = burstResult ?? simulationError ?? null;
  const isError =
    feedbackMessage?.toLowerCase().includes('reject') ||
    feedbackMessage?.toLowerCase().includes('full')   ||
    feedbackMessage?.toLowerCase().includes('failed') ||
    !!simulationError;

  return (
    // File 1: motion.div fade-in wrapper
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="simulation-controls"
    >
      {/* ── Header — File 1: "Order Simulation" title ── */}
      <div className="simulation-controls__header">
        <h3 className="simulation-controls__title">Order Simulation</h3>
        <div className="simulation-controls__status">
          <span className={`simulation-controls__status-dot${isSimulating ? ' active' : ''}`} />
          <span className="simulation-controls__status-text">
            {isSimulating ? 'Running' : 'Paused'}
          </span>
        </div>
      </div>

      {/* ── Capacity row (File 2) ── */}
      <div className="simulation-controls__capacity">
        <span>Free slots: <strong>{capacity.freeSlots}</strong></span>
        <span>·</span>
        <span>Capacity: <strong>{capacity.capacityPct}%</strong></span>
        {capacity.isOverloaded && (
          <span className="simulation-controls__overload">⚠ OVERLOADED</span>
        )}
      </div>

      {/* ── Main buttons — File 1: "Pause" label; File 2: pending + overload states ── */}
      <div className="simulation-controls__buttons">
        <button
          className={`simulation-controls__btn simulation-controls__btn--main ${
            isSimulating
              ? 'simulation-controls__btn--secondary'
              : 'simulation-controls__btn--primary'
          }`}
          onClick={handleToggle}
          disabled={isSimTriggerPending}
        >
          {isSimulating
            ? <><Pause className="simulation-controls__icon" /> Pause</>
            : <><Play  className="simulation-controls__icon" /> Start</>
          }
        </button>

        <button
          className="simulation-controls__btn simulation-controls__btn--main simulation-controls__btn--outline"
          onClick={handleAddOne}
          disabled={isSimTriggerPending || capacity.isOverloaded}
          title={capacity.isOverloaded ? 'Kitchen is at full capacity' : 'Add 1 order'}
        >
          <Plus className="simulation-controls__icon" /> +1
        </button>
      </div>

      {/* ── Speed controls — File 1: Turtle/Zap/Rabbit icons ── */}
      <div className="simulation-controls__speed">
        <span className="simulation-controls__speed-label">Speed:</span>
        {speeds.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`simulation-controls__speed-btn${
              simulationSpeed === key ? ' simulation-controls__speed-btn--active' : ''
            }`}
            onClick={() => onSetSpeed(key)}
            title={`Set speed to ${label}`}
          >
            <Icon className="simulation-controls__speed-icon" />
            <span className="simulation-controls__speed-text">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Burst row (File 2) ── */}
      <div className="simulation-controls__burst">
        <input
          type="number"
          min={1}
          max={50}
          value={burst}
          onChange={e => setBurst(Math.max(1, Math.min(50, Number(e.target.value))))}
          className="simulation-controls__burst-input"
        />
        <button
          onClick={handleBurst}
          disabled={isSimTriggerPending || capacity.isOverloaded}
          className="simulation-controls__btn simulation-controls__btn--secondary"
          title={capacity.isOverloaded ? 'Kitchen is at full capacity' : `Add ${burst} orders`}
        >
          Add {burst} Orders
        </button>
      </div>

      {/* ── Feedback (File 2) ── */}
      {feedbackMessage && (
        <p className={`simulation-controls__feedback simulation-controls__feedback--${isError ? 'error' : 'success'}`}>
          {feedbackMessage}
        </p>
      )}

      {/* ── Hint — File 1: N/S shortcut style; File 2: capacity slots info ── */}
      <p className="simulation-controls__hint">
        Orders beyond capacity ({capacity.totalSlots} slots) are rejected.{' '}
        <kbd className="simulation-controls__kbd">N</kbd> to add,{' '}
        <kbd className="simulation-controls__kbd">S</kbd> to toggle.
      </p>

    </motion.div>
  );
});

export default SimulationControls;