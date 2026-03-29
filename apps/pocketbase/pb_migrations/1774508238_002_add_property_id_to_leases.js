/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const propertiesCollection = app.findCollectionByNameOrId("properties");
  const collection = app.findCollectionByNameOrId("leases");

  const existing = collection.fields.getByName("property_id");
  if (existing) {
    if (existing.type === "relation") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("property_id"); // exists with wrong type, remove first
  }

  collection.fields.add(new RelationField({
    name: "property_id",
    required: true,
    collectionId: propertiesCollection.id,
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("leases");
  collection.fields.removeByName("property_id");
  return app.save(collection);
})
