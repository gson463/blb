/**
 * Landlord-scoped data access for landlord + staff users.
 * Staff must have employer_id (landlord user id). Collectors are limited to assigned_properties.
 */

export function getLandlordScopeId(user) {
  if (!user) return null;
  if (user.role === 'landlord') return user.id;
  if (user.role === 'staff' && user.employer_id) return user.employer_id;
  return null;
}

/** PocketBase filter for `properties` collection */
export function buildPropertiesFilter(user) {
  const lid = getLandlordScopeId(user);
  if (!lid) return 'id = ""';
  if (user.role === 'staff' && user.staff_role === 'collector' && user.assigned_properties?.length) {
    return user.assigned_properties.map((id) => `id = "${id}"`).join(' || ');
  }
  return `landlord_id = "${lid}"`;
}

/** For filters like property_id.landlord_id = ... */
export function buildPropertyLandlordNestedFilter(user) {
  const lid = getLandlordScopeId(user);
  if (!lid) return 'id = ""';
  if (user.role === 'staff' && user.staff_role === 'collector' && user.assigned_properties?.length) {
    return '(' + user.assigned_properties.map((id) => `property_id = "${id}"`).join(' || ') + ')';
  }
  return `property_id.landlord_id = "${lid}"`;
}

export function buildUnitsFilter(user) {
  const lid = getLandlordScopeId(user);
  if (!lid) return 'id = ""';
  if (user.role === 'staff' && user.staff_role === 'collector' && user.assigned_properties?.length) {
    return '(' + user.assigned_properties.map((id) => `property_id = "${id}"`).join(' || ') + ')';
  }
  return `property_id.landlord_id = "${lid}"`;
}

export function buildTenantsFilter(user) {
  const lid = getLandlordScopeId(user);
  if (!lid) return 'id = ""';
  if (user.role === 'staff' && user.staff_role === 'collector' && user.assigned_properties?.length) {
    return '(' + user.assigned_properties.map((id) => `unit_id.property_id = "${id}"`).join(' || ') + ')';
  }
  return `unit_id.property_id.landlord_id = "${lid}"`;
}

export function buildInvoicesFilter(user) {
  return buildPropertyLandlordNestedFilter(user);
}

export function buildLeasesFilter(user) {
  return buildPropertyLandlordNestedFilter(user);
}

export function buildPaymentsFilter(user) {
  return buildPropertyLandlordNestedFilter(user);
}

/** PocketBase filter for paginated invoice list with optional property + status */
export function buildInvoiceListFilter(user, propertyId, status) {
  let f = buildInvoicesFilter(user);
  if (propertyId && propertyId !== 'all') {
    f = `(${f}) && property_id = "${propertyId}"`;
  }
  if (status && status !== 'all') {
    f = `(${f}) && status = "${status}"`;
  }
  return f;
}

/** PocketBase filter for paginated lease list with optional property + status */
export function buildLeaseListFilter(user, propertyId, status) {
  let f = buildLeasesFilter(user);
  if (propertyId && propertyId !== 'all') {
    f = `(${f}) && property_id = "${propertyId}"`;
  }
  if (status && status !== 'all') {
    f = `(${f}) && status = "${status}"`;
  }
  return f;
}

/** landlord_id to attach when staff creates a property (must be employer) */
export function getPropertyOwnerId(user) {
  return getLandlordScopeId(user) || user?.id;
}

/** Pending lease requests badge / count — scoped to landlord or staff employer (and collector properties). */
export function buildPendingLeaseRequestsFilter(user) {
  const lid = getLandlordScopeId(user);
  if (!lid) return 'id = ""';
  if (user.role === 'staff' && user.staff_role === 'collector' && user.assigned_properties?.length) {
    const props = user.assigned_properties.map((id) => `property_id = "${id}"`).join(' || ');
    return `status = "pending" && (${props})`;
  }
  return `status = "pending" && property_id.landlord_id = "${lid}"`;
}
