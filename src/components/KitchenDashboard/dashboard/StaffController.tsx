// ============================================================
// src/components/KitchenDashboard/dashboard/StaffController.tsx
// ============================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { StaffWorkloadDto, StaffRemovalValidationDto, createStaff } from '../../../kitchen-api/kitchenApi';
import { ChefStations } from './ChefStations';

interface StaffControllerProps {
  allStaff:        StaffWorkloadDto[];
  currentCapacity: number;

  onInitiateRemoval: (chefId: string) => Promise<void>;
  onConfirmRemoval:  () => Promise<void>;
  onCancelRemoval:   () => void;
  onActivateChef:    (chefId: string) => Promise<void>;

  removalValidation:   StaffRemovalValidationDto | null;
  removalTargetId:     string | null;
  isValidatingRemoval: boolean;
  isConfirmingRemoval: boolean;
  activatingChefId:    string | null;

  externalActivateId?:       string | null;
  onExternalActivateHandled?: () => void;

  openAddChef?:      boolean;
  onAddChefHandled?: () => void;
  onChefAdded?:      () => void;
}

const MODAL_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export function StaffController({
  allStaff,
  currentCapacity,
  onInitiateRemoval,
  onConfirmRemoval,
  onCancelRemoval,
  onActivateChef,
  removalValidation,
  removalTargetId,
  isValidatingRemoval,
  isConfirmingRemoval,
  activatingChefId,
  externalActivateId,
  onExternalActivateHandled,
  openAddChef,
  onAddChefHandled,
  onChefAdded,
}: StaffControllerProps) {

  // ── Activate state ────────────────────────────────────────────────────────
  const [activateTargetId, setActivateTargetId] = useState<string | null>(null);
  const [activateError,    setActivateError]    = useState<string | null>(null);
  const [isActivating,     setIsActivating]     = useState(false);

  // ── Remove state ──────────────────────────────────────────────────────────
  const [removeError,   setRemoveError]   = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  // ── Add Chef state ────────────────────────────────────────────────────────
  const [showAddChef,   setShowAddChef]   = useState(false);
  const [addChefName,   setAddChefName]   = useState('');
  const [addChefSlots,  setAddChefSlots]  = useState(3);

  // FIX: was a boolean `activeToday` mirroring the old CreateStaffDto.
  // Now matches CreateStaffDto.status: 'ACTIVE' | 'BACKUP'.
  // The backend StaffController.CreateStaffRequest reads `status: StaffStatus`
  // and the old `activeToday` field didn't exist on it — it was silently dropped,
  // so chefs were always created as BACKUP regardless of the user's selection.
  const [addChefStatus, setAddChefStatus] = useState<'ACTIVE' | 'BACKUP'>('BACKUP');

  const [isAddingChef,  setIsAddingChef]  = useState(false);
  const [addChefError,  setAddChefError]  = useState<string | null>(null);

  // Open Add Chef form from external trigger
  useEffect(() => {
    if (openAddChef) {
      setAddChefName(''); setAddChefSlots(3);
      setAddChefStatus('BACKUP'); setAddChefError(null);
      setShowAddChef(true);
      onAddChefHandled?.();
    }
  }, [openAddChef, onAddChefHandled]);

  // Open Activate modal from CapacityMeter
useEffect(() => {
  if (!externalActivateId) return;
  let cancelled = false;
  // Guard: only apply if component is still mounted
  if (!cancelled) {
    setActivateTargetId(externalActivateId);
    setActivateError(null);
    onExternalActivateHandled?.();
  }
  return () => { cancelled = true; };
}, [externalActivateId, onExternalActivateHandled]);

  const activateCandidate = useMemo(
    () => activateTargetId ? allStaff.find(s => s.chefId === activateTargetId) ?? null : null,
    [activateTargetId, allStaff],
  );

  const removingChef = useMemo(
    () => removalTargetId ? allStaff.find(s => s.chefId === removalTargetId) ?? null : null,
    [removalTargetId, allStaff],
  );

  const projectedActivateCapacity = useMemo(
    () => activateCandidate ? currentCapacity + activateCandidate.maxCapacity : currentCapacity,
    [activateCandidate, currentCapacity],
  );

  // ── Add Chef handlers ──────────────────────────────────────────────────────

  const handleAddChefOpen = useCallback(() => {
    setAddChefName(''); setAddChefSlots(3);
    setAddChefStatus('BACKUP'); setAddChefError(null);
    setShowAddChef(true);
  }, []);

  const handleAddChefClose = useCallback(() => {
    if (isAddingChef) return;
    setShowAddChef(false); setAddChefError(null);
  }, [isAddingChef]);

  // FIX: createStaff now receives `status` instead of `activeToday`.
  // This matches CreateStaffDto (and therefore StaffController.CreateStaffRequest)
  // so the backend actually honours the ACTIVE/BACKUP selection the user makes.
  const handleAddChefSubmit = useCallback(async () => {
    if (!addChefName.trim()) { setAddChefError('Chef name is required.'); return; }
    if (addChefSlots < 1 || addChefSlots > 10) { setAddChefError('Slots must be between 1 and 10.'); return; }
    setIsAddingChef(true); setAddChefError(null);
    try {
      await createStaff({
        name:                addChefName.trim(),
        maxConcurrentOrders: addChefSlots,
        status:              addChefStatus,   // FIX: was activeToday: addChefStatus === 'ACTIVE'
      });
      setShowAddChef(false);
      onChefAdded?.();
    } catch (err: any) {
      setAddChefError(err.message ?? 'Failed to add chef. Please try again.');
    } finally {
      setIsAddingChef(false);
    }
  }, [addChefName, addChefSlots, addChefStatus, onChefAdded]);

  // ── Activate handlers ──────────────────────────────────────────────────────

  const handleActivateRequest = useCallback((chefId: string) => {
    setActivateTargetId(chefId); setActivateError(null);
  }, []);

  const handleActivateConfirm = useCallback(async () => {
    if (!activateTargetId || isActivating) return;
    setIsActivating(true); setActivateError(null);
    try {
      await onActivateChef(activateTargetId);
      setActivateTargetId(null);
    } catch (err: any) {
      setActivateError(err.message ?? 'Activation failed. Please try again.');
    } finally {
      setIsActivating(false);
    }
  }, [activateTargetId, isActivating, onActivateChef]);

  const handleActivateCancel = useCallback(() => {
    if (isActivating) return;
    setActivateTargetId(null); setActivateError(null);
  }, [isActivating]);

  // ── Remove handlers ────────────────────────────────────────────────────────

  const handleRemoveRequest = useCallback(async (chefId: string) => {
    setValidateError(null);
    try { await onInitiateRemoval(chefId); }
    catch (err: any) { setValidateError(err.message ?? 'Could not validate removal.'); }
  }, [onInitiateRemoval]);

  const handleRemoveConfirm = useCallback(async () => {
    if (isConfirmingRemoval) return;
    setRemoveError(null);
    try { await onConfirmRemoval(); }
    catch (err: any) { setRemoveError(err.message ?? 'Removal failed. Please try again.'); }
  }, [isConfirmingRemoval, onConfirmRemoval]);

  const handleRemoveCancel = useCallback(() => {
    if (isConfirmingRemoval) return;
    setRemoveError(null); onCancelRemoval();
  }, [isConfirmingRemoval, onCancelRemoval]);

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '0.4rem', color: '#f1f5f9',
    fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: '#94a3b8',
    marginBottom: '0.3rem', display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      <ChefStations
        staff={allStaff}
        onRemoveChef={handleRemoveRequest}
        onActivateChef={handleActivateRequest}
        removingId={isValidatingRemoval ? removalTargetId : null}
        activatingId={activatingChefId}
      />

      {/* ── Add Chef button ── */}
      <button
        onClick={handleAddChefOpen}
        style={{
          width: '100%', padding: '0.5rem',
          background: 'rgba(99,102,241,0.12)',
          border: '1px dashed rgba(99,102,241,0.4)',
          borderRadius: '0.5rem', color: '#a5b4fc',
          fontSize: '0.8rem', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
      >
        + Add Chef
      </button>

      {validateError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '0.4rem', padding: '0.6rem 0.875rem',
          color: '#f87171', fontSize: '0.78rem', lineHeight: 1.5,
        }}>
          ⚠️ {validateError}
        </div>
      )}

      {/* ── Add Chef Modal ── */}
      {showAddChef && (
        <div style={MODAL_BACKDROP} onClick={e => { if (e.target === e.currentTarget) handleAddChefClose(); }}>
          <div className="staff-modal" style={{ width: 'min(360px, 92vw)' }}>
            <h3 className="staff-modal__title">👨‍🍳 Add New Chef</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Name */}
              <div>
                <label style={labelStyle}>Chef Name *</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="e.g. Ravi Kumar"
                  value={addChefName}
                  onChange={e => setAddChefName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChefSubmit()}
                  autoFocus
                  maxLength={50}
                />
              </div>

              {/* Max concurrent orders */}
              <div>
                <label style={labelStyle}>Max Concurrent Orders</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
                    type="number"
                    min={1} max={10}
                    value={addChefSlots}
                    onChange={e => setAddChefSlots(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    dishes this chef can cook at once
                  </span>
                </div>
              </div>

              {/* Status */}
              {/* FIX: buttons now set addChefStatus to 'ACTIVE' or 'BACKUP' (string literals)
                  instead of a boolean. This maps directly to the backend StaffStatus enum. */}
              <div>
                <label style={labelStyle}>Starting Status</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['ACTIVE', 'BACKUP'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setAddChefStatus(s)}
                      style={{
                        flex: 1, padding: '0.45rem',
                        borderRadius: '0.375rem',
                        border: addChefStatus === s
                          ? `1px solid ${s === 'ACTIVE' ? '#4ade80' : '#fb923c'}`
                          : '1px solid rgba(255,255,255,0.1)',
                        background: addChefStatus === s
                          ? s === 'ACTIVE' ? 'rgba(74,222,128,0.12)' : 'rgba(251,146,60,0.12)'
                          : 'rgba(255,255,255,0.04)',
                        color: addChefStatus === s
                          ? s === 'ACTIVE' ? '#4ade80' : '#fb923c'
                          : '#94a3b8',
                        fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {s === 'ACTIVE' ? '✅ Active (on shift)' : '💤 Backup (standby)'}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.35rem' }}>
                  {addChefStatus === 'ACTIVE'
                    ? 'Chef will immediately start taking orders.'
                    : 'Chef will be on standby. Activate when kitchen gets busy.'}
                </p>
              </div>

            </div>

            {addChefError && (
              <div className="staff-modal__error" style={{ marginTop: '0.75rem' }}>
                ⚠️ {addChefError}
              </div>
            )}

            <div className="staff-modal__actions" style={{ marginTop: '1rem' }}>
              <button
                className="staff-modal__btn staff-modal__btn--cancel"
                onClick={handleAddChefClose}
                disabled={isAddingChef}
              >
                Cancel
              </button>
              <button
                className="staff-modal__btn staff-modal__btn--confirm-activate"
                onClick={handleAddChefSubmit}
                disabled={isAddingChef || !addChefName.trim()}
              >
                {isAddingChef ? 'Adding…' : 'Add Chef'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Activate Modal ── */}
      {activateCandidate && (
        <div style={MODAL_BACKDROP} onClick={e => { if (e.target === e.currentTarget) handleActivateCancel(); }}>
          <div className="staff-modal">
            <h3 className="staff-modal__title">Activate {activateCandidate.name}?</h3>
            <div className="staff-modal__info staff-modal__info--success">
              <div>✅ <strong>{activateCandidate.name}</strong> will move from <em>backup</em> to <em>active</em> immediately.</div>
              <div>📈 Capacity: <strong className="staff-modal__value--neutral">{currentCapacity}</strong>{' → '}<strong className="staff-modal__value--positive">{projectedActivateCapacity}</strong> concurrent orders.</div>
              <div className="staff-modal__hint">Queued orders will be automatically assigned and moved to Cooking.</div>
            </div>
            {activateError && <div className="staff-modal__error">⚠️ {activateError}</div>}
            <div className="staff-modal__actions">
              <button className="staff-modal__btn staff-modal__btn--cancel" onClick={handleActivateCancel} disabled={isActivating}>Cancel</button>
              <button className="staff-modal__btn staff-modal__btn--confirm-activate" onClick={handleActivateConfirm} disabled={isActivating}>
                {isActivating ? 'Activating…' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Modal ── */}
      {removalValidation && (
        <div style={MODAL_BACKDROP} onClick={e => { if (e.target === e.currentTarget) handleRemoveCancel(); }}>
          <div className="staff-modal">
            <h3 className="staff-modal__title">Remove {removingChef?.name ?? 'staff'} from shift?</h3>
            {removalValidation.blocked && (
              <div className="staff-modal__info staff-modal__info--blocked">🚫 {removalValidation.blockReason}</div>
            )}
            {!removalValidation.blocked && (
              <div className="staff-modal__info staff-modal__info--warning">
                {removalValidation.ordersToReassign > 0 && (
                  <div>⚠️ <strong className="staff-modal__value--warn">{removalValidation.ordersToReassign} active order{removalValidation.ordersToReassign !== 1 ? 's' : ''}</strong> will be auto-reassigned{removalValidation.estimatedDelayMinutes > 0 && <span className="staff-modal__hint"> (~{removalValidation.estimatedDelayMinutes} min delay)</span>}.</div>
                )}
                <div>📉 Capacity: <strong className="staff-modal__value--warn">{currentCapacity}</strong>{' → '}<strong className="staff-modal__value--danger">{removalValidation.newCapacity}</strong> concurrent orders.</div>
                {removalValidation.ordersToThrottle > 0 && (
                  <div>🛑 <strong className="staff-modal__value--danger">{removalValidation.ordersToThrottle} queued order{removalValidation.ordersToThrottle !== 1 ? 's' : ''}</strong> will be delayed.</div>
                )}
                {removalValidation.ordersToReassign === 0 && removalValidation.ordersToThrottle === 0 && (
                  <div className="staff-modal__hint">No active orders affected. Safe to remove.</div>
                )}
              </div>
            )}
            {removeError && <div className="staff-modal__error">⚠️ {removeError}</div>}
            <div className="staff-modal__actions">
              <button className="staff-modal__btn staff-modal__btn--cancel" onClick={handleRemoveCancel} disabled={isConfirmingRemoval}>Cancel</button>
              {!removalValidation.blocked && (
                <button className="staff-modal__btn staff-modal__btn--confirm-remove" onClick={handleRemoveConfirm} disabled={isConfirmingRemoval}>
                  {isConfirmingRemoval ? 'Removing…' : 'Confirm & Reassign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default StaffController;