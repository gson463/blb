/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    createRule: '@request.auth.role = "landlord"',
    deleteRule: '@request.auth.role = "landlord"',
    fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'text6176048066',
        max: 15,
        min: 15,
        name: 'id',
        pattern: '^[a-z0-9]+$',
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: 'text',
      },
      {
        hidden: false,
        id: 'textlandlordpubname',
        name: 'landlord_public_name',
        presentable: true,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
        autogeneratePattern: '',
        max: 200,
        min: 0,
        pattern: '',
      },
      {
        hidden: false,
        id: 'textcontactemail',
        name: 'contact_email',
        presentable: true,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
        autogeneratePattern: '',
        max: 200,
        min: 0,
        pattern: '',
      },
      {
        hidden: false,
        id: 'textcontactphone',
        name: 'contact_phone',
        presentable: true,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
        autogeneratePattern: '',
        max: 80,
        min: 0,
        pattern: '',
      },
      {
        hidden: false,
        id: 'texttenantguide',
        name: 'tenant_guide',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'text',
        autogeneratePattern: '',
        max: 0,
        min: 0,
        pattern: '',
      },
      {
        hidden: false,
        id: 'autodate7655544198',
        name: 'created',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: 'autodate',
      },
      {
        hidden: false,
        id: 'autodate1251933901',
        name: 'updated',
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: 'autodate',
      },
    ],
    id: 'pbc_3184729001',
    indexes: [],
    // Empty string = guests + authenticated users can list/view (public read for footer / guide)
    listRule: '',
    name: 'app_config',
    system: false,
    type: 'base',
    updateRule: '@request.auth.role = "landlord"',
    viewRule: '',
  });

  try {
    app.save(collection);
  } catch (e) {
    if (e.message.includes('Collection name must be unique')) {
      console.log('app_config collection already exists, skipping');
      return;
    }
    throw e;
  }

  const col = app.findCollectionByNameOrId('app_config');
  const existing = app.findRecordsByFilter(col, '', '', 1, 0);
  if (existing && existing.length > 0) {
    return;
  }

  const record = new Record(col);
  record.set('landlord_public_name', '');
  record.set('contact_email', '');
  record.set('contact_phone', '');
  record.set(
    'tenant_guide',
    [
      'How to use the tenant portal',
      '',
      '1. Sign in with the email and password your landlord created for you.',
      '2. Use Dashboard for an overview of your unit, lease, and payments.',
      '3. Open Invoices to see amounts due and due dates.',
      '4. Use Upload payment when you pay rent so your landlord can match your payment.',
      '5. Contact your landlord using the details shown in the footer of this site.',
      '',
      'Your landlord can change this text anytime in System configuration.',
    ].join('\n')
  );
  try {
    app.save(record);
  } catch (e) {
    console.log('app_config seed skipped:', e.message);
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('pbc_3184729001');
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes('no rows in result set')) {
      console.log('app_config collection not found, skipping revert');
      return;
    }
    throw e;
  }
});
