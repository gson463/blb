import { buildUnitsFilter, buildLeasesFilter } from '@/lib/staffDataScope';

/**
 * Units the landlord can assign when creating a tenant:
 * - Vacant, OR
 * - Occupied but there is no lease for that unit with status Active and end_date >= today.
 * When editing, `editingUnitId` is always included so the current unit stays selectable.
 */
export async function fetchAvailableUnitsForAssignment(pb, currentUser, { editingUnitId } = {}) {
  const scope = buildUnitsFilter(currentUser);
  const units = await pb.collection('units').getFullList({
    filter: `(${scope})`,
    expand: 'property_id',
    $autoCancel: false,
  });

  const leases = await pb.collection('leases').getFullList({
    filter: buildLeasesFilter(currentUser),
    $autoCancel: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /** unit_id -> true if there is still an active (non-expired) lease on this unit */
  const unitHasActiveLease = new Map();
  for (const lease of leases) {
    if (lease.status !== 'Active') continue;
    const end = new Date(lease.end_date);
    end.setHours(0, 0, 0, 0);
    if (end < today) continue;
    unitHasActiveLease.set(lease.unit_id, true);
  }

  const out = [];
  for (const unit of units) {
    if (editingUnitId && unit.id === editingUnitId) {
      out.push({
        ...unit,
        availabilityLabel: 'Current assignment',
        availabilityKind: 'current',
      });
      continue;
    }
    if (unit.status === 'Vacant') {
      out.push({
        ...unit,
        availabilityLabel: 'Vacant',
        availabilityKind: 'vacant',
      });
      continue;
    }
    if (unitHasActiveLease.get(unit.id)) {
      continue;
    }
    out.push({
      ...unit,
      availabilityLabel: 'Lease ended — ready for new tenant',
      availabilityKind: 'lease_ended',
    });
  }
  return out;
}
