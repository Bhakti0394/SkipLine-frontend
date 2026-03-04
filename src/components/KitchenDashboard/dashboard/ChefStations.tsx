// src/components/KitchenDashboard/dashboard/ChefStations.tsx
//
// Renders the staff panel with three visual states:
//   ACTIVE (onShift=true)  → normal card + ❌ remove button
//   BACKUP (onShift=false) → greyed card + [Activate] green button
//   OFF                    → never passed in (filtered before this component)

import { StaffWorkloadDto } from '../../../kitchen-api/kitchenApi';
import '../styles/Chefstations.scss';

const FlameIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="chef-stations__icon">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function loadStatus(chef: StaffWorkloadDto): 'available' | 'busy' | 'full' {
  if (chef.loadPercent >= 100) return 'full';
  if (chef.loadPercent >= 50)  return 'busy';
  return 'available';
}

interface ChefStationsProps {
  /** ALL today's staff — ACTIVE (onShift=true) and BACKUP (onShift=false). */
  staff: StaffWorkloadDto[];
  /** Called with chefId when ❌ is clicked on an ACTIVE chef. */
  onToggleActive?: (chefId: string) => void;
  /** Called with chefId when [Activate] is clicked on a BACKUP chef. */
  onActivateChef?: (chefId: string) => void;
  /** True while a remove validation API call is in-flight. */
  isValidating?: boolean;
  /** ChefId currently being validated — shows spinner on that card. */
  validatingId?: string | null;
  /** ChefId currently being activated — shows spinner on that card. */
  activatingId?: string | null;
}

export function ChefStations({
  staff,
  onToggleActive,
  onActivateChef,
  isValidating,
  validatingId,
  activatingId,
}: ChefStationsProps) {

  const activeStaff = staff.filter(s => s.onShift);
  const backupStaff = staff.filter(s => !s.onShift);

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
      {/* Header */}
      <div className="chef-stations__header">
        <FlameIcon />
        <h3 className="chef-stations__title">Kitchen Staff</h3>
        <span className="chef-stations__count">{activeStaff.length} active</span>
        {backupStaff.length > 0 && (
          <span className="chef-stations__count" style={{ color: '#64748b', marginLeft: '0.25rem' }}>
            · {backupStaff.length} backup
          </span>
        )}
      </div>

      {/* ── ACTIVE staff ────────────────────────────────────────────────── */}
      <div className="chef-stations__list">
        {activeStaff.map(chef => {
          const status           = loadStatus(chef);
          const isBeingValidated = validatingId === chef.chefId;
          const isLastActive     = activeStaff.length === 1;
          const wouldBeBlocked   = isLastActive && chef.activeOrders > 0;
          const removeDisabled   = isBeingValidated || wouldBeBlocked;
          const freeSlots        = chef.maxCapacity - chef.activeOrders;

          return (
            <div
              key={chef.chefId}
              className={`chef-item chef-item--${status}`}
              title={`${chef.name} — ${chef.activeOrders}/${chef.maxCapacity} orders`}
            >
              <div className={`chef-item__avatar chef-item__avatar--${status}`}>
                {getInitials(chef.name)}
              </div>

              <div className="chef-item__info">
                <p className="chef-item__name">{chef.name}</p>
                <p className="chef-item__stats">
                  {chef.activeOrders}/{chef.maxCapacity} orders · {chef.loadPercent}%
                </p>
                <div className="chef-item__bar-track">
                  <div
                    className={`chef-item__bar-fill chef-item__bar-fill--${status}`}
                    style={{ width: `${Math.min(chef.loadPercent, 100)}%` }}
                  />
                </div>
                <p className="chef-item__stats" style={{ fontSize: '0.65rem', marginTop: '0.1rem' }}>
                  {freeSlots} free slot{freeSlots !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="chef-item__status">
                <span className={`chef-item__dot chef-item__dot--${status}`} />
                {onToggleActive && (
                  <button
                    className="chef-item__toggle"
                    title={
                      wouldBeBlocked
                        ? 'Cannot remove — last active chef with cooking orders'
                        : isBeingValidated ? 'Validating…'
                        : `Remove ${chef.name} from shift`
                    }
                    disabled={removeDisabled}
                    style={{ opacity: removeDisabled ? 0.3 : 1, cursor: removeDisabled ? 'not-allowed' : 'pointer' }}
                    onClick={() => { if (!removeDisabled) onToggleActive(chef.chefId); }}
                  >
                    {isBeingValidated ? '…' : '×'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BACKUP staff ────────────────────────────────────────────────── */}
      {backupStaff.length > 0 && (
        <>
          <div style={{
            fontSize: '0.65rem', color: '#475569', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '0.5rem 0 0.25rem',
          }}>
            Backup — available to activate
          </div>
          <div className="chef-stations__list">
            {backupStaff.map(chef => {
              const isActivating = activatingId === chef.chefId;
              return (
                <div
                  key={chef.chefId}
                  className="chef-item chef-item--full"
                  style={{ opacity: 0.6 }}
                  title={`${chef.name} — backup chef, not yet on shift`}
                >
                  <div className="chef-item__avatar chef-item__avatar--full" style={{ background: 'rgba(100,116,139,0.2)' }}>
                    {getInitials(chef.name)}
                  </div>

                  <div className="chef-item__info">
                    <p className="chef-item__name">{chef.name}</p>
                    <p className="chef-item__stats" style={{ color: '#64748b' }}>
                      Backup · {chef.maxCapacity} slots available
                    </p>
                  </div>

                  {onActivateChef && (
                    <button
                      disabled={isActivating}
                      onClick={() => onActivateChef(chef.chefId)}
                      title={`Activate ${chef.name}`}
                      style={{
                        background: isActivating ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.18)',
                        color: '#34d399',
                        border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: '0.3rem',
                        padding: '0.22rem 0.6rem',
                        fontSize: '0.67rem',
                        fontWeight: 700,
                        cursor: isActivating ? 'not-allowed' : 'pointer',
                        opacity: isActivating ? 0.6 : 1,
                        letterSpacing: '0.01em',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isActivating ? '…' : 'Activate'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default ChefStations;
