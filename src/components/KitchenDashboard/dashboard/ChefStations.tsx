// ============================================================
// ChefStations.tsx — File 1 look + File 2 backend (CoffeeIcon removed)
// ============================================================
//
// status values from StaffWorkloadDto: 'available' | 'busy' | 'full'
// 'break' does not exist in backend — CoffeeIcon removed entirely.

import { memo, useMemo } from 'react';
import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import '../styles/Chefstations.scss';

// ─── Icons ───────────────────────────────────────────────────────────────────

const FlameIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    className="chef-stations__icon"
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChefStationsProps {
  /** ALL today's staff — active (onShift=true) and backup (onShift=false) */
  staff:           StaffWorkloadDto[];
  /** Fires when × is clicked on an active chef — parent handles modal */
  onRemoveChef?:   (chefId: string) => void;
  /** Fires when Activate is clicked on a backup chef */
  onActivateChef?: (chefId: string) => void;
  /** ChefId currently being removed — shows spinner on that card */
  removingId?:     string | null;
  /** ChefId currently being activated — shows spinner on that card */
  activatingId?:   string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ChefStations = memo(function ChefStations({
  staff,
  onRemoveChef,
  onActivateChef,
  removingId,
  activatingId,
}: ChefStationsProps) {

  // Hooks MUST come before any conditional return — Rules of Hooks
  const activeStaff = useMemo(() => staff.filter(s => s.onShift),  [staff]);
  const backupStaff = useMemo(() => staff.filter(s => !s.onShift), [staff]);

  // Empty state — safe to return after hooks
  if (staff.length === 0) {
    return (
      <div className="chef-stations">
        <div className="chef-stations__header">
          <FlameIcon />
          <h3 className="chef-stations__title">Kitchen Staff</h3>
        </div>
        <p className="chef-stations__empty">No staff scheduled today.</p>
      </div>
    );
  }

  return (
    <div className="chef-stations">

      {/* ── Header ── */}
      <div className="chef-stations__header">
        <FlameIcon />
        <h3 className="chef-stations__title">Kitchen Staff</h3>
      </div>

      {/* ── Active staff ── */}
      <div className="chef-stations__list">
        {activeStaff.map(chef => {
          const status     = chef.status; // 'available' | 'busy' | 'full'
          const isRemoving = removingId === chef.chefId;
          const freeSlots  = chef.maxCapacity - chef.activeOrders;

          return (
            <div
              key={chef.chefId}
              className={`chef-item chef-item--${status}`}
              title={`${chef.name} — ${chef.activeOrders}/${chef.maxCapacity} orders`}
            >
              {/* Avatar */}
              <div className={`chef-item__avatar chef-item__avatar--${status}`}>
                {getInitials(chef.name)}
              </div>

              {/* Info */}
              <div className="chef-item__info">
                <p className="chef-item__name">{chef.name}</p>
                <p className="chef-item__stats">
                  {chef.activeOrders}/{chef.maxCapacity} orders · {chef.completedToday} done today
                </p>
                <div className="chef-item__bar-track">
                  <div
                    className={`chef-item__bar-fill chef-item__bar-fill--${status}`}
                    style={{ width: `${Math.min(chef.loadPercent, 100)}%` }}
                  />
                </div>
                <p className="chef-item__stats chef-item__stats--small">
                  {freeSlots} free slot{freeSlots !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Status — order badge + dot + remove btn */}
              <div className="chef-item__status">

                {/* Order count badge */}
                {chef.activeOrders > 0 && (
                  <span className="chef-item__badge">
                    {chef.activeOrders}
                  </span>
                )}

                {/* Status dot: --available | --busy | --full */}
                <span className={`chef-item__dot chef-item__dot--${status}`} />

                {/* Remove button */}
                {onRemoveChef && (
                  <button
                    className="chef-item__toggle"
                    title={isRemoving ? 'Validating…' : `Remove ${chef.name} from shift`}
                    disabled={isRemoving}
                    onClick={() => { if (!isRemoving) onRemoveChef(chef.chefId); }}
                  >
                    {isRemoving ? '…' : '×'}
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Backup staff ── */}
      {backupStaff.length > 0 && (
        <>
          <p className="chef-stations__backup-heading">
            Backup — available to activate
          </p>
          <div className="chef-stations__list">
            {backupStaff.map(chef => {
              const isActivating = activatingId === chef.chefId;
              return (
                <div
                  key={chef.chefId}
                  className="chef-item chef-item--backup"
                  title={`${chef.name} — backup chef, not yet on shift`}
                >
                  <div className="chef-item__avatar chef-item__avatar--backup">
                    {getInitials(chef.name)}
                  </div>

                  <div className="chef-item__info">
                    <p className="chef-item__name">{chef.name}</p>
                    <p className="chef-item__stats chef-item__stats--dim">
                      Backup · {chef.maxCapacity} slots available
                    </p>
                  </div>

                  <div className="chef-item__status">
                    <span className="chef-item__dot chef-item__dot--backup" />
                    {onActivateChef && (
                      <button
                        className="chef-item__activate-btn"
                        disabled={isActivating}
                        onClick={() => onActivateChef(chef.chefId)}
                        title={`Activate ${chef.name}`}
                      >
                        {isActivating ? '…' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </div>
  );
});

export default ChefStations;