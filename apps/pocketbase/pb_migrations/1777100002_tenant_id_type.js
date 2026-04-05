/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const tenants = app.findCollectionByNameOrId('tenants');
  if (tenants.fields.getByName('id_type')) {
    return;
  }
  tenants.fields.add(
    new SelectField({
      name: 'id_type',
      required: false,
      values: [
        'nida',
        'passport_tz',
        'driving_license',
        'voter_id_nec',
        'tin_tra',
        'zanzibar_id',
        'birth_certificate',
        'refugee_id',
        'residence_permit',
        'other',
      ],
    })
  );
  return app.save(tenants);
}, (app) => {
  const tenants = app.findCollectionByNameOrId('tenants');
  if (!tenants.fields.getByName('id_type')) {
    return;
  }
  tenants.fields.removeByName('id_type');
  return app.save(tenants);
});
