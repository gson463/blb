
/** Tanzanian Shilling (TZS); displayed as Tsh for product copy */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'Tsh 0.00';
  const formatted = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 2,
  }).format(amount);
  return formatted.replace(/^TSh\s*/u, 'Tsh ');
};

export const generatePaymentId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `PAY-${year}${month}-${random}`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const generatePaymentReceiptFilename = (tenantName, date) => {
  const safeName = tenantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dateStr = new Date(date).toISOString().split('T')[0];
  return `receipt_${safeName}_${dateStr}`;
};

export const calculatePaymentStatus = (payment) => {
  if (!payment) return 'Unknown';
  return payment.status || 'Pending Approval';
};

export const isPaymentPending = (status) =>
  status === 'Pending Approval' || status === 'pending_approval';

export const isPaymentApproved = (status) =>
  status === 'Approved' || status === 'approved';

export const isPaymentRejected = (status) =>
  status === 'Rejected' || status === 'rejected';

export const getPendingApprovalsCount = (payments) => {
  if (!Array.isArray(payments)) return 0;
  return payments.filter((p) => isPaymentPending(p.status)).length;
};

export const getOverduePayments = (invoices) => {
  if (!Array.isArray(invoices)) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return invoices.filter(inv => {
    if (inv.status === 'Paid') return false;
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < today;
  });
};

export const formatPaymentHistory = (payments) => {
  if (!Array.isArray(payments)) return [];
  return payments.map(p => ({
    id: p.id,
    date: p.payment_date,
    amount: p.amount,
    tenant: p.expand?.tenant_id?.name || 'Unknown',
    unit: p.expand?.unit_id?.name || 'Unknown',
    property: p.expand?.property_id?.name || 'Unknown',
    invoice: p.expand?.invoice_id?.invoice_number || 'N/A',
    status: p.status,
    approver: p.approved_by || p.expand?.approver_id?.name || '-',
    approvalDate: p.approval_date || '-'
  })).sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const generatePaymentReport = (payments, format = 'csv') => {
  const formatted = formatPaymentHistory(payments);
  
  if (format === 'csv') {
    const headers = ['Date', 'Amount', 'Tenant', 'Unit', 'Property', 'Invoice', 'Status', 'Approver'];
    const rows = formatted.map(p => [
      formatDate(p.date),
      p.amount,
      `"${p.tenant}"`,
      `"${p.unit}"`,
      `"${p.property}"`,
      p.invoice,
      p.status,
      `"${p.approver}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csvContent;
  }
  
  return JSON.stringify(formatted, null, 2);
};
