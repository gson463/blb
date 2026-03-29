/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("staff_roles");

  const record0 = new Record(collection);
    record0.set("role_name", "manager");
    record0.set("description", "Property and staff management, can view all properties and manage units, tenants, and leases");
    record0.set("permissions", "{'properties': 'read,write', 'units': 'read,write', 'tenants': 'read,write', 'leases': 'read,write', 'invoices': 'read', 'payments': 'read', 'staff': 'read,write'}");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("role_name", "accountant");
    record1.set("description", "Financial management, can create and manage invoices, approve payments, and view financial reports");
    record1.set("permissions", "{'invoices': 'read,write', 'payments': 'read,write,approve', 'reports': 'read'}");
  try {
    app.save(record1);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record2 = new Record(collection);
    record2.set("role_name", "collector");
    record2.set("description", "Payment collection, can collect payments for assigned properties and view payment status");
    record2.set("permissions", "{'payments': 'read,write', 'invoices': 'read', 'assigned_properties': 'read'}");
  try {
    app.save(record2);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})
