// ============================================================
// ChefStations.tsx — with onBreak toggle support
// ============================================================
//
// status values from StaffWorkloadDto: 'available' | 'busy' | 'full'
// onBreak: boolean — toggled by admin, blocks order assignment

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

// ─── Pause / Play icons for break toggle ─────────────────────────────────────

const PauseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="currentColor" width="10" height="10"
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
    fill="currentColor" width="10" height="10"
  >
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  if (!name?.trim()) return '?';
  return name.split(' ').map(w => w[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

// ─── Extended DTO — adds onBreak ─────────────────────────────────────────────
// Your StaffWorkloadDto may not have onBreak yet.
// Until backend adds it, we extend it here so the UI compiles cleanly.

interface StaffWorkloadDtoWithBreak extends StaffWorkloadDto {
  onBreak?: boolean;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ChefStationsProps {
  /** ALL today's staff — active (onShift=true) and backup (onShift=false) */
  staff:             StaffWorkloadDtoWithBreak[];
  /** Fires when × is clicked on an active chef — parent handles modal */
  onRemoveChef?:     (chefId: string) => void;
  /** Fires when Activate is clicked on a backup chef */
  onActivateChef?:   (chefId: string) => void;
  /** Fires when break toggle is clicked — parent calls PATCH /chefs/{id}/break */
  onToggleBreak?:    (chefId: string, onBreak: boolean) => void;
  /** ChefId currently being removed — shows spinner on that card */
  removingId?:       string | null;
  /** ChefId currently being activated — shows spinner on that card */
  activatingId?:     string | null;
  /** ChefId whose break status is being saved — shows spinner on that card */
  togglingBreakId?:  string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ChefStations = memo(function ChefStations({
  staff,
  onRemoveChef,
  onActivateChef,
  onToggleBreak,
  removingId,
  activatingId,
  togglingBreakId,
}: ChefStationsProps) {

  const activeStaff = useMemo(() => staff.filter(s => s.onShift),  [staff]);
  const backupStaff = useMemo(() => staff.filter(s => !s.onShift), [staff]);

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
          const isOnBreak      = chef.onBreak ?? false;
          // When on break, override visual status to 'break' for styling
          const displayStatus  = isOnBreak ? 'break' : chef.status;
          const isRemoving     = removingId === chef.chefId;
          const isTogglingBreak = togglingBreakId === chef.chefId;
          const freeSlots      = chef.maxCapacity - chef.activeOrders;

          return (
            <div
              key={chef.chefId}
              className={`chef-item chef-item--${displayStatus}`}
              title={`${chef.name} — ${isOnBreak ? 'on break' : `${chef.activeOrders}/${chef.maxCapacity} orders`}`}
            >
              {/* Avatar */}
              <div className={`chef-item__avatar chef-item__avatar--${displayStatus}`}>
                {getInitials(chef.name)}
              </div>

              {/* Info */}
              <div className="chef-item__info">
                <p className="chef-item__name">
                  {chef.name}
                  {isOnBreak && (
                    <span className="chef-item__break-label">on break</span>
                  )}
                </p>
                {isOnBreak ? (
                  <p className="chef-item__stats chef-item__stats--dim">
                    Not accepting orders
                  </p>
                ) : (
                  <>
                    <p className="chef-item__stats">
                      {chef.activeOrders}/{chef.maxCapacity} orders · {chef.completedToday} done today
                    </p>
                    <div className="chef-item__bar-track">
                      <div
                        className={`chef-item__bar-fill chef-item__bar-fill--${chef.status}`}
                        style={{ width: `${Math.min(chef.loadPercent, 100)}%` }}
                      />
                    </div>
                    <p className="chef-item__stats chef-item__stats--small">
                      {freeSlots} free slot{freeSlots !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>

              {/* Status — badge + dot + break toggle + remove btn */}
              <div className="chef-item__status">

                {/* Order count badge — hide when on break */}
                {!isOnBreak && chef.activeOrders > 0 && (
                  <span className="chef-item__badge">
                    {chef.activeOrders}
                  </span>
                )}

                {/* Status dot */}
                <span className={`chef-item__dot chef-item__dot--${displayStatus}`} />

                {/* Break toggle button */}
                {onToggleBreak && (
                  <button
                    className={`chef-item__break-btn${isOnBreak ? ' chef-item__break-btn--active' : ''}`}
                    title={
                      isTogglingBreak
                        ? 'Saving…'
                        : isOnBreak
                          ? `Mark ${chef.name} available`
                          : `Mark ${chef.name} on break`
                    }
                    disabled={isTogglingBreak || isRemoving}
                    onClick={() => {
                      if (!isTogglingBreak && !isRemoving) {
                        onToggleBreak(chef.chefId, !isOnBreak);
                      }
                    }}
                  >
                    {isTogglingBreak ? '…' : isOnBreak ? <PlayIcon /> : <PauseIcon />}
                  </button>
                )}

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
                        onClick={() => !isActivating && onActivateChef(chef.chefId)}
                        title={isActivating ? 'Activating…' : `Activate ${chef.name}`}
                        style={isActivating ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
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