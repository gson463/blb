/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const leasesCol = app.findCollectionByNameOrId('leases');

  const collection = new Collection({
    createRule: '',
    deleteRule: null,
    fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'textlrsid',
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
        id: 'rellrslease',
        name: 'lease_id',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'relation',
        cascadeDelete: true,
        collectionId: leasesCol.id,
        displayFields: [],
        maxSelect: 1,
        minSelect: 0,
      },
      {
        hidden: false,
        id: 'sellrskind',
        name: 'reminder_kind',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'select',
        maxSelect: 1,
        values: ['15d', '5d'],
      },
      {
        hidden: false,
        id: 'adlrscreated',
        name: 'created',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: 'autodate',
      },
    ],
    id: 'pbc_lease_reminder_sends',
    indexes: [],
    listRule: null,
    name: 'lease_reminder_sends',
    system: false,
    type: 'base',
    updateRule: null,
    viewRule: null,
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes('Collection name must be unique')) return;
    throw e;
  }
}, (app) => {
  try {
    return app.delete(app.findCollectionByNameOrId('lease_reminder_sends'));
  } catch (e) {
    if (e.message.includes('no rows in result set')) return;
    throw e;
  }
});
