/** Voucher-Kategorien (Tabs in Verwaltung + Voucher eintragen). sheet = Excel-Blattname für Tab-Zuordnung. */
export const VOUCHER_TABS = [
  { id: 'o2_ff', label: 'o2 mit Family and Friends', sheet: 'o2 mit Family and Friends' },
  { id: 'ay_ag0', label: 'Ay Yildiz · AG0- Voucher', sheet: 'Ay Yildiz · AG0- Voucher' },
  { id: 'ay_ag0_5eur', label: '24 x -5 Euro GG Nachlass', sheet: '24 x -5 Euro GG Nachlass' },
  { id: 'ay_ag0_750eur', label: '24 x -7,50 Euro GG Nachlass', sheet: '24 x -7,50 Euro GG Nachlass' },
  { id: 'ay_ag0_10eur', label: '24 x -10 Euro GG Nachlass', sheet: '24 x -10 Euro GG Nachlass' }
];

export const VOUCHER_TAB_IDS = new Set(VOUCHER_TABS.map((t) => t.id));

export function getVoucherTabById(tabId) {
  const id = normalizeVoucherTabId(tabId);
  return VOUCHER_TABS.find((t) => t.id === id) ?? null;
}

/** Legacy-Tab-ID aus älteren Einträgen. */
export function normalizeVoucherTabId(tabId) {
  const id = String(tabId ?? '').trim();
  if (id === 'ay_5eur') return 'ay_ag0_5eur';
  return id;
}

export function isValidVoucherTabId(tabId) {
  return VOUCHER_TAB_IDS.has(normalizeVoucherTabId(tabId));
}
