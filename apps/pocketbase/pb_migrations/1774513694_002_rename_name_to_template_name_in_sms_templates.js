/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  const field = collection.fields.getByName("name");
  field.name = "template_name";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  const field = collection.fields.getByName("template_name");
  field.name = "name";
  return app.save(collection);
})
