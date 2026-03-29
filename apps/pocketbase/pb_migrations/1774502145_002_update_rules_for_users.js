/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.listRule = "@request.auth.id != \"\" && @request.auth.role = \"landlord\"";
  collection.viewRule = "id = @request.auth.id || @request.auth.role = \"landlord\"";
  collection.createRule = "";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.createRule = "";
  collection.listRule = "id = @request.auth.id";
  collection.viewRule = "id = @request.auth.id";
  return app.save(collection);
})
