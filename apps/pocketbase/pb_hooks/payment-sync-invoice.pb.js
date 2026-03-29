/// <reference path="../pb_data/types.d.ts" />
/**
 * Tenant API rules allow creating payments but not updating invoices.
 * After a payment is saved (e.g. receipt upload), sync the linked invoice to Pending Approval.
 */
onRecordAfterCreateSuccess((e) => {
  const payment = e.record;
  if (payment.getString('status') !== 'Pending Approval') {
    e.next();
    return;
  }
  const invoiceId = payment.getString('invoice_id');
  if (!invoiceId) {
    e.next();
    return;
  }
  try {
    const invoice = $app.findRecordById('invoices', invoiceId);
    const st = invoice.getString('status');
    if (st === 'Unpaid') {
      invoice.set('status', 'Pending Approval');
      $app.save(invoice);
    }
  } catch (err) {
    $app.logger().error(
      'payment-sync-invoice: failed to update invoice — ' + String(err),
      'error'
    );
  }
  e.next();
}, 'payments');
