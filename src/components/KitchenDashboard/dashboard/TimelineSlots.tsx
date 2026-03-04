import { TimeSlot } from '../../../kitchen-types/order';
import '../styles/Timelineslots.scss';

interface TimelineSlotsProps {
  slots: TimeSlot[];
}

export function TimelineSlots({ slots }: TimelineSlotsProps) {
  return (
    <div className="timeline-slots">
      <h3 className="timeline-slots__title">Pickup Timeline</h3>
      
      <div className="timeline-slots__list">
        {slots.map((slot, index) => {
          const fillPercentage = (slot.orders / slot.capacity) * 100;
          const isFull = slot.orders >= slot.capacity;
          const isNearFull = fillPercentage >= 80;
          
          // Determine status class
          let statusClass = '';
          if (isFull) {
            statusClass = 'timeline-slots__slot--full';
          } else if (isNearFull) {
            statusClass = 'timeline-slots__slot--near-full';
          }
             
          return (
            <div 
              key={slot.time} 
              className={`timeline-slots__slot ${statusClass}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Slot Header - Time and Count */}
              <div className="timeline-slots__slot-header">
                <span className="timeline-slots__slot-time">{slot.time}</span>
                <span className={`timeline-slots__slot-count ${statusClass ? statusClass + '-text' : ''}`}>
                  {slot.orders}/{slot.capacity} orders
                </span>
              </div>
              
              {/* Progress Bar */}
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

      {/* Legend */}
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