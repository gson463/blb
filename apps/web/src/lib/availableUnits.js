import { buildUnitsFilter } from '@/lib/staffDataScope';

/**
 * Units the landlord can assign when creating or editing a tenant:
 * - Only **Vacant** units (by `units.status`).
 * - When editing, `editingUnitId` is always included so the tenant's current unit stays selectable.
 */
export async function fetchAvailableUnitsForAssignment(pb, currentUser, { editingUnitId } = {}) {
  const scope = buildUnitsFilter(currentUser);
  const units = await pb.collection('units').getFullList({
    filter: `(${scope})`,
    expand: 'property_id',
    $autoCancel: false,
  });

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
    if (unit.status !== 'Vacant') {
      continue;
    }
    out.push({
      ...unit,
      availabilityLabel: 'Vacant',
      availabilityKind: 'vacant',
    });
  }
  return out;
}
