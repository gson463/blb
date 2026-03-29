/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  collection.fields.removeByName("trigger_days");
  return app.save(collection);
}, (app) => {

  const collection = app.findCollectionByNameOrId("sms_templates");
  collection.fields.add(new NumberField({
    name: "trigger_days",
    required: false
  }));
  return app.save(collection);
})
