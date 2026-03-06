// ============================================================
// CapacityMeter.tsx — File 1 look + File 2 backend
// ============================================================
//
// KEPT from File 1: status thresholds (90/70 instead of 100/80),
//                   status messages ("Ready for more orders" etc.),
//                   Low/Optimal/High labels, h3 for title
//
// KEPT from File 2: CapacitySnapshot + StaffWorkloadDto props,
//                   active/backup staff sections with Remove/Activate
//                   buttons, pendingChefId loading state, memo(),
//                   correct import paths, no internal hook calls

import React, { memo } from 'react';
import { CapacitySnapshot } from '../../../kitchen-types/order';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import '../styles/CapacityMeter.scss';

interface CapacityMeterProps {
  capacity:        CapacitySnapshot;
  staff:           StaffWorkloadDto[];
  onRemoveChef:    (chefId: string) => void;
  onActivateChef:  (chefId: string) => void;
  pendingChefId?:  string | null;
}

export const CapacityMeter: React.FC<CapacityMeterProps> = memo(({
  capacity,
  staff,
  onRemoveChef,
  onActivateChef,
  pendingChefId,
}) => {
  // File 1: thresholds at 90/70 (not 100/80)
  const tier =
    capacity.capacityPct >= 90 ? 'urgent'  :
    capacity.capacityPct >= 70 ? 'warning' :
    'normal';

  // File 1: status messages
  const getStatusMessage = () => {
    if (capacity.capacityPct >= 90) return '⚠ At maximum capacity.';
    if (capacity.capacityPct >= 70) return 'Kitchen running efficiently.';
    return 'Ready for more orders.';
  };

  const activeStaff = staff.filter(s => s.onShift);
  const backupStaff = staff.filter(s => !s.onShift);

  return (
    <div className="capacity-meter">

      {/* ── Header ── */}
      <div className="capacity-meter__header">
        {/* File 1: h3 tag */}
        <h3 className="capacity-meter__title">Kitchen Capacity</h3>
        <span className={`capacity-meter__percentage capacity-meter__percentage--${tier}`}>
          {capacity.capacityPct}%
        </span>
      </div>

      {/* ── Progress bar ── */}
      <div className="capacity-meter__progress">
        <div
          className={`capacity-meter__progress-bar capacity-meter__progress-bar--${tier}`}
          style={{ width: `${capacity.capacityPct}%` }}
        />
      </div>

      {/* ── File 1: Low / Optimal / High labels ── */}
      <div className="capacity-meter__labels">
        <span>Low</span>
        <span>Optimal</span>
        <span>High</span>
      </div>

      {/* ── File 1: status message style ── */}
      <div className="capacity-meter__status">
        <p className={`capacity-meter__status-text capacity-meter__status-text--${tier}`}>
          {getStatusMessage()}
        </p>
      </div>

      {/* ── File 2: Active staff section ── */}
      {activeStaff.length > 0 && (
        <div className="capacity-meter__staff-section">
          <p className="capacity-meter__staff-heading">
            ON SHIFT ({activeStaff.length})
          </p>
          {activeStaff.map(s => (
            <div key={s.chefId} className="capacity-meter__staff-row capacity-meter__staff-row--active">
              <span className="capacity-meter__staff-name">{s.name}</span>
              <span className="capacity-meter__staff-slots">
                {s.activeOrders}/{s.maxCapacity}
              </span>
              <button
                className="capacity-meter__staff-btn capacity-meter__staff-btn--remove"
                onClick={() => onRemoveChef(s.chefId)}
                disabled={pendingChefId === s.chefId}
                title="Remove from shift"
              >
                {pendingChefId === s.chefId ? '…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── File 2: Backup staff section ── */}
      {backupStaff.length > 0 && (
        <div className="capacity-meter__staff-section">
          <p className="capacity-meter__staff-heading">
            BACKUP ({backupStaff.length})
          </p>
          {backupStaff.map(s => (
            <div key={s.chefId} className="capacity-meter__staff-row capacity-meter__staff-row--backup">
              <span className="capacity-meter__staff-name">{s.name}</span>
              <span className="capacity-meter__staff-slots">
                {s.maxCapacity} slots
              </span>
              <button
                className="capacity-meter__staff-btn capacity-meter__staff-btn--activate"
                onClick={() => onActivateChef(s.chefId)}
                disabled={pendingChefId === s.chefId}
                title="Activate chef"
              >
                {pendingChefId === s.chefId ? '…' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
});

export default CapacityMeter;