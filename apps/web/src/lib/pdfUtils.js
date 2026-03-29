import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/invoiceUtils';
import { formatDate } from '@/lib/paymentUtils';
import { getAppConfig } from '@/lib/appConfig';
import pb from '@/lib/pocketbaseClient';

const DEFAULT_NAME = 'Beli Beli Ltd';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/**
 * Loads branding from app_config for PDFs (logo requires auth for private files).
 */
export async function fetchBrandingForPdf() {
  try {
    const cfg = await getAppConfig();
    if (!cfg) {
      return {
        systemName: DEFAULT_NAME,
        invoiceFooter: '',
        receiptFooter: '',
        logoDataUrl: null,
      };
    }
    let logoDataUrl = null;
    if (cfg.logo) {
      const url = pb.files.getUrl(cfg, cfg.logo);
      try {
        const headers = {};
        if (pb.authStore.token) {
          headers.Authorization = `Bearer ${pb.authStore.token}`;
        }
        const res = await fetch(url, { headers });
        if (res.ok) {
          const blob = await res.blob();
          logoDataUrl = await blobToDataUrl(blob);
        }
      } catch {
        /* ignore logo errors */
      }
    }
    return {
      systemName: (cfg.system_name || cfg.landlord_public_name || '').trim() || DEFAULT_NAME,
      invoiceFooter: (cfg.invoice_footer_text || '').trim(),
      receiptFooter: (cfg.receipt_footer_text || cfg.invoice_footer_text || '').trim(),
      logoDataUrl,
    };
  } catch {
    return {
      systemName: DEFAULT_NAME,
      invoiceFooter: '',
      receiptFooter: '',
      logoDataUrl: null,
    };
  }
}

function drawPdfHeader(doc, branding, docTitle, subtitle) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;
  if (branding.logoDataUrl) {
    try {
      const fmt = branding.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(branding.logoDataUrl, fmt, 14, 10, 28, 14);
      y = 30;
    } catch {
      y = 16;
    }
  }
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(branding.systemName, branding.logoDataUrl ? 46 : 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(docTitle, 14, y);
  doc.setFontSize(9);
  if (subtitle) {
    doc.text(subtitle, pageW - 14, y, { align: 'right' });
  }
  doc.setTextColor(0, 0, 0);
  return y + 8;
}

function drawPdfFooter(doc, branding, footerText) {
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    let y = pageH - 18;
    if (footerText) {
      const lines = doc.splitTextToSize(footerText, doc.internal.pageSize.getWidth() - 28);
      doc.text(lines, 14, y - lines.length * 4);
      y -= lines.length * 4 + 2;
    }
    doc.text(`Page ${i} of ${pageCount} · Generated ${new Date().toLocaleString()}`, 14, pageH - 10);
  }
}

/**
 * Professional rent invoice PDF.
 */
export async function downloadInvoicePdf(invoice, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF();
  const property = expand.property_id || invoice.expand?.property_id;
  const unit = expand.unit_id || invoice.expand?.unit_id;
  const tenant = expand.tenant_id || invoice.expand?.tenant_id;

  const startY = drawPdfHeader(
    doc,
    branding,
    'TAX INVOICE / RENT INVOICE',
    `Invoice #${invoice.invoice_number || invoice.id}`
  );

  const rows = [
    ['Invoice number', String(invoice.invoice_number || '—')],
    ['Issue date', formatDate(invoice.created)],
    ['Due date', formatDate(invoice.due_date)],
    ['Status', invoice.status || '—'],
    ['Property', property?.name || '—'],
    ['Unit', unit?.name || '—'],
    ['Bill to (tenant)', tenant?.name || '—'],
    ['Tenant email', tenant?.email || '—'],
    ['Amount due', formatCurrency(invoice.amount)],
  ];

  autoTable(doc, {
    startY: startY + 4,
    head: [['Description', 'Details']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = doc.lastAutoTable?.finalY ?? startY + 80;
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 6, doc.internal.pageSize.getWidth() - 14, finalY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text(`Total: ${formatCurrency(invoice.amount)}`, 14, finalY + 16);

  drawPdfFooter(doc, branding, branding.invoiceFooter);
  doc.save(`invoice-${invoice.invoice_number || invoice.id}.pdf`);
}

/**
 * Professional payment receipt PDF (for approved tenant payments).
 */
export async function downloadPaymentReceiptPdf(payment, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF();
  const property = expand.property_id || payment.expand?.property_id;
  const unit = expand.unit_id || payment.expand?.unit_id;
  const tenant = expand.tenant_id || payment.expand?.tenant_id;
  const invoice = expand.invoice_id || payment.expand?.invoice_id;

  const startY = drawPdfHeader(
    doc,
    branding,
    'PAYMENT RECEIPT',
    `Receipt · ${payment.id?.slice?.(0, 8) || payment.id}`
  );

  const rows = [
    ['Payment date', formatDate(payment.payment_date)],
    ['Invoice', invoice?.invoice_number || '—'],
    ['Tenant', tenant?.name || '—'],
    ['Property', property?.name || '—'],
    ['Unit', unit?.name || '—'],
    ['Amount received', formatCurrency(payment.amount)],
    ['Status', payment.status || '—'],
    ['Approved by', payment.approved_by || '—'],
    ['Approval date', payment.approval_date ? formatDate(payment.approval_date) : '—'],
  ];

  autoTable(doc, {
    startY: startY + 4,
    head: [['Item', 'Details']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(9);
  doc.setTextColor(80);
  const fy = doc.lastAutoTable?.finalY ?? 120;
  doc.text(
    'This receipt confirms payment as recorded in BELIBELI. Retain for your records.',
    14,
    fy + 12
  );

  drawPdfFooter(doc, branding, branding.receiptFooter);
  doc.save(`receipt-${invoice?.invoice_number || payment.id}.pdf`);
}

export async function downloadLeasePdf(lease, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF();
  const property = expand.property_id || lease.expand?.property_id;
  const unit = expand.unit_id || lease.expand?.unit_id;
  const tenant = expand.tenant_id || lease.expand?.tenant_id;

  const startY = drawPdfHeader(doc, branding, 'LEASE SUMMARY', `Reference: ${lease.id}`);

  const rows = [
    ['Property', property?.name || '—'],
    ['Unit', unit?.name || '—'],
    ['Tenant', tenant?.name || '—'],
    ['Start date', formatDate(lease.start_date)],
    ['End date', formatDate(lease.end_date)],
    ['Monthly rent', formatCurrency(lease.rent_amount)],
    ['Status', lease.status || '—'],
  ];

  autoTable(doc, {
    startY: startY + 4,
    head: [['Field', 'Value']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  const fy = doc.lastAutoTable?.finalY ?? 120;
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Summary only — not a substitute for the signed lease agreement.', 14, fy + 12);

  drawPdfFooter(doc, branding, branding.invoiceFooter);
  doc.save(`lease-summary-${lease.id}.pdf`);
}
