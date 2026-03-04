// src/components/KitchenDashboard/dashboard/StaffController.tsx
//
// Wraps ChefStations and owns both modals:
//   - ❌ Remove confirmation modal  (ACTIVE → BACKUP)
//   - ✅ Activate confirmation modal (BACKUP → ACTIVE)

import { useState } from 'react';
import { StaffWorkloadDto, StaffRemovalValidationDto } from '../../../kitchen-api/kitchenApi';
import { ChefStations } from './ChefStations';

interface StaffControllerProps {
  allStaff: StaffWorkloadDto[];
  capacityPercent: number;
  onInitiateRemoval: (chefId: string) => Promise<StaffRemovalValidationDto>;
  onConfirmRemoval: () => Promise<void>;
  onCancelRemoval: () => void;
  onActivateChef: (chefId: string) => Promise<void>;
  removalValidation: StaffRemovalValidationDto | null;
  removalTargetId: string | null;
  isValidating: boolean;
  isConfirming: boolean;
  activatingChefId: string | null;
}

export function StaffController({
  allStaff,
  onInitiateRemoval,
  onConfirmRemoval,
  onCancelRemoval,
  onActivateChef,
  removalValidation,
  removalTargetId,
  isValidating,
  isConfirming,
  activatingChefId,
}: StaffControllerProps) {

  // ── Activate confirmation modal state ─────────────────────────────────────
  const [activateTargetId, setActivateTargetId]   = useState<string | null>(null);
  const [isActivating, setIsActivating]           = useState(false);

  const activateCandidate = activateTargetId
    ? allStaff.find(s => s.chefId === activateTargetId)
    : null;

  const activeStaff     = allStaff.filter(s => s.onShift);
  const currentCapacity = activeStaff.reduce((sum, s) => sum + s.maxCapacity, 0);
  const removingChef    = removalTargetId ? allStaff.find(s => s.chefId === removalTargetId) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Called by ChefStations [Activate] button — shows confirmation modal. */
  const handleActivateRequest = (chefId: string) => {
    setActivateTargetId(chefId);
  };

  /** Confirmed in modal — calls real activation. */
  const handleActivateConfirm = async () => {
    if (!activateTargetId) return;
    setIsActivating(true);
    try {
      await onActivateChef(activateTargetId);
    } finally {
      setIsActivating(false);
      setActivateTargetId(null);
    }
  };

  const handleActivateCancel = () => {
    setActivateTargetId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ── ChefStations ─────────────────────────────────────────────────── */}
      <ChefStations
        staff={allStaff}
        onToggleActive={chefId => onInitiateRemoval(chefId).catch(console.error)}
        onActivateChef={handleActivateRequest}   // opens confirm modal first
        isValidating={isValidating}
        validatingId={isValidating ? removalTargetId : null}
        activatingId={activatingChefId}
      />

      {/* ── Activate Confirmation Modal ───────────────────────────────────── */}
      {activateCandidate && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) handleActivateCancel(); }}
        >
          <div style={{
            background: '#16161e', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem', padding: '1.5rem',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', margin: '0 0 1rem 0' }}>
              Activate {activateCandidate.name}?
            </h3>

            <div style={{
              background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.22)',
              borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem',
              fontSize: '0.81rem', color: '#cbd5e1',
              display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: 1.55,
            }}>
              <div>
                ✅ <strong style={{ color: '#34d399' }}>{activateCandidate.name}</strong> will move
                from <em>backup</em> to <em>active</em> immediately.
              </div>
              <div>
                📈 Capacity: <strong style={{ color: '#94a3b8' }}>{currentCapacity}</strong>
                {' → '}
                <strong style={{ color: '#34d399' }}>
                  {currentCapacity + activateCandidate.maxCapacity}
                </strong> concurrent orders.
              </div>
              <div style={{ color: '#64748b', fontSize: '0.76rem' }}>
                Queued orders will be automatically assigned and moved to Cooking.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleActivateCancel} disabled={isActivating}
                style={{
                  padding: '0.5rem 1.125rem', borderRadius: '0.4rem',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: '#94a3b8',
                  cursor: isActivating ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleActivateConfirm} disabled={isActivating}
                style={{
                  padding: '0.5rem 1.125rem', borderRadius: '0.4rem', border: 'none',
                  background: isActivating ? 'rgba(16,185,129,0.4)' : '#10b981',
                  color: '#fff', cursor: isActivating ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '0.82rem',
                }}
              >
                {isActivating ? 'Activating…' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ─────────────────────────────────────── */}
      {removalValidation && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) onCancelRemoval(); }}
        >
          <div style={{
            background: '#16161e', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.875rem', padding: '1.5rem',
            width: '100%', maxWidth: '420px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
          }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem', margin: '0 0 1rem 0' }}>
              Remove {removingChef?.name ?? 'staff'} from shift?
            </h3>

            {/* Hard blocked */}
            {removalValidation.blocked && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '0.5rem', padding: '0.75rem 1rem',
                color: '#f87171', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '1.25rem',
              }}>
                🚫 {removalValidation.blockReason}
              </div>
            )}

            {/* Impact summary */}
            {!removalValidation.blocked && (
              <div style={{
                background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)',
                borderRadius: '0.5rem', padding: '0.875rem 1rem', marginBottom: '1.25rem',
                fontSize: '0.81rem', color: '#cbd5e1',
                display: 'flex', flexDirection: 'column', gap: '0.5rem', lineHeight: 1.55,
              }}>
                {removalValidation.ordersToReassign > 0 && (
                  <div>
                    ⚠️ <strong style={{ color: '#fbbf24' }}>
                      {removalValidation.ordersToReassign} active order
                      {removalValidation.ordersToReassign !== 1 ? 's' : ''}
                    </strong> will be auto-reassigned
                    {removalValidation.estimatedDelayMinutes > 0 && (
                      <span style={{ color: '#94a3b8' }}> (~{removalValidation.estimatedDelayMinutes} min delay)</span>
                    )}.
                  </div>
                )}
                <div>
                  📉 Capacity: <strong style={{ color: '#fbbf24' }}>{currentCapacity}</strong>
                  {' → '}
                  <strong style={{ color: '#f87171' }}>{removalValidation.newCapacity}</strong> concurrent orders.
                </div>
                {removalValidation.ordersToThrottle > 0 && (
                  <div>
                    🛑 <strong style={{ color: '#f87171' }}>
                      {removalValidation.ordersToThrottle} queued order
                      {removalValidation.ordersToThrottle !== 1 ? 's' : ''}
                    </strong> will be delayed.
                  </div>
                )}
                {removalValidation.ordersToReassign === 0 && removalValidation.ordersToThrottle === 0 && (
                  <div style={{ color: '#64748b' }}>No active orders affected. Safe to remove.</div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onCancelRemoval} disabled={isConfirming}
                style={{
                  padding: '0.5rem 1.125rem', borderRadius: '0.4rem',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent', color: '#94a3b8',
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 500,
                }}
              >
                Cancel
              </button>
              {!removalValidation.blocked && (
                <button
                  onClick={onConfirmRemoval} disabled={isConfirming}
                  style={{
                    padding: '0.5rem 1.125rem', borderRadius: '0.4rem', border: 'none',
                    background: isConfirming ? 'rgba(239,68,68,0.45)' : '#ef4444',
                    color: '#fff', cursor: isConfirming ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '0.82rem',
                  }}
                >
                  {isConfirming ? 'Removing…' : 'Confirm & Reassign'}
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