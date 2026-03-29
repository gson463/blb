/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Fetch related collections to get their IDs
  const invoicesCollection = app.findCollectionByNameOrId("invoices");
  const tenantsCollection = app.findCollectionByNameOrId("tenants");
  const unitsCollection = app.findCollectionByNameOrId("units");
  const propertiesCollection = app.findCollectionByNameOrId("properties");

  const collection = new Collection({
    "createRule": "@request.auth.role = \"landlord\" || @request.auth.role = \"manager\" || @request.auth.role = \"collector\" || tenant_id.user_id = @request.auth.id",
    "deleteRule": "property_id.landlord_id = @request.auth.id",
    "fields":     [
          {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text5070360370",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
          },
          {
                "hidden": false,
                "id": "relation8109053059",
                "name": "invoice_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": invoicesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "relation2061287851",
                "name": "tenant_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": tenantsCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "relation6421816655",
                "name": "unit_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": unitsCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "relation8968418400",
                "name": "property_id",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "relation",
                "cascadeDelete": false,
                "collectionId": propertiesCollection.id,
                "displayFields": [],
                "maxSelect": 1,
                "minSelect": 0
          },
          {
                "hidden": false,
                "id": "number0398137306",
                "name": "amount",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "number",
                "max": null,
                "min": 0,
                "onlyInt": false
          },
          {
                "hidden": false,
                "id": "date0721046859",
                "name": "payment_date",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "date",
                "max": "",
                "min": ""
          },
          {
                "hidden": false,
                "id": "file5334752938",
                "name": "receipt_file",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "file",
                "maxSelect": 1,
                "maxSize": 20971520,
                "mimeTypes": [
                      "image/jpeg",
                      "image/png",
                      "image/gif",
                      "image/webp",
                      "application/pdf"
                ],
                "thumbs": []
          },
          {
                "hidden": false,
                "id": "select5390601977",
                "name": "status",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "select",
                "maxSelect": 1,
                "values": [
                      "Pending Approval",
                      "Approved",
                      "Rejected"
                ]
          },
          {
                "hidden": false,
                "id": "text1060893071",
                "name": "approved_by",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "date6473330102",
                "name": "approval_date",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "date",
                "max": "",
                "min": ""
          },
          {
                "hidden": false,
                "id": "text2306451243",
                "name": "rejection_reason",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text",
                "autogeneratePattern": "",
                "max": 0,
                "min": 0,
                "pattern": ""
          },
          {
                "hidden": false,
                "id": "autodate4053816987",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
          },
          {
                "hidden": false,
                "id": "autodate2458947707",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
          }
    ],
    "id": "pbc_5261540290",
    "indexes": [],
    "listRule": "property_id.landlord_id = @request.auth.id || @request.auth.role = \"manager\" || @request.auth.role = \"accountant\" || @request.auth.role = \"collector\" || tenant_id.user_id = @request.auth.id",
    "name": "payments",
    "system": false,
    "type": "base",
    "updateRule": "property_id.landlord_id = @request.auth.id || @request.auth.role = \"accountant\"",
    "viewRule": "property_id.landlord_id = @request.auth.id || @request.auth.role = \"manager\" || @request.auth.role = \"accountant\" || @request.auth.role = \"collector\" || tenant_id.user_id = @request.auth.id"
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("Collection already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_5261540290");
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})
