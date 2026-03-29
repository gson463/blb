/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("invoices");
  collection.indexes.push("CREATE UNIQUE INDEX idx_invoices_invoice_number ON invoices (invoice_number)");
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("invoices");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_invoices_invoice_number"));
  return app.save(collection);
})
