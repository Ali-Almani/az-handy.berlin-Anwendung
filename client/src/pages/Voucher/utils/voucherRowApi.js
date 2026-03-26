/** Deep clone einer Voucher-Zeile für API (Entfernen / Wiederherstellen). */
export function cloneVoucherRowForApi(row) {
  if (!row || typeof row !== 'object') return null;
  return JSON.parse(
    JSON.stringify({
      sheet: row.sheet ?? 'Sheet1',
      row: row.row,
      rowData: row.rowData || {},
      columnOrder: Array.isArray(row.columnOrder) ? row.columnOrder : Object.keys(row.rowData || {}),
      rowDataFormats: row.rowDataFormats && typeof row.rowDataFormats === 'object' ? row.rowDataFormats : {},
      sheetIndex: row.sheetIndex ?? 0,
      data: Array.isArray(row.data) ? row.data : undefined
    })
  );
}

export function voucherRowsEqual(a, b) {
  if (!a || !b) return false;
  if (String(a.sheet || 'default') !== String(b.sheet || 'default')) return false;
  if (Number(a.row) !== Number(b.row)) return false;
  return JSON.stringify(a.rowData || {}) === JSON.stringify(b.rowData || {});
}
