import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

/**
 * Format currency for UI with symbol
 */
export function formatCurrency(amount, symbol = '₹') {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format currency safely for PDF (replaces non-ASCII Unicode ₹ with clean Rs. to prevent '1 rendering glitch)
 */
export function formatCurrencyPDF(amount, symbol = '₹') {
  const num = Number(amount) || 0;
  const cleanSymbol = (!symbol || symbol === '₹' || symbol === 'INR') ? 'Rs. ' : `${symbol} `;
  return `${cleanSymbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generate 100% NPCI-compliant UPI Payment Link
 * Standard Format: upi://pay?pa=<UPI_ID>&pn=<PayeeName>&am=<Amount>&cu=INR&tn=<Note>
 */
export function getUpiPaymentUrl(invoice, business = {}) {
  const rawUpi = (business.upiId || '').trim();
  if (!rawUpi) {
    return null;
  }

  // Payee VPA (Must be a valid registered UPI ID like name@bank, phone@upi)
  const pa = encodeURIComponent(rawUpi);

  // Payee Name (Alphanumeric and spaces only, max 40 chars without special characters like &, #, ?)
  const rawName = business.businessName || business.ownerName || 'Merchant';
  const cleanName = rawName.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || 'Merchant';
  const pn = encodeURIComponent(cleanName);

  // Amount formatted strictly to 2 decimal places (NPCI standard)
  const rawAmount = invoice.balance > 0 ? invoice.balance : invoice.grandTotal;
  const amountNum = Math.max(0, Number(rawAmount) || 0);
  const am = amountNum.toFixed(2);

  // Transaction Note (Clean alphanumeric, max 25 chars)
  const rawInv = (invoice.invoiceNumber || 'BILL').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const tn = encodeURIComponent(`Bill ${rawInv}`.slice(0, 25));

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

/**
 * Builds a professional jsPDF document for an invoice
 */
export async function createInvoiceDoc(invoice, business = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currency = business.currency || '₹';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- BRAND HEADER ---
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Business Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(business.businessName || 'BizManager Business', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate-300
  const tagline = business.ownerName ? `Prop: ${business.ownerName}` : 'Tax Invoice / Retail Bill';
  doc.text(tagline, margin, 20);

  // Invoice Title badge on top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - margin, 14, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`# ${invoice.invoiceNumber || 'INV-0001'}`, pageWidth - margin, 20, { align: 'right' });

  // --- BUSINESS & INVOICE META ROW ---
  let yPos = 36;

  // Left Column: Business Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Sold By:', margin, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  yPos += 5;
  if (business.address) {
    const splitAddress = doc.splitTextToSize(business.address, 75);
    doc.text(splitAddress, margin, yPos);
    yPos += splitAddress.length * 4;
  }
  if (business.mobile) {
    doc.text(`Phone: ${business.mobile}`, margin, yPos);
    yPos += 4;
  }
  if (business.email) {
    doc.text(`Email: ${business.email}`, margin, yPos);
    yPos += 4;
  }
  if (business.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${business.gstin}`, margin, yPos);
    yPos += 4;
  }

  // Right Column: Invoice & Customer Details
  const rightColX = pageWidth / 2 + 10;
  let rY = 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Billed To:', rightColX, rY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  rY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName || 'Walk-in Customer', rightColX, rY);
  rY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, rightColX, rY);
    rY += 4;
  }
  if (invoice.customerAddress) {
    const splitCustAddr = doc.splitTextToSize(invoice.customerAddress, 75);
    doc.text(splitCustAddr, rightColX, rY);
    rY += splitCustAddr.length * 4;
  }
  if (invoice.customerGstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${invoice.customerGstin}`, rightColX, rY);
    rY += 4;
  }

  // Invoice Details Box
  rY += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Invoice Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, rightColX, rY);
  rY += 4;
  if (invoice.dueDate) {
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, rightColX, rY);
    rY += 4;
  }
  doc.text(`Payment Mode: ${invoice.paymentMethod || 'Cash'}`, rightColX, rY);
  rY += 4;

  // Status Badge
  const statusX = rightColX;
  const statusY = rY;
  const invStatus = invoice.status || (invoice.balance <= 0 ? 'PAID' : 'UNPAID');
  if (invStatus === 'PAID') {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
  } else if (invStatus === 'PARTIAL') {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(146, 64, 14);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(153, 27, 27);
  }
  doc.roundedRect(statusX, statusY, 28, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`STATUS: ${invStatus}`, statusX + 14, statusY + 4.2, { align: 'center' });

  // --- LINE ITEMS TABLE ---
  const tableStartY = Math.max(yPos, rY + 8) + 4;

  const tableRows = (invoice.items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discount) || 0;
    const total = Number(item.total) || (qty * price - discount);

    return [
      idx + 1,
      `${item.productName || 'Item'}${item.sku ? ` (${item.sku})` : ''}`,
      qty,
      formatCurrencyPDF(price, currency),
      discount > 0 ? formatCurrencyPDF(discount, currency) : '-',
      formatCurrencyPDF(total, currency)
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Qty', 'Rate', 'Disc.', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // --- TOTALS SUMMARY & PAYMENT DETAILS (NO QR CODE ON BILL) ---
  let finalY = doc.lastAutoTable.finalY + 6;
  const summaryBoxWidth = 88;
  const summaryX = pageWidth - margin - summaryBoxWidth;
  const notesWidth = summaryX - margin - 8;

  // Left Payment Details & Notes Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, finalY, notesWidth, 54, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment & Billing Details:', margin + 4, finalY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${invoice.paymentMethod || 'Cash'}`, margin + 4, finalY + 13);
  doc.text(`Invoice Status: ${invoice.balance <= 0 ? 'Fully Paid' : (invoice.amountPaid > 0 ? 'Partially Paid' : 'Unpaid / Due')}`, margin + 4, finalY + 18);
  if (invoice.dueDate) {
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, margin + 4, finalY + 23);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Terms & Notes:', margin + 4, finalY + 30);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const noteLines = doc.splitTextToSize(
    invoice.notes || business.invoiceNotes || 'Thank you for your business! Items once sold can be returned/exchanged within 7 days.',
    notesWidth - 8
  );
  doc.text(noteLines, margin + 4, finalY + 35);

  // Summary Card Box on Right (Neatly formatted without overflow)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, finalY, summaryBoxWidth, 54, 2, 2, 'FD');

  let lineY = finalY + 6;
  const labelX = summaryX + 4;
  const valueX = summaryX + summaryBoxWidth - 4;

  const addSummaryRow = (label, value, isBold = false, isHighlight = false, color = [30, 41, 59]) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isHighlight ? 9.5 : 8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(label, labelX, lineY);
    doc.text(value, valueX, lineY, { align: 'right' });
    lineY += 5.5;
  };

  const isInclusive = invoice.taxMode === 'inclusive' || (invoice.taxRate > 0 && invoice.grandTotal === invoice.subtotal);

  if (isInclusive && invoice.taxTotal > 0) {
    const taxableBase = Math.max(0, invoice.grandTotal - invoice.taxTotal);
    addSummaryRow('Taxable Subtotal:', formatCurrencyPDF(taxableBase, currency));
    addSummaryRow(`GST (${invoice.taxRate}% Incl.):`, `+${formatCurrencyPDF(invoice.taxTotal, currency)}`);
  } else {
    addSummaryRow('Subtotal:', formatCurrencyPDF(invoice.subtotal || invoice.grandTotal, currency));
    if (invoice.discountTotal > 0) {
      addSummaryRow('Discount:', `-${formatCurrencyPDF(invoice.discountTotal, currency)}`, false, false, [22, 101, 52]);
    }
    if (invoice.taxTotal > 0) {
      addSummaryRow(`Tax / GST (${invoice.taxRate || 0}%):`, `+${formatCurrencyPDF(invoice.taxTotal, currency)}`);
    }
  }

  // Grand Total separator line
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX + 3, lineY - 1.5, summaryX + summaryBoxWidth - 3, lineY - 1.5);
  lineY += 1.5;

  addSummaryRow('Grand Total:', formatCurrencyPDF(invoice.grandTotal, currency), true, true, [15, 23, 42]);
  addSummaryRow(`Paid (${invoice.paymentMethod || 'Cash'}):`, formatCurrencyPDF(invoice.amountPaid, currency), true, false, [71, 85, 105]);

  if (invoice.balance > 0) {
    addSummaryRow('Balance Due:', formatCurrencyPDF(invoice.balance, currency), true, false, [225, 29, 72]);
  } else {
    addSummaryRow('Balance Due:', `${currency}0.00 (PAID)`, true, false, [16, 185, 129]);
  }

  // --- FOOTER & SIGNATURE ---
  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Computer Generated Tax Invoice • Generated via BizManager', margin, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorized Signatory', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

