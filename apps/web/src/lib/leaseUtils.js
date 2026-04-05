const EAT = 'Africa/Nairobi';

function todayDateStringEAT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: EAT });
}

function endCalendarDay(endDate) {
  return String(endDate).slice(0, 10);
}

export const calculateLeaseStatus = (endDate) => {
  if (!endDate) return 'Unknown';
  const end = endCalendarDay(endDate);
  const today = todayDateStringEAT();
  return end < today ? 'Expired' : 'Active';
};

export const getDaysUntilExpiry = (endDate) => {
  if (!endDate) return 0;
  const end = endCalendarDay(endDate);
  const today = todayDateStringEAT();
  const t0 = new Date(`${today}T12:00:00+03:00`);
  const t1 = new Date(`${end}T12:00:00+03:00`);
  return Math.ceil((t1 - t0) / (1000 * 60 * 60 * 24));
};

export const generateLeaseNumber = () => {
  const d = new Date();
  const ymd = d.toLocaleDateString('sv-SE', { timeZone: EAT });
  const y = ymd.slice(0, 4);
  const m = ymd.slice(5, 7);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LSE-${y}${m}-${random}`;
};
