import { addMonths, format, parseISO, subDays } from 'date-fns';

/**
 * Lease covers `periodMonths` full months from lease start (inclusive).
 * End date is the last calendar day of that span (e.g. Jan 1 + 6 months → Jun 30).
 */
export function computeLeaseEndYmdFromStart(leaseStartYmd, periodMonths) {
  if (!leaseStartYmd || !periodMonths || periodMonths < 1) return '';
  const ymd = String(leaseStartYmd).slice(0, 10);
  const start = parseISO(`${ymd}T12:00:00`);
  const end = subDays(addMonths(start, periodMonths), 1);
  return format(end, 'yyyy-MM-dd');
}
