/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const col = app.findCollectionByNameOrId('app_config');

  if (!col.fields.getByName('system_name')) {
    col.fields.add(
      new TextField({
        name: 'system_name',
        required: false,
        max: 200,
      })
    );
  }
  if (!col.fields.getByName('logo')) {
    col.fields.add(
      new FileField({
        name: 'logo',
        maxSelect: 1,
        maxSize: 2097152,
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      })
    );
  }
  if (!col.fields.getByName('invoice_footer_text')) {
    col.fields.add(
      new TextField({
        name: 'invoice_footer_text',
        required: false,
      })
    );
  }
  if (!col.fields.getByName('receipt_footer_text')) {
    col.fields.add(
      new TextField({
        name: 'receipt_footer_text',
        required: false,
      })
    );
  }

  return app.save(col);
}, (app) => {
  const col = app.findCollectionByNameOrId('app_config');
  ['receipt_footer_text', 'invoice_footer_text', 'logo', 'system_name'].forEach((n) => {
    try {
      col.fields.removeByName(n);
    } catch (_) {}
  });
  return app.save(col);
});
