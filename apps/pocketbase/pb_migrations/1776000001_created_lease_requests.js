/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const leasesCol = app.findCollectionByNameOrId('leases');
  const tenantsCol = app.findCollectionByNameOrId('tenants');
  const propertiesCol = app.findCollectionByNameOrId('properties');

  const collection = new Collection({
    createRule: 'tenant_id.user_id = @request.auth.id',
    deleteRule: 'property_id.landlord_id = @request.auth.id',
    updateRule: 'property_id.landlord_id = @request.auth.id || @request.auth.role = "manager"',
    fields: [
      {
        autogeneratePattern: '[a-z0-9]{15}',
        hidden: false,
        id: 'textlrqid',
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
        id: 'rellrqlease',
        name: 'lease_id',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'relation',
        cascadeDelete: false,
        collectionId: leasesCol.id,
        displayFields: [],
        maxSelect: 1,
        minSelect: 0,
      },
      {
        hidden: false,
        id: 'rellrqtenant',
        name: 'tenant_id',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'relation',
        cascadeDelete: false,
        collectionId: tenantsCol.id,
        displayFields: [],
        maxSelect: 1,
        minSelect: 0,
      },
      {
        hidden: false,
        id: 'rellrqprop',
        name: 'property_id',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'relation',
        cascadeDelete: false,
        collectionId: propertiesCol.id,
        displayFields: [],
        maxSelect: 1,
        minSelect: 0,
      },
      {
        hidden: false,
        id: 'sellrqtype',
        name: 'request_type',
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: 'select',
        maxSelect: 1,
        values: ['early_termination', 'non_renewal'],
      },
      {
        hidden: false,
        id: 'textlrqnotes',
        name: 'notes',
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
        id: 'sellrqstatus',
        name: 'status',
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: 'select',
        maxSelect: 1,
        values: ['pending', 'acknowledged', 'cancelled'],
      },
      {
        hidden: false,
        id: 'adlrqcreated',
        name: 'created',
        onCreate: true,
        onUpdate: false,
        presentable: false,
        system: false,
        type: 'autodate',
      },
      {
        hidden: false,
        id: 'adlrqupdated',
        name: 'updated',
        onCreate: true,
        onUpdate: true,
        presentable: false,
        system: false,
        type: 'autodate',
      },
    ],
    id: 'pbc_lease_requests_01',
    indexes: [],
    listRule:
      'property_id.landlord_id = @request.auth.id || @request.auth.role = "manager" || tenant_id.user_id = @request.auth.id',
    name: 'lease_requests',
    system: false,
    type: 'base',
    viewRule:
      'property_id.landlord_id = @request.auth.id || @request.auth.role = "manager" || tenant_id.user_id = @request.auth.id',
  });

  try {
    return app.save(collection);
  } catch (e) {
    if (e.message.includes('Collection name must be unique')) {
      console.log('lease_requests already exists');
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId('lease_requests');
    return app.delete(collection);
  } catch (e) {
    if (e.message.includes('no rows in result set')) return;
    throw e;
  }
});
