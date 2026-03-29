
export const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `INV-${year}-${month}-${random}`;
};

export const calculateInvoiceStatus = (dueDate, status) => {
  if (status === 'Paid') return 'Paid';
  
  if (!dueDate) return status;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (due < today && status === 'Unpaid') {
    return 'Overdue';
  }
  
  return status;
};

export const getOverdueInvoices = (invoices) => {
  if (!Array.isArray(invoices)) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return invoices.filter(invoice => {
    if (invoice.status === 'Paid') return false;
    if (!invoice.due_date) return false;
    const due = new Date(invoice.due_date);
    return due < today;
  });
};

export { formatCurrency } from './paymentUtils';
