import React, { memo, useMemo, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { CapacitySnapshot } from '../../../kitchen-types/order';
import { StaffWorkloadDto, StaffRemovalValidationDto, createStaff } from '../../../kitchen-api/kitchenApi';
import { selectCapacityBreakdown, TIER_LABELS, TIER_COLORS, CapacityBreakdown } from '../../../kitchen-hooks/Capacityengine';
import '../styles/CapacityMeter.scss';

const TIER_CSS: Record<CapacityBreakdown['tier'], string> = {
  healthy: 'normal', busy: 'warning', overloaded: 'urgent',
};

const BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60,
  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function Modal({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div style={BACKDROP} onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div className="staff-modal">{children}</div>
    </div>
  );
}

interface CapacityMeterProps {
  capacity:            CapacitySnapshot;
  staff:               StaffWorkloadDto[];
  boardData?:          any;
  onRemoveChef:        (chefId: string) => void;
  removalValidation:   StaffRemovalValidationDto | null;
  removalTargetId:     string | null;
  isValidatingRemoval: boolean;
  isConfirmingRemoval: boolean;
  onConfirmRemoval:    () => Promise<void>;
  onCancelRemoval:     () => void;
  onActivateChef:      (chefId: string) => Promise<void>;
  activatingChefId?:   string | null;
  onChefAdded:         () => void;
}

export const CapacityMeter: React.FC<CapacityMeterProps> = memo(({
  capacity, staff, boardData,
  onRemoveChef,
  removalValidation, removalTargetId, isValidatingRemoval, isConfirmingRemoval,
  onConfirmRemoval, onCancelRemoval,
  onActivateChef, activatingChefId,
  onChefAdded,
}) => {
  const breakdown = useMemo(() => selectCapacityBreakdown(boardData ?? null, staff), [boardData, staff]);
  const pct     = breakdown.totalSlots > 0 ? breakdown.capacityPct : capacity.capacityPct;
  const tier    = breakdown.tier;
  const cssTier = TIER_CSS[tier];

  const activeStaff = staff.filter(s => s.onShift);
  const backupStaff = staff.filter(s => !s.onShift);

  // ── Activate modal ────────────────────────────────────────────────────────
  const [activateId,  setActivateId]  = useState<string | null>(null);
  const [activateErr, setActivateErr] = useState<string | null>(null);
  const [activating,  setActivating]  = useState(false);
  const activateChef = useMemo(() => staff.find(s => s.chefId === activateId) ?? null, [activateId, staff]);

  const handleActivate = useCallback(async () => {
    if (!activateId || activating) return;
    setActivating(true); setActivateErr(null);
    try { await onActivateChef(activateId); setActivateId(null); }
    catch (e: any) { setActivateErr(e.message ?? 'Activation failed'); }
    finally { setActivating(false); }
  }, [activateId, activating, onActivateChef]);

  // ── Remove modal ──────────────────────────────────────────────────────────
  const [removeErr,  setRemoveErr]  = useState<string | null>(null);
  const removingChef = useMemo(() => staff.find(s => s.chefId === removalTargetId) ?? null, [removalTargetId, staff]);

  const handleRemoveConfirm = useCallback(async () => {
    setRemoveErr(null);
    try { await onConfirmRemoval(); }
    catch (e: any) { setRemoveErr(e.message ?? 'Removal failed'); }
  }, [onConfirmRemoval]);

  // ── Add chef modal ────────────────────────────────────────────────────────
  const [showAdd,    setShowAdd]    = useState(false);
  const [chefName,   setChefName]   = useState('');
  const [chefSlots,  setChefSlots]  = useState(3);
  const [chefStatus, setChefStatus] = useState<'ACTIVE' | 'BACKUP'>('BACKUP');
  const [adding,     setAdding]     = useState(false);
  const [addErr,     setAddErr]     = useState<string | null>(null);

  const openAdd = useCallback(() => {
    setChefName(''); setChefSlots(3); setChefStatus('BACKUP'); setAddErr(null); setShowAdd(true);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!chefName.trim()) { setAddErr('Name is required'); return; }
    setAdding(true); setAddErr(null);
    try {
      await createStaff({ name: chefName.trim(), maxConcurrentOrders: chefSlots, activeToday: chefStatus === 'ACTIVE' });
      setShowAdd(false); onChefAdded();
    } catch (e: any) { setAddErr(e.message ?? 'Failed to add chef'); }
    finally { setAdding(false); }
  }, [chefName, chefSlots, chefStatus, onChefAdded]);

  return (
    <div className="capacity-meter">

      {/* ── Header ── */}
      <div className="capacity-meter__header">
        <h3 className="capacity-meter__title">Kitchen Capacity</h3>
        <span className={`capacity-meter__pct capacity-meter__pct--${cssTier}`}>{pct}%</span>
      </div>

      {/* ── Bar ── */}
      <div className="capacity-meter__bar-track">
        <div className={`capacity-meter__bar-fill capacity-meter__bar-fill--${cssTier}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="capacity-meter__bar-labels"><span>Low</span><span>Optimal</span><span>High</span></div>

      {/* ── Summary row ── */}
      <div className="capacity-meter__summary">
        <span className="capacity-meter__summary-stat">
          <strong style={{ color: breakdown.activeLoad > breakdown.totalSlots ? '#ef4444' : TIER_COLORS[tier] }}>
            {breakdown.activeLoad}
          </strong>/{breakdown.totalSlots} orders
        </span>
        <span className="capacity-meter__summary-dot" />
        <span className="capacity-meter__summary-stat">{breakdown.activeChefCount} chefs</span>
        <span className="capacity-meter__summary-dot" />
        <span className={`capacity-meter__summary-status capacity-meter__summary-status--${cssTier}`}>
          {tier === 'overloaded' ? '⚠ At capacity' : tier === 'busy' ? '⚡ High load' : '✓ Ready'}
        </span>
      </div>

      {/* ── Divider ── */}
      <div className="capacity-meter__divider" />

      {/* ── Active staff ── */}
      {activeStaff.length > 0 && (
        <>
          <p className="capacity-meter__section-label">ON SHIFT ({activeStaff.length})</p>
          {activeStaff.map(s => (
            <div key={s.chefId} className="capacity-meter__chef-row">
              <div className={`capacity-meter__avatar capacity-meter__avatar--${s.loadPercent >= 100 ? 'full' : s.loadPercent >= 50 ? 'busy' : 'free'}`}>
                {s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <span className="capacity-meter__chef-name">{s.name}</span>
              <span className="capacity-meter__chef-load">{s.activeOrders}/{s.maxCapacity}</span>
              <button
                className="capacity-meter__btn capacity-meter__btn--remove"
                onClick={() => onRemoveChef(s.chefId)}
                disabled={isValidatingRemoval && removalTargetId === s.chefId}
              >
                {isValidatingRemoval && removalTargetId === s.chefId ? '…' : 'End Shift'}
              </button>
            </div>
          ))}
        </>
      )}

      {/* ── Backup staff ── */}
      {backupStaff.length > 0 && (
        <>
          <p className="capacity-meter__section-label capacity-meter__section-label--backup">BACKUP ({backupStaff.length})</p>
          {backupStaff.map(s => (
            <div key={s.chefId} className="capacity-meter__chef-row capacity-meter__chef-row--backup">
              <div className="capacity-meter__avatar capacity-meter__avatar--off">
                {s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <span className="capacity-meter__chef-name">{s.name}</span>
              <span className="capacity-meter__chef-load">{s.maxCapacity} slots</span>
              <button
                className="capacity-meter__btn capacity-meter__btn--activate"
                onClick={() => { setActivateId(s.chefId); setActivateErr(null); }}
                disabled={activatingChefId === s.chefId}
              >
                {activatingChefId === s.chefId ? '…' : 'Activate'}
              </button>
            </div>
          ))}
        </>
      )}

      {/* ── Add Chef ── */}
      <button className="capacity-meter__add-btn" onClick={openAdd}>
        <Plus size={12} /> Add Chef
      </button>

      {/* ── Activate modal ── */}
      {activateChef && (
        <Modal onDismiss={() => !activating && setActivateId(null)}>
          <h3 className="staff-modal__title">Activate {activateChef.name}?</h3>
          <div className="staff-modal__info staff-modal__info--success">
            Capacity: <strong>{breakdown.totalSlots}</strong> → <strong style={{ color: '#4ade80' }}>{breakdown.totalSlots + activateChef.maxCapacity}</strong> orders.
            <p className="staff-modal__hint">Queued orders will be auto-assigned to Cooking.</p>
          </div>
          {activateErr && <div className="staff-modal__error">⚠ {activateErr}</div>}
          <div className="staff-modal__actions">
            <button className="staff-modal__btn staff-modal__btn--cancel" onClick={() => setActivateId(null)} disabled={activating}>Cancel</button>
            <button className="staff-modal__btn staff-modal__btn--confirm-activate" onClick={handleActivate} disabled={activating}>
              {activating ? 'Activating…' : 'Activate'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Remove modal ── */}
      {removalValidation && (
        <Modal onDismiss={() => !isConfirmingRemoval && onCancelRemoval()}>
          <h3 className="staff-modal__title">End shift — {removingChef?.name}?</h3>
          {removalValidation.blocked
            ? <div className="staff-modal__info staff-modal__info--blocked">🚫 {removalValidation.blockReason}</div>
            : (
              <div className="staff-modal__info staff-modal__info--warning">
                {removalValidation.ordersToReassign > 0 && (
                  <div><strong>{removalValidation.ordersToReassign} order{removalValidation.ordersToReassign !== 1 ? 's' : ''}</strong> will be reassigned{removalValidation.estimatedDelayMinutes > 0 ? ` (~${removalValidation.estimatedDelayMinutes} min delay)` : ''}.</div>
                )}
                <div>Capacity drops: <strong>{breakdown.totalSlots}</strong> → <strong style={{ color: '#ef4444' }}>{removalValidation.newCapacity}</strong>.</div>
                {removalValidation.ordersToReassign === 0 && <div style={{ color: '#10b981', marginTop: '0.25rem' }}>✓ No active orders affected.</div>}
              </div>
            )
          }
          {removeErr && <div className="staff-modal__error">⚠ {removeErr}</div>}
          <div className="staff-modal__actions">
            <button className="staff-modal__btn staff-modal__btn--cancel" onClick={onCancelRemoval} disabled={isConfirmingRemoval}>Cancel</button>
            {!removalValidation.blocked && (
              <button className="staff-modal__btn staff-modal__btn--confirm-remove" onClick={handleRemoveConfirm} disabled={isConfirmingRemoval}>
                {isConfirmingRemoval ? 'Removing…' : 'Confirm'}
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Add chef modal ── */}
      {showAdd && (
        <Modal onDismiss={() => !adding && setShowAdd(false)}>
          <h3 className="staff-modal__title">Add Chef</h3>
          <div className="staff-modal__field">
            <label className="staff-modal__label">Name</label>
            <input className="staff-modal__input" type="text" placeholder="e.g. Ravi Kumar"
              value={chefName} onChange={e => setChefName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus maxLength={50} />
          </div>
          <div className="staff-modal__field">
            <label className="staff-modal__label">Max concurrent orders</label>
            <input className="staff-modal__input staff-modal__input--narrow" type="number" min={1} max={10}
              value={chefSlots} onChange={e => setChefSlots(Math.min(10, Math.max(1, +e.target.value || 1)))} />
          </div>
          <div className="staff-modal__field">
            <label className="staff-modal__label">Status</label>
            <div className="staff-modal__toggle-group">
              {(['ACTIVE', 'BACKUP'] as const).map(s => (
                <button key={s}
                  className={`staff-modal__toggle${chefStatus === s ? ' staff-modal__toggle--' + s.toLowerCase() : ''}`}
                  onClick={() => setChefStatus(s)}>
                  {s === 'ACTIVE' ? 'Active' : 'Backup'}
                </button>
              ))}
            </div>
          </div>
          {addErr && <div className="staff-modal__error">⚠ {addErr}</div>}
          <div className="staff-modal__actions">
            <button className="staff-modal__btn staff-modal__btn--cancel" onClick={() => setShowAdd(false)} disabled={adding}>Cancel</button>
            <button className="staff-modal__btn staff-modal__btn--confirm-activate" onClick={handleAdd} disabled={adding || !chefName.trim()}>
              {adding ? 'Adding…' : 'Add Chef'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
});

export default CapacityMeter;