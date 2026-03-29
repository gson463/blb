import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/invoiceUtils';
import { formatDate } from '@/lib/paymentUtils';
import { getAppConfig } from '@/lib/appConfig';
import pb from '@/lib/pocketbaseClient';

const DEFAULT_NAME = 'Beli Beli Ltd';

/** Single brand palette — navy primary + teal accent on every PDF */
const COL = {
  primary: [23, 37, 84],
  accent: [15, 118, 110],
  invoiceBanner: [23, 37, 84],
  receiptBanner: [15, 118, 110],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  surface: [248, 250, 252],
  text: [15, 23, 42],
};

/** Human-facing invoice / receipt reference (never internal record IDs). */
function invoiceDocumentRef(invoice) {
  const n = invoice?.invoice_number;
  if (n != null && String(n).trim() !== '') return String(n).trim();
  return '—';
}

/** Safe download filename segment (no database ids). */
function safeFilePart(s, fallback) {
  const t = String(s || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .slice(0, 80);
  return t || fallback;
}

/** Split landlord “general agreements” for lease PDFs — blank line between clauses. */
function parseLeaseGeneralAgreements(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function fetchBrandingForPdf() {
  try {
    const cfg = await getAppConfig();
    if (!cfg) {
      return {
        systemName: DEFAULT_NAME,
        landlordName: DEFAULT_NAME,
        invoiceFooter: '',
        receiptFooter: '',
        logoDataUrl: null,
        leaseGeneralAgreements: [],
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
        /* ignore */
      }
    }
    const systemName = (cfg.system_name || cfg.landlord_public_name || '').trim() || DEFAULT_NAME;
    const landlordName = (cfg.landlord_public_name || cfg.system_name || '').trim() || systemName;
    return {
      systemName,
      landlordName,
      invoiceFooter: (cfg.invoice_footer_text || '').trim(),
      receiptFooter: (cfg.receipt_footer_text || cfg.invoice_footer_text || '').trim(),
      logoDataUrl,
      leaseGeneralAgreements: parseLeaseGeneralAgreements(cfg.lease_general_agreements),
    };
  } catch {
    return {
      systemName: DEFAULT_NAME,
      landlordName: DEFAULT_NAME,
      invoiceFooter: '',
      receiptFooter: '',
      logoDataUrl: null,
      leaseGeneralAgreements: [],
    };
  }
}

function drawFooter(doc, branding, footerText, accentRgb) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COL.border);
    doc.setLineWidth(0.3);
    doc.line(16, pageH - 22, pageW - 16, pageH - 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COL.muted);
    if (footerText) {
      const lines = doc.splitTextToSize(footerText, pageW - 32);
      doc.text(lines, 16, pageH - 18, { baseline: 'bottom', maxWidth: pageW - 32 });
    }
    doc.setFontSize(7);
    doc.text(
      `Page ${i} of ${pageCount}  ·  ${new Date().toLocaleDateString('en-GB')}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
    if (accentRgb) {
      doc.setFillColor(...accentRgb);
      doc.rect(0, pageH - 3, pageW, 3, 'F');
    }
  }
}

/**
 * Full-width top banner + meta layout. Returns Y where content should start.
 */
function drawBannerAndMeta(doc, branding, options) {
  const { variant, docLabel, reference, metaLeft = [], metaRight = [] } = options;
  const pageW = doc.internal.pageSize.getWidth();
  const bannerRgb = variant === 'receipt' ? COL.accent : COL.primary;
  const bannerH = 38;

  doc.setFillColor(...bannerRgb);
  doc.rect(0, 0, pageW, bannerH, 'F');

  let textX = 16;
  if (branding.logoDataUrl) {
    try {
      const fmt = branding.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(branding.logoDataUrl, fmt, 16, 8, 22, 22);
      textX = 42;
    } catch {
      /* skip logo */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(branding.systemName, textX, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(docLabel, textX, 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(reference, pageW - 16, 20, { align: 'right' });

  const metaY = bannerH + 8;
  doc.setTextColor(...COL.text);
  doc.setFontSize(9);

  const colW = (pageW - 40) / 2;
  let y = metaY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COL.muted);
  doc.text('DOCUMENT DETAILS', 16, y);
  if (metaRight.length) {
    doc.text('PROPERTY / UNIT', 16 + colW + 8, y);
  }
  y += 5;

  doc.setTextColor(...COL.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const leftLines = metaLeft.map(([k, v]) => `${k}: ${v}`);
  doc.text(leftLines.join('\n'), 16, y);
  if (metaRight.length) {
    const rightLines = metaRight.map(([k, v]) => `${k}: ${v}`);
    doc.text(rightLines.join('\n'), 16 + colW + 8, y);
  }

  const rowCount = Math.max(leftLines.length, metaRight.length ? metaRight.length : 0);
  return y + rowCount * 4.5 + 10;
}

function drawBillToBox(doc, x, y, w, title, lines) {
  doc.setDrawColor(...COL.border);
  doc.setFillColor(...COL.surface);
  doc.roundedRect(x, y, w, 8 + lines.length * 5, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COL.muted);
  doc.text(title.toUpperCase(), x + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COL.text);
  let ly = y + 11;
  lines.forEach((line) => {
    doc.text(line, x + 4, ly);
    ly += 5;
  });
  return y + 8 + lines.length * 5 + 4;
}

/**
 * Rent invoice — structured layout, line item, total highlight.
 */
export async function downloadInvoicePdf(invoice, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const property = expand.property_id || invoice.expand?.property_id;
  const unit = expand.unit_id || invoice.expand?.unit_id;
  const tenant = expand.tenant_id || invoice.expand?.tenant_id;

  const invNo = invoiceDocumentRef(invoice);
  const startY = drawBannerAndMeta(doc, branding, {
    variant: 'invoice',
    docLabel: 'Tax invoice · Rent & service charges',
    reference: invNo === '—' ? 'Tax invoice' : invNo,
    metaLeft: [
      ['Issue date', formatDate(invoice.created)],
      ['Due date', formatDate(invoice.due_date)],
      ['Status', invoice.status || '—'],
    ],
    metaRight: [
      ['Property', property?.name || '—'],
      ['Unit', unit?.name || '—'],
    ],
  });

  const pageW = doc.internal.pageSize.getWidth();
  const boxW = (pageW - 40) / 2;

  const rowY = startY;
  const rightX = 16 + boxW + 8;
  const billLines = [
    tenant?.name || '—',
    tenant?.email || '—',
    tenant?.phone ? `Tel: ${tenant.phone}` : '',
  ].filter(Boolean);
  const addrLines = [property?.name || '—', unit?.name ? `Unit ${unit.name}` : '—'].filter(Boolean);
  const yLeft = drawBillToBox(doc, 16, rowY, boxW, 'Bill to', billLines);
  const yRight = drawBillToBox(doc, rightX, rowY, boxW, 'Service address', addrLines);
  const y = Math.max(yLeft, yRight);

  const tableStart = y + 4;

  autoTable(doc, {
    startY: tableStart,
    head: [['Description', 'Qty', 'Unit', 'Amount (TZS)']],
    body: [
      [
        'Rent / recurring charges for the period indicated on this invoice',
        '1',
        formatCurrency(invoice.amount),
        formatCurrency(invoice.amount),
      ],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: COL.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
      textColor: COL.text,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 36 },
    },
    margin: { left: 16, right: 16 },
    tableLineColor: COL.border,
    tableLineWidth: 0.2,
  });

  const afterTable = doc.lastAutoTable?.finalY ?? tableStart + 30;
  const totalY = afterTable + 6;

  doc.setFillColor(...COL.surface);
  doc.roundedRect(pageW - 16 - 78, totalY, 78, 16, 2, 2, 'F');
  doc.setDrawColor(...COL.border);
  doc.roundedRect(pageW - 16 - 78, totalY, 78, 16, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COL.muted);
  doc.text('Amount due', pageW - 16 - 74, totalY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COL.primary);
  doc.text(formatCurrency(invoice.amount), pageW - 20, totalY + 13, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COL.muted);
  doc.text(
    'Thank you for your business. Please pay on or before the due date using the instructions in the footer.',
    16,
    totalY + 22
  );

  drawFooter(doc, branding, branding.invoiceFooter, COL.primary);
  doc.save(`Invoice-${safeFilePart(invNo === '—' ? formatDate(invoice.created) : invNo, 'document')}.pdf`);
}

/**
 * Payment receipt — certificate style with amount emphasis.
 */
export async function downloadPaymentReceiptPdf(payment, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const property = expand.property_id || payment.expand?.property_id;
  const unit = expand.unit_id || payment.expand?.unit_id;
  const tenant = expand.tenant_id || payment.expand?.tenant_id;
  const inv = expand.invoice_id || payment.expand?.invoice_id;
  const invoiceNo =
    inv?.invoice_number != null && String(inv.invoice_number).trim() !== ''
      ? String(inv.invoice_number).trim()
      : null;
  const bannerRef = invoiceNo || 'Payment receipt';

  const startY = drawBannerAndMeta(doc, branding, {
    variant: 'receipt',
    docLabel: 'Official payment receipt',
    reference: bannerRef,
    metaLeft: [
      ['Payment date', formatDate(payment.payment_date)],
      ['Invoice', invoiceNo || '—'],
      ['Status', payment.status || '—'],
    ],
    metaRight: [
      ['Tenant', tenant?.name || '—'],
      ['Property', property?.name || '—'],
      ['Unit', unit?.name || '—'],
    ],
  });

  const pageW = doc.internal.pageSize.getWidth();
  let y = startY + 6;

  doc.setFillColor(240, 253, 250);
  doc.roundedRect(16, y, pageW - 32, 28, 3, 3, 'F');
  doc.setDrawColor(...COL.accent);
  doc.setLineWidth(0.6);
  doc.roundedRect(16, y, pageW - 32, 28, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COL.accent);
  doc.text('AMOUNT RECEIVED', pageW / 2, y + 8, { align: 'center' });
  doc.setFontSize(20);
  doc.text(formatCurrency(payment.amount), pageW / 2, y + 20, { align: 'center' });

  y += 34;

  autoTable(doc, {
    startY: y,
    body: [
      ['Approved by', payment.approved_by || '—'],
      ['Approval date', payment.approval_date ? formatDate(payment.approval_date) : '—'],
      ['For invoice', invoiceNo || '—'],
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48, textColor: COL.muted },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 16, right: 16 },
    tableLineColor: COL.border,
    tableLineWidth: 0.15,
  });

  const fy = doc.lastAutoTable?.finalY ?? y + 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COL.muted);
  const note = doc.splitTextToSize(
    `This document confirms that the payment above was recorded by ${branding.systemName}. Retain this PDF for your records. It does not replace bank or mobile-money statements.`,
    pageW - 32
  );
  doc.text(note, 16, fy + 8);

  drawFooter(doc, branding, branding.receiptFooter, COL.accent);
  doc.save(
    `Receipt-${safeFilePart(invoiceNo || formatDate(payment.payment_date), 'payment')}.pdf`
  );
}

const LEASE_MARGIN = 18;
const LEASE_FOOTER_BAND = 28;

function drawLeaseCoverHeader(doc, branding) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 32;
  doc.setFillColor(...COL.primary);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(branding.systemName.toUpperCase(), pageW / 2, 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Lease summary', pageW / 2, 14, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Residential Lease Agreement', pageW / 2, 23, { align: 'center' });
  doc.setFillColor(...COL.accent);
  doc.rect(0, headerH, pageW, 1.2, 'F');
  return headerH + 5;
}

function drawLeaseContinuationHeader(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COL.muted);
  doc.text('Residential Lease Agreement (continued)', pageW / 2, 14, { align: 'center' });
  doc.setDrawColor(...COL.accent);
  doc.setLineWidth(0.35);
  doc.line(LEASE_MARGIN, 17, pageW - LEASE_MARGIN, 17);
  return 22;
}

function leaseBottomSafeY(doc) {
  return doc.internal.pageSize.getHeight() - LEASE_FOOTER_BAND - 8;
}

function ensureLeaseSpace(doc, y, needMm) {
  if (y + needMm > leaseBottomSafeY(doc)) {
    doc.addPage();
    return drawLeaseContinuationHeader(doc);
  }
  return y;
}

function applyLeaseDocumentFooters(doc, branding) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const band = LEASE_FOOTER_BAND - 2;
  const tealH = 1.5;
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const y0 = pageH - band;
    doc.setFillColor(...COL.accent);
    doc.rect(0, y0 - tealH, pageW, tealH, 'F');
    doc.setFillColor(...COL.primary);
    doc.rect(0, y0, pageW, band, 'F');
    doc.setTextColor(255, 255, 255);
    let tx = 16;
    if (branding.logoDataUrl) {
      try {
        const fmt = branding.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(branding.logoDataUrl, fmt, 16, y0 + 5, 16, 16);
        tx = 36;
      } catch {
        /* skip */
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(branding.systemName, tx, y0 + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const footerLines = (branding.invoiceFooter || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const rightBlurb = (footerLines[0] || '').slice(0, 160);
    if (rightBlurb) {
      doc.text(rightBlurb, pageW - 16, y0 + 11, { align: 'right', maxWidth: pageW * 0.42 });
    }
    doc.setFontSize(7);
    doc.setTextColor(230, 230, 230);
    doc.text(`Page ${i} of ${n}`, pageW / 2, pageH - 4, { align: 'center' });
  }
}

/**
 * Lease summary — slate/teal bands, Times body, landlord general agreements (numbered).
 */
export async function downloadLeasePdf(lease, expand = {}) {
  const branding = await fetchBrandingForPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const property = expand.property_id || lease.expand?.property_id;
  const unit = expand.unit_id || lease.expand?.unit_id;
  const tenant = expand.tenant_id || lease.expand?.tenant_id;

  const pageW = doc.internal.pageSize.getWidth();
  const textW = pageW - LEASE_MARGIN * 2;
  let y = drawLeaseCoverHeader(doc, branding);

  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COL.text);
  doc.text('RESIDENTIAL LEASE AGREEMENT', pageW / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const datedLine = `THIS LEASE (the "Lease") is recorded as at ${formatDate(lease.start_date || lease.created)}.`;
  const datedLines = doc.splitTextToSize(datedLine, textW);
  doc.text(datedLines, LEASE_MARGIN, y);
  y += datedLines.length * 5 + 8;

  y = ensureLeaseSpace(doc, y, 40);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('BETWEEN:', LEASE_MARGIN, y);
  y += 7;
  doc.setFont('times', 'normal');
  const landlordLine = `${branding.landlordName} (the "Landlord")`;
  doc.text(landlordLine, LEASE_MARGIN, y);
  y += 6;
  doc.setFont('times', 'bold');
  doc.text('- AND -', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('times', 'normal');
  const tenantLine = `${tenant?.name || '—'} (the "Tenant")`;
  doc.text(tenantLine, LEASE_MARGIN, y);
  y += 6;
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.text('(individually a "Party" and together the "Parties").', LEASE_MARGIN, y);
  y += 10;

  y = ensureLeaseSpace(doc, y, 35);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COL.text);
  doc.text('Leased property', LEASE_MARGIN, y);
  y += 7;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const propLines = doc.splitTextToSize(
    `The Landlord lets to the Tenant the premises at ${property?.name || '—'}` +
      (unit?.name ? `, unit ${unit.name}` : '') +
      '.',
    textW
  );
  doc.text(propLines, LEASE_MARGIN, y);
  y += propLines.length * 5 + 8;

  y = ensureLeaseSpace(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [['Term', 'Details']],
    body: [
      ['Lease status', lease.status || '—'],
      ['Monthly rent', formatCurrency(lease.rent_amount)],
      ['Lease start', formatDate(lease.start_date)],
      ['Lease end', formatDate(lease.end_date)],
    ],
    theme: 'striped',
    styles: { font: 'times', fontSize: 9, textColor: COL.text },
    headStyles: {
      fillColor: COL.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 48 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: LEASE_MARGIN, right: LEASE_MARGIN },
    tableLineColor: COL.border,
    tableLineWidth: 0.15,
    alternateRowStyles: { fillColor: [252, 252, 252] },
  });

  y = (doc.lastAutoTable?.finalY ?? y + 40) + 10;

  if (branding.leaseGeneralAgreements.length > 0) {
    y = ensureLeaseSpace(doc, y, 22);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('General terms and agreements', LEASE_MARGIN, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    branding.leaseGeneralAgreements.forEach((clause, idx) => {
      const wrapped = doc.splitTextToSize(`${idx + 1}. ${clause}`, textW - 6);
      const blockH = wrapped.length * 5 + 3;
      y = ensureLeaseSpace(doc, y, blockH);
      doc.text(wrapped, LEASE_MARGIN + 4, y);
      y += blockH;
    });
  }

  const disclaimer = doc.splitTextToSize(
    `This document is a summary for reference only. It is not a substitute for a signed lease contract. General terms above are set by ${branding.landlordName}. Seek legal advice for binding agreements.`,
    textW
  );
  const discH = disclaimer.length * 4.5 + 4;
  y = ensureLeaseSpace(doc, y, discH);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...COL.muted);
  doc.text(disclaimer, LEASE_MARGIN, y);

  applyLeaseDocumentFooters(doc, branding);
  doc.save(
    `Lease-summary-${safeFilePart(tenant?.name, 'tenant')}-${safeFilePart(formatDate(lease.start_date), 'date')}.pdf`
  );
}
