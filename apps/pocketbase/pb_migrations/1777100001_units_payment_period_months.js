/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('units');
  collection.fields.add(
    new NumberField({
      name: 'payment_period_months',
      required: false,
      min: 1,
      max: 120,
      onlyInt: true,
    })
  );
  app.save(collection);

  const unitsCol = app.findCollectionByNameOrId('units');
  const records = app.findRecordsByFilter(unitsCol, '', '', 10000, 0);
  for (const r of records) {
    const v = r.get('payment_period_months');
    if (v == null || v === 0) {
      r.set('payment_period_months', 12);
      app.save(r);
    }
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId('units');
  collection.fields.removeByName('payment_period_months');
  return app.save(collection);
});
