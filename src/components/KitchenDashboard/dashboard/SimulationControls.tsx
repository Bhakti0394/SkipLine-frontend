// ============================================================
// SimulationControls.tsx
// ============================================================
//
// Simulation gate logic:
//
//   Sim OFF → drag/drop ✓, chef assign ✓, +1 ✓, Add N Orders ✓
//             Speed buttons disabled (no auto-ticks running)
//             Auto-complete on Ready cards: OFF (manual Complete only)
//             Hint: "Drag & drop or use +1 to add orders manually"
//
//   Sim ON  → everything above ✓ + auto-orders inject at set speed ✓
//             Auto-complete fires after 20s on Ready cards ✓
//             Hint: slots/keyboard shortcuts
//
// +1 and Add N Orders are ALWAYS visible — manual injection is allowed
// regardless of sim state. Backend auto-assigns a chef when one is
// available, so manually injected orders flow into cooking automatically.

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Plus, Zap, Turtle, Rabbit } from 'lucide-react';
import { CapacitySnapshot } from '../../../kitchen-types/order';
import '../styles/Simulationcontrols.scss';

interface SimulationControlsProps {
  isSimulating:         boolean;
  simulationSpeed:      'slow' | 'normal' | 'fast';
  simulationError?:     string | null;
  isSimTriggerPending?: boolean;
  capacity:             CapacitySnapshot;
  onToggleSimulation:   () => void;
  onSetSpeed:           (speed: 'slow' | 'normal' | 'fast') => void;
  onAddOne:             () => Promise<{ generated: number; rejected: number; reason?: string }>;
  onBurst:              (count: number) => Promise<{ generated: number; rejected: number; reason?: string }>;
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

  const speeds: Array<{ key: 'slow' | 'normal' | 'fast'; label: string; Icon: React.ElementType }> = [
    { key: 'slow',   label: '0.5×', Icon: Turtle },
    { key: 'normal', label: '1×',   Icon: Zap    },
    { key: 'fast',   label: '2×',   Icon: Rabbit },
  ];

  const feedbackMessage = burstResult ?? simulationError ?? null;
  const isError =
    feedbackMessage?.toLowerCase().includes('reject') ||
    feedbackMessage?.toLowerCase().includes('full')   ||
    feedbackMessage?.toLowerCase().includes('failed') ||
    !!simulationError;

  // Injection disabled only when kitchen is full or request in-flight.
  // NOT gated on isSimulating — manual injection always allowed.
  const injectionDisabled = isSimTriggerPending || capacity.isOverloaded;
  const injectionTitle    = capacity.isOverloaded ? 'Kitchen is at full capacity' : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="simulation-controls"
    >
      {/* ── Header ── */}
      <div className="simulation-controls__header">
        <h3 className="simulation-controls__title">Order Simulation</h3>
        <div className="simulation-controls__status">
          <span className={`simulation-controls__status-dot${isSimulating ? ' active' : ''}`} />
          <span className="simulation-controls__status-text">
            {isSimulating ? 'Running' : 'Paused'}
          </span>
        </div>
      </div>

      {/* ── Capacity row ── */}
      <div className="simulation-controls__capacity">
        <span>Free slots: <strong>{capacity.freeSlots}</strong></span>
        <span>·</span>
        <span>Capacity: <strong>{capacity.capacityPct}%</strong></span>
        {capacity.isOverloaded && (
          <span className="simulation-controls__overload">⚠ OVERLOADED</span>
        )}
      </div>

      {/* ── Start/Pause + manual +1 (always visible) ── */}
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
          disabled={injectionDisabled}
          title={injectionTitle}
        >
          <Plus className="simulation-controls__icon" /> +1
        </button>
      </div>

      {/* ── Speed — disabled when sim OFF (no ticks running to speed up) ── */}
      <div className="simulation-controls__speed">
        <span className="simulation-controls__speed-label">Speed:</span>
        {speeds.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`simulation-controls__speed-btn${
              simulationSpeed === key ? ' simulation-controls__speed-btn--active' : ''
            }${!isSimulating ? ' simulation-controls__speed-btn--disabled' : ''}`}
            onClick={() => isSimulating && onSetSpeed(key)}
            disabled={!isSimulating}
            title={!isSimulating ? 'Start simulation to change speed' : `Set speed to ${label}`}
          >
            <Icon className="simulation-controls__speed-icon" />
            <span className="simulation-controls__speed-text">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Burst row (always visible) ── */}
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
          disabled={injectionDisabled}
          className="simulation-controls__btn simulation-controls__btn--secondary"
          title={injectionTitle ?? `Add ${burst} orders`}
        >
          Add {burst} Orders
        </button>
      </div>

      {/* ── Feedback ── */}
      {feedbackMessage && (
        <p className={`simulation-controls__feedback simulation-controls__feedback--${isError ? 'error' : 'success'}`}>
          {feedbackMessage}
        </p>
      )}

      {/* ── Hint — contextual ── */}
      <p className="simulation-controls__hint">
        {isSimulating ? (
          <>
            Orders beyond capacity ({capacity.totalSlots} slots) are rejected.{' '}
            <kbd className="simulation-controls__kbd">N</kbd> to add,{' '}
            <kbd className="simulation-controls__kbd">S</kbd> to toggle.
          </>
        ) : (
          <>
            Drag &amp; drop or use +1 to add orders manually.{' '}
            <kbd className="simulation-controls__kbd">S</kbd> to start auto-simulation.
          </>
        )}
      </p>
    </motion.div>
  );
});

export default SimulationControls;