/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");

  const existing = collection.fields.getByName("variables");
  if (existing) {
    if (existing.type === "json") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("variables"); // exists with wrong type, remove first
  }

  collection.fields.add(new JSONField({
    name: "variables"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sms_templates");
  collection.fields.removeByName("variables");
  return app.save(collection);
})
