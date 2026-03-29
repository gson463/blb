/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("activity_logs");

  const existing = collection.fields.getByName("staff_id");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("staff_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "staff_id",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("activity_logs");
  collection.fields.removeByName("staff_id");
  return app.save(collection);
})
