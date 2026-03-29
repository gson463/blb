
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '@/lib/paymentUtils';

export const exportToPDF = (reportTitle, dateRange, columns, tableData) => {
  const doc = new jsPDF();
  
  // Add Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('BELIBELI DIGITAL MANAGER', 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(reportTitle, 14, 32);
  
  if (dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date Range: ${dateRange}`, 14, 40);
  }
  
  // Add Table
  doc.autoTable({
    startY: dateRange ? 45 : 38,
    head: [columns.map(c => c.header)],
    body: tableData.map(row => columns.map(c => {
      const val = row[c.key];
      if (c.type === 'currency') return formatCurrency(val);
      if (c.type === 'percentage') return `${val}%`;
      return val || '-';
    })),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // Primary blue-ish
    styles: { fontSize: 9, cellPadding: 3 },
  });
  
  // Add Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  doc.save(`${reportTitle.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = (reportTitle, columns, tableData) => {
  const headers = columns.map(c => `"${c.header}"`).join(',');
  
  const rows = tableData.map(row => {
    return columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape quotes and wrap in quotes
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });
  
  const csvContent = [headers, ...rows].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
