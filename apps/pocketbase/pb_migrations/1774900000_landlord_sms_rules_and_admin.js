/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const landlordOrMgr =
    '(@request.auth.role = "landlord" || (@request.auth.role = "staff" && @request.auth.staff_role = "manager"))';
  const staffAcct = '(@request.auth.role = "staff" && @request.auth.staff_role = "accountant")';
  const staffColl = '(@request.auth.role = "staff" && @request.auth.staff_role = "collector")';

  const smsConfig = app.findCollectionByNameOrId('sms_config');
  if (smsConfig) {
    for (const k of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
      smsConfig[k] = landlordOrMgr;
    }
    app.save(smsConfig);
  }

  const smsAuto = app.findCollectionByNameOrId('sms_automation');
  if (smsAuto) {
    for (const k of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
      smsAuto[k] = landlordOrMgr;
    }
    app.save(smsAuto);
  }

  const smsLogs = app.findCollectionByNameOrId('sms_logs');
  if (smsLogs) {
    smsLogs.createRule = `${landlordOrMgr} || ${staffAcct} || ${staffColl}`;
    smsLogs.listRule = `${landlordOrMgr} || ${staffAcct} || ${staffColl} || recipient_id = @request.auth.id`;
    smsLogs.viewRule = smsLogs.listRule;
    smsLogs.updateRule = landlordOrMgr;
    smsLogs.deleteRule = landlordOrMgr;
    app.save(smsLogs);
  }

  const notif = app.findCollectionByNameOrId('notification_preferences');
  if (notif) {
    notif.deleteRule = `user_id = @request.auth.id || ${landlordOrMgr}`;
    notif.listRule = `user_id = @request.auth.id || ${landlordOrMgr}`;
    notif.updateRule = `user_id = @request.auth.id || ${landlordOrMgr}`;
    notif.viewRule = notif.listRule;
    app.save(notif);
  }

  const usersCol = app.findCollectionByNameOrId('users');
  const existing = app.findRecordsByFilter(usersCol, 'email = "admin@belibeliltd.com"', '', 1, 0);
  if (existing && existing.length > 0) {
    return;
  }

  const record = new Record(usersCol);
  record.set('email', 'admin@belibeliltd.com');
  record.set('emailVisibility', true);
  record.set('name', 'Belibeli Admin');
  record.set('company_name', 'Belibeli Ltd');
  record.set('role', 'landlord');
  record.set('status', 'active');
  record.setPassword('Belibeli@2027');
  app.save(record);
}, (app) => {
  // no-op: do not delete admin on rollback
});
