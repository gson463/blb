import pb from '@/lib/pocketbaseClient';

/**
 * Records an activity for the landlord dashboard / activity log page.
 * @param {object} opts
 * @param {string} [opts.landlordId] - Required for tenant actions so the landlord can see the event.
 */
export async function logActivity({
  action,
  entity_type = '',
  entity_id = '',
  details = '',
  user = null,
  landlordId = '',
}) {
  const u = user || pb.authStore.model;
  if (!u?.id) return;
  const resolvedLandlord =
    landlordId ||
    (u.role === 'landlord'
      ? u.id
      : u.role === 'staff' && u.employer_id
        ? u.employer_id
        : '');
  const payload = {
    user_id: u.id,
    landlord_id: resolvedLandlord,
    staff_id: u.role === 'staff' ? u.id : '',
    action,
    entity_type,
    entity_id,
    details,
  };
  try {
    await pb.collection('activity_logs').create(payload, { $autoCancel: false });
  } catch (e) {
    console.warn('activity log skipped', e);
  }
}
