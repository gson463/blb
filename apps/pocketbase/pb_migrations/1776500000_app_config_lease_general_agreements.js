/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const col = app.findCollectionByNameOrId('app_config');

  if (!col.fields.getByName('lease_general_agreements')) {
    col.fields.add(
      new TextField({
        name: 'lease_general_agreements',
        required: false,
        max: 0,
      })
    );
  }

  return app.save(col);
}, (app) => {
  const col = app.findCollectionByNameOrId('app_config');
  try {
    col.fields.removeByName('lease_general_agreements');
  } catch (_) {}
  return app.save(col);
});
