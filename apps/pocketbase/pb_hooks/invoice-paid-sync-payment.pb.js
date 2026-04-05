/// <reference path="../pb_data/types.d.ts" />

/** EAT (UTC+3): noon on calendar day for payment/approval datetimes */
function dateAtNoonEAT(yyyyMmDd) {
  const day = String(yyyyMmDd).slice(0, 10);
  return `${day}T12:00:00+03:00`;
}

function todayDateStringEAT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

function datePart(raw) {
  if (!raw) return '';
  return String(raw).slice(0, 10);
}

/** Same convention as web app: noon EAT on the calendar day */
function dateAtNoonEATFromStored(raw) {
  const day = datePart(raw);
  if (!day) return '';
  return `${day}T12:00:00+03:00`;
}

/**
 * When the first invoice is marked Paid, create an Active lease from tenant.pending_lease_* and clear those fields.
 */
function syncLeaseFromPendingTenant(invoice) {
  if (invoice.getString('status') !== 'Paid') return;

  const tenantId = invoice.getString('tenant_id');
  if (!tenantId) return;

  let tenant;
  try {
    tenant = $app.findRecordById('tenants', tenantId);
  } catch (e) {
    return;
  }

  const pendingStart = tenant.getString('pending_lease_start');
  const pendingEnd = tenant.getString('pending_lease_end');
  if (!pendingStart || !pendingEnd) return;

  const existing = $app.findRecordsByFilter(
    'leases',
    `tenant_id = "${tenantId}" && status = "Active"`,
    '-created',
    1,
    0
  );
  if (existing && existing.length > 0) return;

  const leaseCol = $app.findCollectionByNameOrId('leases');
  const lease = new Record(leaseCol);
  lease.set('property_id', invoice.getString('property_id'));
  lease.set('unit_id', invoice.getString('unit_id'));
  lease.set('tenant_id', tenantId);
  lease.set('start_date', dateAtNoonEATFromStored(pendingStart));
  lease.set('end_date', dateAtNoonEATFromStored(pendingEnd));
  const amt = invoice.get('amount');
  if (amt != null) lease.set('rent_amount', amt);
  lease.set('status', 'Active');
  $app.save(lease);

  tenant.set('pending_lease_start', null);
  tenant.set('pending_lease_end', null);
  $app.save(tenant);
}

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

  const today = dateAtNoonEAT(todayDateStringEAT());
  const payDay = dateAtNoonEAT(todayDateStringEAT());
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
    syncLeaseFromPendingTenant(e.record);
  } catch (err) {
    $app.logger().error('invoice-paid-sync-payment: ' + String(err), 'error');
  }
  e.next();
}

onRecordAfterCreateSuccess(runInvoicePaidSync, 'invoices');
onRecordAfterUpdateSuccess(runInvoicePaidSync, 'invoices');
