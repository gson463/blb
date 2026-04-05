/** East Africa Time (GMT+3) — Tanzania / Kenya / etc. */

export const EAT_TIMEZONE = 'Africa/Nairobi';

/** YYYY-MM-DD for a calendar day in EAT (from a Date, default now). */
export function formatDateOnlyEAT(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: EAT_TIMEZONE });
}

/** Today’s date string in EAT (for default date inputs). */
export function todayDateStringEAT() {
  return formatDateOnlyEAT(new Date());
}

/**
 * Noon (12:00) on the given calendar day in EAT, ISO 8601 for PocketBase datetime fields.
 * @param {string} yyyyMmDd - from `<input type="date">` or YYYY-MM-DD
 */
export function dateAtNoonEAT(yyyyMmDd) {
  if (!yyyyMmDd) return '';
  const day = String(yyyyMmDd).split('T')[0].trim().slice(0, 10);
  return `${day}T12:00:00+03:00`;
}

/**
 * Current instant formatted as ISO 8601 with explicit +03:00 offset (EAT wall time).
 */
export function nowIsoEAT() {
  const d = new Date();
  const s = d.toLocaleString('sv-SE', { timeZone: EAT_TIMEZONE }).replace(' ', 'T');
  return `${s}+03:00`;
}
