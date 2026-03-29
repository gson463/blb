/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("staff_role");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("staff_role"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "staff_role",
    required: false,
    values: ["manager", "accountant", "collector"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("staff_role");
  return app.save(collection);
})
