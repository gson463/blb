/// <reference path="../pb_data/types.d.ts" />
/**
 * Ensure tenant-submitted lease requests match the lease and property.
 */
onRecordCreateRequest((e) => {
  if (e.collection.name !== 'lease_requests') {
    e.next();
    return;
  }
  const leaseId = e.record.getString('lease_id');
  const tenantId = e.record.getString('tenant_id');
  const propertyId = e.record.getString('property_id');
  const lease = $app.findRecordById('leases', leaseId);
  if (lease.getString('tenant_id') !== tenantId) {
    throw new ApiError(400, 'Lease does not match tenant.');
  }
  if (lease.getString('property_id') !== propertyId) {
    throw new ApiError(400, 'Property does not match lease.');
  }
  e.record.set('status', 'pending');
  e.next();
}, 'lease_requests');
