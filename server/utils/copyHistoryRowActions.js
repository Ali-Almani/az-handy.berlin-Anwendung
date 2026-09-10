import { imeiKeyFromRowId } from './imeiKey.js';

const ROW_ACTIONS_FOR_VERLAUF = new Set([
  'reservieren',
  'dereserviert',
  'checkout',
  'kopiert',
  'copy',
  'angenommen',
  'abgelehnt'
]);

/** Verlaufseinträge aus row_actions_json (ohne Büro-4-Tage-Filter – für Backup/Restore). */
export function copyHistoryEntriesFromRowActions(rowActions, { userName = '', rowUserId = null } = {}) {
  const out = [];
  if (!rowActions || typeof rowActions !== 'object' || Array.isArray(rowActions)) return out;
  for (const [rowId, act] of Object.entries(rowActions)) {
    if (!act || typeof act !== 'object') continue;
    const actionRaw = String(act.action ?? '').trim();
    const action = actionRaw.toLowerCase();
    if (!action || !ROW_ACTIONS_FOR_VERLAUF.has(action)) continue;
    const imei = imeiKeyFromRowId(rowId);
    if (!imei) continue;
    const ts = String(act.timestamp ?? '').trim() || new Date().toISOString();
    out.push({
      imei,
      product: String(act.product ?? '').trim() || '-',
      action: actionRaw,
      timestamp: ts,
      userName: String(act.userName ?? userName ?? '').trim() || userName || 'Unbekannt',
      ...(rowUserId != null ? { historyOwnerUserId: rowUserId } : {})
    });
  }
  return out;
}
