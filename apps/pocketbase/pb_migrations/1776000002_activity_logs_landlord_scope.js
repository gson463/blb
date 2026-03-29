/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId('activity_logs');

  if (!collection.fields.getByName('landlord_id')) {
    collection.fields.add(
      new TextField({
        name: 'landlord_id',
        required: false,
        max: 30,
      })
    );
  }

  const staffSeeEmployerLogs =
    '(@request.auth.role = "staff" && landlord_id = @request.auth.employer_id)';
  collection.listRule = `user_id = @request.auth.id || landlord_id = @request.auth.id || ${staffSeeEmployerLogs}`;
  collection.viewRule = collection.listRule;

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId('activity_logs');
  try {
    collection.fields.removeByName('landlord_id');
  } catch (_) {}
  collection.listRule = 'user_id = @request.auth.id || @request.auth.role = "landlord"';
  collection.viewRule = 'user_id = @request.auth.id || @request.auth.role = "landlord"';
  return app.save(collection);
});
