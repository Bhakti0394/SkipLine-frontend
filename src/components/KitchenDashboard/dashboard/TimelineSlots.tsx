import { SlotCapacityDto } from '../../../kitchen-api/kitchenApi';
import '../styles/Timelineslots.scss';

interface TimelineSlotsProps {
  slots: SlotCapacityDto[];
}

function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function TimelineSlots({ slots }: TimelineSlotsProps) {
  // Only show future slots, up to next 6
  const now = Date.now();
  const upcomingSlots = slots
    .filter(s => new Date(s.slotTime).getTime() > now)
    .slice(0, 6);

  if (upcomingSlots.length === 0) {
    return (
      <div className="timeline-slots">
        <h3 className="timeline-slots__title">Pickup Timeline</h3>
        <p style={{ fontSize: '0.75rem', color: 'rgba(148,163,184,0.55)', padding: '0.5rem 0' }}>
          No upcoming pickup slots
        </p>
      </div>
    );
  }

  return (
    <div className="timeline-slots">
      <h3 className="timeline-slots__title">Pickup Timeline</h3>

      <div className="timeline-slots__list">
        {upcomingSlots.map((slot, index) => {
          const fillPercentage = slot.maxCapacity > 0
            ? Math.min(100, (slot.currentBookings / slot.maxCapacity) * 100)
            : 0;
          const isFull     = slot.remaining === 0;
          const isNearFull = !isFull && fillPercentage >= 80;

          const statusClass = isFull
            ? 'timeline-slots__slot--full'
            : isNearFull
            ? 'timeline-slots__slot--near-full'
            : '';

          return (
            <div
              key={slot.slotId}
              className={`timeline-slots__slot ${statusClass}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="timeline-slots__slot-header">
                <span className="timeline-slots__slot-time">
                  {formatSlotTime(slot.slotTime)}
                </span>
                <span className={`timeline-slots__slot-count ${statusClass ? statusClass + '-text' : ''}`}>
                  {slot.currentBookings}/{slot.maxCapacity} orders
                  {isFull && <span style={{ marginLeft: '0.25rem', fontSize: '0.6rem' }}>FULL</span>}
                </span>
              </div>

              <div className="timeline-slots__progress">
                <div
                  className={`timeline-slots__progress-bar ${statusClass ? statusClass + '-bar' : ''}`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="timeline-slots__legend">
        <span className="timeline-slots__legend-item">
          <span className="timeline-slots__legend-dot timeline-slots__legend-dot--available" />
          Available
        </span>
        <span className="timeline-slots__legend-item">
          <span className="timeline-slots__legend-dot timeline-slots__legend-dot--near-full" />
          Near Full
        </span>
        <span className="timeline-slots__legend-item">
          <span className="timeline-slots__legend-dot timeline-slots__legend-dot--full" />
          Full
        </span>
      </div>
    </div>
  );
}