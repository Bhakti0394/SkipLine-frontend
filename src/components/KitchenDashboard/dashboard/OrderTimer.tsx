import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Zap, Turtle, Rabbit, AlertCircle } from 'lucide-react';
import '../styles/Simulationcontrols.scss';

interface SimulationControlsProps {
  isSimulating: boolean;
  setIsSimulating: (value: boolean) => void;
  speed: 'slow' | 'normal' | 'fast';
  setSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onAddOrder: () => void;
  backendError?: string | null;
}

const SPEED_CONFIG = [
  { value: 'slow'   as const, label: '0.5x', icon: Turtle, intervalSec: 25 },
  { value: 'normal' as const, label: '1x',   icon: Zap,    intervalSec: 12 },
  { value: 'fast'   as const, label: '2x',   icon: Rabbit, intervalSec: 5  },
];

export function SimulationControls({
  isSimulating,
  setIsSimulating,
  speed,
  setSpeed,
  onAddOrder,
  backendError,
}: SimulationControlsProps) {
  const currentSpeed = SPEED_CONFIG.find(s => s.value === speed)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="simulation-controls"
    >
      {/* Header */}
      <div className="simulation-controls__header">
        <h3 className="simulation-controls__title">Order Simulation</h3>
        <div className="simulation-controls__status">
          <motion.span
            className={`simulation-controls__status-dot ${isSimulating ? 'active' : ''}`}
            animate={isSimulating ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={isSimulating ? { repeat: Infinity, duration: 1.5 } : {}}
          />
          <span className="simulation-controls__status-text">
            {isSimulating
              ? `Running · ~${currentSpeed.intervalSec}s/order`
              : 'Paused'}
          </span>
        </div>
      </div>

      {/* Backend error badge */}
      <AnimatePresence>
        {backendError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="simulation-controls__warning"
          >
            <AlertCircle size={12} />
            <span>{backendError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Buttons */}
      <div className="simulation-controls__buttons">
        <motion.button
          whileTap={{ scale: 0.96 }}
          className={`simulation-controls__btn simulation-controls__btn--main ${
            isSimulating
              ? 'simulation-controls__btn--secondary'
              : 'simulation-controls__btn--primary'
          }`}
          onClick={() => setIsSimulating(!isSimulating)}
        >
          {isSimulating ? (
            <><Pause className="simulation-controls__icon" /> Pause</>
          ) : (
            <><Play className="simulation-controls__icon" /> Start</>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          className="simulation-controls__btn simulation-controls__btn--main simulation-controls__btn--outline"
          onClick={onAddOrder}
        >
          <Plus className="simulation-controls__icon" /> Add
        </motion.button>
      </div>

      {/* Speed Controls */}
      <div className="simulation-controls__speed">
        <span className="simulation-controls__speed-label">Speed:</span>
        {SPEED_CONFIG.map(({ value, label, icon: Icon }) => (
          <motion.button
            key={value}
            whileTap={{ scale: 0.92 }}
            className={`simulation-controls__speed-btn ${
              speed === value ? 'simulation-controls__speed-btn--active' : ''
            }`}
            onClick={() => setSpeed(value)}
            title={`${label} — orders every ~${SPEED_CONFIG.find(s => s.value === value)!.intervalSec}s`}
          >
            <Icon className="simulation-controls__speed-icon" />
            <span className="simulation-controls__speed-text">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="simulation-controls__hint">
        💡 Press <kbd className="simulation-controls__kbd">N</kbd> to add order,{' '}
        <kbd className="simulation-controls__kbd">S</kbd> to toggle simulation
      </p>
    </motion.div>
  );
}