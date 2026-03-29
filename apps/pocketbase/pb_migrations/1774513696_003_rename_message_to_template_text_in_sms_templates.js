/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  const field = collection.fields.getByName("message");
  field.name = "template_text";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  const field = collection.fields.getByName("template_text");
  field.name = "message";
  return app.save(collection);
})