/**
 * Triggers direct browser download of the PDF invoice
 */
export async function downloadInvoicePDF(invoice, business = {}) {
  const doc = await createInvoiceDoc(invoice, business);
  const fileName = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
  doc.save(fileName);
}

/**
 * Opens PDF print dialog in browser
 */
export async function printInvoicePDF(invoice, business = {}) {
  const doc = await createInvoiceDoc(invoice, business);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.focus();
  }
}

/**
 * 58mm / 80mm POS Thermal Receipt Printer
 */
export async function printThermalReceipt(invoice, business = {}) {
  const currency = 'Rs. ';
  const width = business.thermalPrintWidth === '58mm' ? '58mm' : '80mm';

  const totalAmt = Number(invoice.grandTotal) || 0;
  const paidAmt = Number(invoice.amountPaid) || 0;
  const balAmt = typeof invoice.balance !== 'undefined' && invoice.balance !== null ? Number(invoice.balance) : Math.max(0, totalAmt - paidAmt);
  const isFullyPaid = balAmt <= 0;
  const isPartial = balAmt > 0 && paidAmt > 0;
  const statusLabel = isFullyPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'UNPAID / DUE';

  const itemsHtml = (invoice.items || []).map((it) => `
    <tr>
      <td style="padding: 3px 0; text-align: left;">${it.productName}</td>
      <td style="padding: 3px 0; text-align: center;">${it.quantity}</td>
      <td style="padding: 3px 0; text-align: right;">${currency}${Number(it.unitPrice).toFixed(2)}</td>
      <td style="padding: 3px 0; text-align: right; font-weight: bold;">${currency}${Number(it.total).toFixed(2)}</td>
    </tr>
  `).join('');

  const isInclusive = invoice.taxMode === 'inclusive' || (invoice.taxRate > 0 && invoice.grandTotal === invoice.subtotal);
  const taxableBase = isInclusive && invoice.taxTotal > 0 ? Math.max(0, invoice.grandTotal - invoice.taxTotal) : (invoice.subtotal || invoice.grandTotal);

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: ${width} auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.3;
            width: ${width};
            margin: 0 auto;
            padding: 8px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div style="font-size: 15px; font-weight: 800;">${business.businessName || 'BIZMANAGER'}</div>
          ${business.ownerName ? `<div>Prop: ${business.ownerName}</div>` : ''}
          ${business.address ? `<div>${business.address}</div>` : ''}
          ${business.mobile ? `<div>Tel: ${business.mobile}</div>` : ''}
          ${business.gstin ? `<div>GSTIN: ${business.gstin}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Bill No:</strong> ${invoice.invoiceNumber}</div>
          <div><strong>Date:</strong> ${new Date(invoice.date).toLocaleString('en-IN')}</div>
          <div><strong>Customer:</strong> ${invoice.customerName || 'Walk-in'} ${invoice.customerPhone ? `(${invoice.customerPhone})` : ''}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align:left;">Item</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          ${isInclusive ? `
            <tr><td>Taxable Subtotal:</td><td class="text-right">${currency}${Number(taxableBase).toFixed(2)}</td></tr>
            ${invoice.taxTotal > 0 ? `<tr><td>GST (${invoice.taxRate}% Incl.):</td><td class="text-right">${currency}${Number(invoice.taxTotal).toFixed(2)}</td></tr>` : ''}
          ` : `
            <tr><td>Subtotal:</td><td class="text-right">${currency}${Number(invoice.subtotal || invoice.grandTotal).toFixed(2)}</td></tr>
            ${invoice.discountTotal > 0 ? `<tr><td>Discount:</td><td class="text-right">-${currency}${Number(invoice.discountTotal).toFixed(2)}</td></tr>` : ''}
            ${invoice.taxTotal > 0 ? `<tr><td>Tax (${invoice.taxRate}%):</td><td class="text-right">+${currency}${Number(invoice.taxTotal).toFixed(2)}</td></tr>` : ''}
          `}
          <tr class="bold" style="font-size: 13px;"><td style="padding-top:4px;">GRAND TOTAL:</td><td class="text-right" style="padding-top:4px;">${currency}${totalAmt.toFixed(2)}</td></tr>
          <tr>
            <td>Payment Status:</td>
            <td class="text-right bold" style="${isFullyPaid ? 'color:#15803d;' : isPartial ? 'color:#b45309;' : 'color:#b91c1c;'}">
              ${statusLabel}
            </td>
          </tr>
          <tr>
            <td>Amount Paid (${invoice.paymentMethod || 'Cash'}):</td>
            <td class="text-right">${currency}${paidAmt.toFixed(2)}</td>
          </tr>
          ${balAmt > 0 ? `
            <tr class="bold" style="color:#b91c1c; font-size:12px;">
              <td style="padding-top:2px;">BALANCE DUE:</td>
              <td class="text-right" style="padding-top:2px;">${currency}${balAmt.toFixed(2)}</td>
            </tr>
          ` : ''}
        </table>

        <div class="divider"></div>

        <div class="text-center" style="font-size: 10px; margin-top: 6px;">
          ${business.invoiceNotes || 'Thank you for your visit!'}
        </div>
      </body>
    </html>
  `;

  const printWin = window.open('', '_blank', 'width=350,height=600');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(receiptHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 500);
  }
}
