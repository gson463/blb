const EAT = 'Africa/Nairobi';

function todayDateStringEAT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: EAT });
}

export const generateInvoiceNumber = () => {
  const d = new Date();
  const ymd = d.toLocaleDateString('sv-SE', { timeZone: EAT });
  const y = ymd.slice(0, 4);
  const m = ymd.slice(5, 7);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${y}-${m}-${random}`;
};

export const calculateInvoiceStatus = (dueDate, status) => {
  if (status === 'Paid') return 'Paid';

  if (!dueDate) return status;
  const due = String(dueDate).slice(0, 10);
  const today = todayDateStringEAT();

  if (due < today && status === 'Unpaid') {
    return 'Overdue';
  }

  return status;
};

export const getOverdueInvoices = (invoices) => {
  if (!Array.isArray(invoices)) return [];

  const today = todayDateStringEAT();

  return invoices.filter((invoice) => {
    if (invoice.status === 'Paid') return false;
    if (!invoice.due_date) return false;
    const due = String(invoice.due_date).slice(0, 10);
    return due < today;
  });
};

export { formatCurrency } from './paymentUtils';
