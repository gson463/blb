/// <reference path="../pb_data/types.d.ts" />
/**
 * When an invoice is saved with status "Paid", ensure a matching payment exists (Approved).
 * - If an approved payment already exists for the invoice → no-op (e.g. approval flow).
 * - If a pending payment exists → approve it and align amount/dates.
 * - Otherwise → create an approved payment (manual mark-paid, CSV import, etc.).
 */
function syncPaymentForPaidInvoice(invoice) {
  if (invoice.getString('status') !== 'Paid') return;

  const invoiceId = invoice.id;
  const payments = $app.findRecordsByFilter(
    'payments',
    `invoice_id = "${invoiceId}"`,
    '-created',
    80,
    0
  );

  let hasApproved = false;
  let pending = null;

  for (const p of payments) {
    const st = p.getString('status');
    if (st === 'Approved' || st === 'approved') {
      hasApproved = true;
      break;
    }
    if ((st === 'Pending Approval' || st === 'pending_approval') && !pending) {
      pending = p;
    }
  }

  if (hasApproved) return;

  const today = new Date().toISOString().split('T')[0] + ' 12:00:00.000Z';
  const payDay = new Date().toISOString().split('T')[0] + ' 12:00:00.000Z';
  const amount = invoice.get('amount');
  const approver = 'System (invoice marked paid)';

  if (pending) {
    pending.set('status', 'Approved');
    pending.set('approved_by', approver);
    pending.set('approval_date', today);
    pending.set('amount', amount);
    pending.set('payment_date', payDay);
    $app.save(pending);
    return;
  }

  const col = $app.findCollectionByNameOrId('payments');
  const row = new Record(col);
  row.set('invoice_id', invoiceId);
  row.set('tenant_id', invoice.getString('tenant_id'));
  row.set('unit_id', invoice.getString('unit_id'));
  row.set('property_id', invoice.getString('property_id'));
  row.set('amount', amount);
  row.set('payment_date', payDay);
  row.set('status', 'Approved');
  row.set('approved_by', approver);
  row.set('approval_date', today);
  $app.save(row);
}

function runInvoicePaidSync(e) {
  try {
    syncPaymentForPaidInvoice(e.record);
  } catch (err) {
    $app.logger().error('invoice-paid-sync-payment: ' + String(err), 'error');
  }
  e.next();
}

onRecordAfterCreateSuccess(runInvoicePaidSync, 'invoices');
onRecordAfterUpdateSuccess(runInvoicePaidSync, 'invoices');
