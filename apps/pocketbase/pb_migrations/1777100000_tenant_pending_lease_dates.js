/// <reference path="../pb_data/types.d.ts" />
/**
 * Stores planned lease period until the first invoice is paid; then a hook creates the lease and clears these.
 */
migrate((app) => {
  const tenants = app.findCollectionByNameOrId('tenants');

  if (!tenants.fields.getByName('pending_lease_start')) {
    tenants.fields.add(
      new DateField({
        name: 'pending_lease_start',
        required: false,
      })
    );
  }
  if (!tenants.fields.getByName('pending_lease_end')) {
    tenants.fields.add(
      new DateField({
        name: 'pending_lease_end',
        required: false,
      })
    );
  }

  return app.save(tenants);
}, (app) => {
  const tenants = app.findCollectionByNameOrId('tenants');
  try {
    tenants.fields.removeByName('pending_lease_start');
  } catch (_) {}
  try {
    tenants.fields.removeByName('pending_lease_end');
  } catch (_) {}
  return app.save(tenants);
});
