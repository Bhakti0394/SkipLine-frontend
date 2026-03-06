// ============================================================
// src/components/KitchenDashboard/dashboard/StaffController.tsx
// ============================================================
//
// Owns the remove/activate modal flow so ChefStations stays
// purely presentational. All prop names match useKitchenBoard
// exports exactly.

import { useState, useMemo, useCallback } from 'react';
import { StaffWorkloadDto, StaffRemovalValidationDto } from '../../../kitchen-api/kitchenApi';
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
}

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
}: StaffControllerProps) {

  const [activateTargetId, setActivateTargetId] = useState<string | null>(null);
  const [activateError,    setActivateError]    = useState<string | null>(null);
  const [isActivating,     setIsActivating]     = useState(false);
  const [removeError,      setRemoveError]      = useState<string | null>(null);
  const [validateError,    setValidateError]    = useState<string | null>(null);

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

  // ── Activate handlers ─────────────────────────────────────────────────────

  const handleActivateRequest = useCallback((chefId: string) => {
    setActivateTargetId(chefId);
    setActivateError(null);
  }, []);

  const handleActivateConfirm = useCallback(async () => {
    if (!activateTargetId || isActivating) return;
    setIsActivating(true);
    setActivateError(null);
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
    setActivateTargetId(null);
    setActivateError(null);
  }, [isActivating]);

  // ── Remove handlers ───────────────────────────────────────────────────────

  const handleRemoveRequest = useCallback(async (chefId: string) => {
    setValidateError(null);
    try {
      await onInitiateRemoval(chefId);
    } catch (err: any) {
      setValidateError(err.message ?? 'Could not validate removal. Please try again.');
    }
  }, [onInitiateRemoval]);

  const handleRemoveConfirm = useCallback(async () => {
    if (isConfirmingRemoval) return;
    setRemoveError(null);
    try {
      await onConfirmRemoval();
    } catch (err: any) {
      setRemoveError(err.message ?? 'Removal failed. Please try again.');
    }
  }, [isConfirmingRemoval, onConfirmRemoval]);

  const handleRemoveCancel = useCallback(() => {
    if (isConfirmingRemoval) return;
    setRemoveError(null);
    onCancelRemoval();
  }, [isConfirmingRemoval, onCancelRemoval]);

  const handleActivateBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleActivateCancel();
  }, [handleActivateCancel]);

  const handleRemoveBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleRemoveCancel();
  }, [handleRemoveCancel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ── ChefStations ── */}
      <ChefStations
        staff={allStaff}
        onRemoveChef={handleRemoveRequest}
        onActivateChef={handleActivateRequest}
        removingId={isValidatingRemoval ? removalTargetId : null}
        activatingId={activatingChefId}
      />

      {/* ── Inline validation error ── */}
      {validateError && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '0.4rem', padding: '0.6rem 0.875rem',
          color: '#f87171', fontSize: '0.78rem', lineHeight: 1.5,
        }}>
          ⚠️ {validateError}
        </div>
      )}

      {/* ── Activate Modal ── */}
      {activateCandidate && (
        <div className="staff-modal-backdrop" onClick={handleActivateBackdrop}>
          <div className="staff-modal">
            <h3 className="staff-modal__title">
              Activate {activateCandidate.name}?
            </h3>

            <div className="staff-modal__info staff-modal__info--success">
              <div>
                ✅ <strong>{activateCandidate.name}</strong> will move from{' '}
                <em>backup</em> to <em>active</em> immediately.
              </div>
              <div>
                📈 Capacity:{' '}
                <strong className="staff-modal__value--neutral">{currentCapacity}</strong>
                {' → '}
                <strong className="staff-modal__value--positive">{projectedActivateCapacity}</strong>
                {' '}concurrent orders.
              </div>
              <div className="staff-modal__hint">
                Queued orders will be automatically assigned and moved to Cooking.
              </div>
            </div>

            {activateError && (
              <div className="staff-modal__error">⚠️ {activateError}</div>
            )}

            <div className="staff-modal__actions">
              <button
                className="staff-modal__btn staff-modal__btn--cancel"
                onClick={handleActivateCancel}
                disabled={isActivating}
              >
                Cancel
              </button>
              <button
                className="staff-modal__btn staff-modal__btn--confirm-activate"
                onClick={handleActivateConfirm}
                disabled={isActivating}
              >
                {isActivating ? 'Activating…' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Modal ── */}
      {removalValidation && (
        <div className="staff-modal-backdrop" onClick={handleRemoveBackdrop}>
          <div className="staff-modal">
            <h3 className="staff-modal__title">
              Remove {removingChef?.name ?? 'staff'} from shift?
            </h3>

            {removalValidation.blocked && (
              <div className="staff-modal__info staff-modal__info--blocked">
                🚫 {removalValidation.blockReason}
              </div>
            )}

            {!removalValidation.blocked && (
              <div className="staff-modal__info staff-modal__info--warning">
                {removalValidation.ordersToReassign > 0 && (
                  <div>
                    ⚠️{' '}
                    <strong className="staff-modal__value--warn">
                      {removalValidation.ordersToReassign} active order
                      {removalValidation.ordersToReassign !== 1 ? 's' : ''}
                    </strong>{' '}
                    will be auto-reassigned
                    {removalValidation.estimatedDelayMinutes > 0 && (
                      <span className="staff-modal__hint">
                        {' '}(~{removalValidation.estimatedDelayMinutes} min delay)
                      </span>
                    )}.
                  </div>
                )}
                <div>
                  📉 Capacity:{' '}
                  <strong className="staff-modal__value--warn">{currentCapacity}</strong>
                  {' → '}
                  <strong className="staff-modal__value--danger">{removalValidation.newCapacity}</strong>
                  {' '}concurrent orders.
                </div>
                {removalValidation.ordersToThrottle > 0 && (
                  <div>
                    🛑{' '}
                    <strong className="staff-modal__value--danger">
                      {removalValidation.ordersToThrottle} queued order
                      {removalValidation.ordersToThrottle !== 1 ? 's' : ''}
                    </strong>{' '}
                    will be delayed.
                  </div>
                )}
                {removalValidation.ordersToReassign === 0 &&
                  removalValidation.ordersToThrottle === 0 && (
                  <div className="staff-modal__hint">
                    No active orders affected. Safe to remove.
                  </div>
                )}
              </div>
            )}

            {removeError && (
              <div className="staff-modal__error">⚠️ {removeError}</div>
            )}

            <div className="staff-modal__actions">
              <button
                className="staff-modal__btn staff-modal__btn--cancel"
                onClick={handleRemoveCancel}
                disabled={isConfirmingRemoval}
              >
                Cancel
              </button>
              {!removalValidation.blocked && (
                <button
                  className="staff-modal__btn staff-modal__btn--confirm-remove"
                  onClick={handleRemoveConfirm}
                  disabled={isConfirmingRemoval}
                >
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