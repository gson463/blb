/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  if (!users.fields.getByName("employer_id")) {
    users.fields.add(
      new RelationField({
        name: "employer_id",
        collectionId: users.id,
        maxSelect: 1,
        required: false,
      })
    );
    app.save(users);
  }

  const staffScopeProp =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && property_id.landlord_id = @request.auth.employer_id)';
  const staffMgrOnProp =
    '(@request.auth.role = "staff" && @request.auth.staff_role = "manager" && property_id.landlord_id = @request.auth.employer_id)';
  const staffAcctOnProp =
    '(@request.auth.role = "staff" && @request.auth.staff_role = "accountant" && property_id.landlord_id = @request.auth.employer_id)';
  const staffCollOnProp =
    '(@request.auth.role = "staff" && @request.auth.staff_role = "collector" && property_id.landlord_id = @request.auth.employer_id)';

  const staffScopeLandlord =
    '(@request.auth.role = "staff" && @request.auth.employer_id != "" && landlord_id = @request.auth.employer_id)';
  const staffMgrLandlord =
    '(@request.auth.role = "staff" && @request.auth.staff_role = "manager" && landlord_id = @request.auth.employer_id)';

  const tenantPath = "unit_id.property_id.landlord_id";

  // --- properties ---
  const properties = app.findCollectionByNameOrId("properties");
  properties.listRule = `landlord_id = @request.auth.id || ${staffScopeLandlord}`;
  properties.viewRule = properties.listRule;
  properties.createRule = `@request.auth.role = "landlord" || ${staffMgrLandlord}`;
  properties.updateRule = `landlord_id = @request.auth.id || ${staffMgrLandlord}`;
  properties.deleteRule = properties.updateRule;
  app.save(properties);

  // --- units ---
  const units = app.findCollectionByNameOrId("units");
  units.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp}`;
  units.viewRule = units.listRule;
  units.createRule = `@request.auth.role = "landlord" || ${staffMgrOnProp}`;
  units.updateRule = `property_id.landlord_id = @request.auth.id || ${staffMgrOnProp}`;
  units.deleteRule = units.updateRule;
  app.save(units);

  // --- tenants ---
  const tenants = app.findCollectionByNameOrId("tenants");
  tenants.listRule = `${tenantPath} = @request.auth.id || (@request.auth.role = "staff" && @request.auth.employer_id != "" && ${tenantPath} = @request.auth.employer_id) || user_id = @request.auth.id`;
  tenants.viewRule = tenants.listRule;
  tenants.createRule = `@request.auth.role = "landlord" || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && unit_id.property_id.landlord_id = @request.auth.employer_id)`;
  tenants.updateRule = `${tenantPath} = @request.auth.id || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && ${tenantPath} = @request.auth.employer_id)`;
  tenants.deleteRule = tenants.updateRule;
  app.save(tenants);

  // --- leases ---
  const leases = app.findCollectionByNameOrId("leases");
  leases.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp} || tenant_id.user_id = @request.auth.id`;
  leases.viewRule = leases.listRule;
  leases.createRule = `@request.auth.role = "landlord" || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && property_id.landlord_id = @request.auth.employer_id)`;
  leases.updateRule = `property_id.landlord_id = @request.auth.id || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && property_id.landlord_id = @request.auth.employer_id)`;
  leases.deleteRule = `property_id.landlord_id = @request.auth.id || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && property_id.landlord_id = @request.auth.employer_id)`;
  app.save(leases);

  // --- invoices ---
  const invoices = app.findCollectionByNameOrId("invoices");
  invoices.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp} || tenant_id.user_id = @request.auth.id`;
  invoices.viewRule = invoices.listRule;
  invoices.createRule = `@request.auth.role = "landlord" || (@request.auth.role = "staff" && (@request.auth.staff_role = "manager" || @request.auth.staff_role = "accountant") && property_id.landlord_id = @request.auth.employer_id)`;
  invoices.updateRule = `property_id.landlord_id = @request.auth.id || (@request.auth.role = "staff" && @request.auth.staff_role = "manager" && property_id.landlord_id = @request.auth.employer_id)`;
  invoices.deleteRule = `property_id.landlord_id = @request.auth.id`;
  app.save(invoices);

  // --- payments ---
  const payments = app.findCollectionByNameOrId("payments");
  payments.listRule = `property_id.landlord_id = @request.auth.id || ${staffScopeProp} || tenant_id.user_id = @request.auth.id`;
  payments.viewRule = payments.listRule;
  payments.createRule = `@request.auth.role = "landlord" || (@request.auth.role = "staff" && (@request.auth.staff_role = "manager" || @request.auth.staff_role = "collector") && property_id.landlord_id = @request.auth.employer_id) || tenant_id.user_id = @request.auth.id`;
  payments.updateRule = `property_id.landlord_id = @request.auth.id || ${staffAcctOnProp}`;
  payments.deleteRule = `property_id.landlord_id = @request.auth.id`;
  app.save(payments);

  // --- sms_templates ---
  const smsT = app.findCollectionByNameOrId("sms_templates");
  if (smsT) {
    smsT.listRule =
      '@request.auth.role = "landlord" || (@request.auth.role = "staff" && @request.auth.staff_role = "manager")';
    smsT.viewRule = smsT.listRule;
    app.save(smsT);
  }

  // --- activity_logs ---
  const logs = app.findCollectionByNameOrId("activity_logs");
  if (logs) {
    logs.listRule =
      'user_id = @request.auth.id || @request.auth.role = "landlord" || (@request.auth.role = "staff" && @request.auth.staff_role = "manager")';
    logs.viewRule = logs.listRule;
    app.save(logs);
  }

  const staffMgr = '(@request.auth.role = "staff" && @request.auth.staff_role = "manager")';
  const staffAcct = '(@request.auth.role = "staff" && @request.auth.staff_role = "accountant")';
  const staffColl = '(@request.auth.role = "staff" && @request.auth.staff_role = "collector")';

  const smsConfig = app.findCollectionByNameOrId("sms_config");
  if (smsConfig) {
    for (const k of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) {
      smsConfig[k] = staffMgr;
    }
    app.save(smsConfig);
  }

  const notif = app.findCollectionByNameOrId("notification_preferences");
  if (notif) {
    notif.deleteRule = `user_id = @request.auth.id || ${staffMgr}`;
    notif.listRule = `user_id = @request.auth.id || ${staffMgr}`;
    notif.updateRule = `user_id = @request.auth.id || ${staffMgr}`;
    notif.viewRule = notif.listRule;
    app.save(notif);
  }

  const smsAuto = app.findCollectionByNameOrId("sms_automation");
  if (smsAuto) {
    for (const k of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) {
      smsAuto[k] = staffMgr;
    }
    app.save(smsAuto);
  }

  const smsLogs = app.findCollectionByNameOrId("sms_logs");
  if (smsLogs) {
    smsLogs.createRule = `${staffMgr} || ${staffAcct} || ${staffColl}`;
    smsLogs.listRule = `${staffMgr} || ${staffAcct} || recipient_id = @request.auth.id`;
    smsLogs.viewRule = smsLogs.listRule;
    smsLogs.updateRule = staffMgr;
    smsLogs.deleteRule = staffMgr;
    app.save(smsLogs);
  }
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users.fields.getByName("employer_id")) {
    users.fields.removeByName("employer_id");
    app.save(users);
  }
});
