/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const propertiesCollection = app.findCollectionByNameOrId("properties");
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("assigned_properties");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("assigned_properties"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "assigned_properties",
    collectionId: propertiesCollection.id,
    maxSelect: 0
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("assigned_properties");
  return app.save(collection);
})
