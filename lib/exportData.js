import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTime } from './dateFormat';

export function buildExportRows(transactions, categories) {
  return transactions.map((t) => {
    const cat = categories.find((c) => c.id === t.category_id);
    return {
      Date: formatDateTime(t.occurred_at),
      Type: t.type === 'inflow' ? 'Inflow' : 'Outflow',
      Category: cat ? cat.name : 'Uncategorized',
      'Source/Paid To': t.source_dest || '',
      Note: t.note || '',
      Amount: Number(t.amount).toFixed(2),
    };
  });
}

function buildFilename(base, ext) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}_${stamp}.${ext}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// profileInfo shape: { name, email } — returns labeled lines, e.g.
// "Name - Sam Jones" and "Email - samjones@gmail.com". Name line is
// skipped entirely if no name is set.
function headerLines(profileInfo) {
  if (!profileInfo) return [];
  const lines = [];
  if (profileInfo.name) lines.push(`Name - ${profileInfo.name}`);
  lines.push(`Email - ${profileInfo.email}`);
  return lines;
}

export function exportAsCSV(rows, profileInfo) {
  if (rows.length === 0) return;

  const lines = [];
  const header = headerLines(profileInfo);
  if (header.length > 0) {
    lines.push(...header);
    lines.push('');
  }

  const headers = Object.keys(rows[0]);
  lines.push(headers.join(','));

  rows.forEach((row) => {
    const line = headers.map((h) => {
      const val = String(row[h] ?? '').replace(/"/g, '""');
      return val.includes(',') ? `"${val}"` : val;
    });
    lines.push(line.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, buildFilename('mr-pocket-transactions', 'csv'));
}

export function exportAsJSON(rows, profileInfo) {
  const payload = { transactions: rows };
  if (profileInfo) {
    if (profileInfo.name) payload.name = profileInfo.name;
    payload.email = profileInfo.email;
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  triggerDownload(blob, buildFilename('mr-pocket-transactions', 'json'));
}

function toAOA(rows) {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((h) => row[h]));
  return [headers, ...body];
}

export function exportAsExcel(rows, profileInfo) {
  const wb = XLSX.utils.book_new();

  const header = headerLines(profileInfo);
  const headerRows = header.length > 0 ? [...header.map((line) => [line]), []] : [];
  const sheetData = [...headerRows, ...toAOA(rows)];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] ?? '').length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, buildFilename('mr-pocket-transactions', 'xlsx'));
}

export function exportAsPDF(rows, profileInfo) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Mr Pocket — Transaction Export', 14, 18);

  let startY = 26;

  const header = headerLines(profileInfo);
  if (header.length > 0) {
    doc.setFontSize(10);
    header.forEach((line, i) => {
      doc.text(line, 14, startY + i * 5);
    });
    startY += header.length * 5 + 5;
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const body = rows.map((row) => headers.map((h) => row[h]));

  autoTable(doc, {
    startY,
    head: [headers],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(buildFilename('mr-pocket-transactions', 'pdf'));
}