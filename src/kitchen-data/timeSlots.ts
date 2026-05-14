// Generates 48 slots covering a full 24-hour day (00:00 to 23:30, every 30 min)
function generate24HourSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const id    = `slot-${h * 2 + m / 30 + 1}`;
      const hh    = String(h).padStart(2, '0');
      const mm    = String(m).padStart(2, '0');
      const time  = `${hh}:${mm}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h < 12 ? 'AM' : 'PM';
      const label  = `${String(hour12).padStart(2, '0')}:${mm} ${period}`;
      slots.push({ id, time, label, capacity: 10, booked: 0 });
    }
  }
  return slots;
}

export const mockTimeSlots = generate24HourSlots();


