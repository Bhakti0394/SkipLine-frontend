// ============================================================
// REPLACE: src/components/KitchenDashboard/dashboard/CapacityMeter.tsx
// Reads capacity from the store — never derives it locally.
// ============================================================

import React, { memo } from "react";
import {
  useKitchenBoard,
  selectCapacity,
  selectStaff,
} from "../../../kitchen-hooks/useKitchenBoard";

export const CapacityMeter: React.FC = memo(() => {
  const cap   = useKitchenBoard(selectCapacity);
  const staff = useKitchenBoard(selectStaff);

  const setActive = useKitchenBoard((s) => s.setStaffActive);
  const setSlots  = useKitchenBoard((s) => s.setStaffSlots);

  const ringColor =
    cap.capacityPct >= 100
      ? "#ef4444"
      : cap.capacityPct >= 80
      ? "#f97316"
      : "#22c55e";

  const circumference = 2 * Math.PI * 45; // r=45
  const strokeDash = (cap.capacityPct / 100) * circumference;

  return (
    <div className="capacity-meter">
      {/* Ring */}
      <svg width="120" height="120" className="capacity-meter__ring">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="45"
          fill="none"
          stroke={ringColor}
          strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 0.4s ease" }}
        />
        <text x="60" y="65" textAnchor="middle" fontSize="18" fontWeight="700" fill={ringColor}>
          {cap.capacityPct}%
        </text>
      </svg>

      <p className="capacity-meter__label">
        {cap.cookingCount} / {cap.totalSlots} slots
      </p>

      {cap.isOverloaded && (
        <div className="capacity-meter__overload-badge">⚠ OVERLOADED</div>
      )}

      {/* Staff list */}
      <div className="capacity-meter__staff">
        {staff.map((s) => (
          <div key={s.id} className="capacity-meter__staff-row">
            <span className={s.active ? "active" : "inactive"}>{s.name}</span>

            <label className="capacity-meter__toggle">
              <input
                type="checkbox"
                checked={s.active}
                onChange={(e) => setActive(s.id, e.target.checked)}
              />
              Active
            </label>

            <select
              value={s.slotCount}
              onChange={(e) => setSlots(s.id, Number(e.target.value))}
              disabled={!s.active}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n} slots</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
});

export default CapacityMeter;