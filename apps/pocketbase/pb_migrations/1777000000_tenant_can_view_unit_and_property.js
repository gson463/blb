/// <reference path="../pb_data/types.d.ts" />
/**
 * Tenants could read their tenants record but not expand unit_id / property_id:
 * units.viewRule and properties.viewRule only allowed landlord/staff.
 * This adds access when the unit is assigned to this tenant (units.tenant_id = user id).
 */
migrate((app) => {
  const staffScopeProp =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && property_id.landlord_id = @request.auth.employer_id)';
  const staffScopeLandlord =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && landlord_id = @request.auth.employer_id)';

  const tenantOwnsUnit =
    '(@request.auth.role = "tenant" && tenant_id = @request.auth.id)';
  const tenantOwnsPropertyViaUnit =
    '(@request.auth.role = "tenant" && @collection.units.property_id = id && @collection.units.tenant_id = @request.auth.id)';

  const units = app.findCollectionByNameOrId('units');
  units.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp} || ${tenantOwnsUnit}`;
  units.viewRule = units.listRule;
  app.save(units);

  const properties = app.findCollectionByNameOrId('properties');
  properties.listRule = `landlord_id = @request.auth.id || ${staffScopeLandlord} || ${tenantOwnsPropertyViaUnit}`;
  properties.viewRule = properties.listRule;
  app.save(properties);
}, (app) => {
  const staffScopeProp =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && property_id.landlord_id = @request.auth.employer_id)';
  const staffScopeLandlord =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && landlord_id = @request.auth.employer_id)';

  const units = app.findCollectionByNameOrId('units');
  units.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp}`;
  units.viewRule = units.listRule;
  app.save(units);

  const properties = app.findCollectionByNameOrId('properties');
  properties.listRule = `landlord_id = @request.auth.id || ${staffScopeLandlord}`;
  properties.viewRule = properties.listRule;
  app.save(properties);
});
