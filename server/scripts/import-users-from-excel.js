/**
 * Importiert Benutzer aus MA_Zuornung_Shop.xlsx
 *
 * - Name = Vorname + Nachname
 * - Passwort = !azHandy.berlin20260203?
 * - Email = wie in Excel
 * - Einsatz Orte (Spalten in Excel): Zentrale + Kurznamen (Sonne, KM127, …) → werden als Straßenadresse gespeichert
 * - Wenn "SL" in einer Einsatz-Ort-Spalte → Teamleiter shop, einsatz_ort = diese Kategorie
 * - Sonst → Mitarbeiter shop, einsatz_ort = erste nicht-leere Einsatz-Ort-Spalte
 *
 * Ausführung: node scripts/import-users-from-excel.js
 */
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDatabase, User } from '../models/index.js';
import { EINSATZORT_LEGACY_MAP, canonicalizeEinsatzOrt } from '../constants/einsatzorte.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASSWORD = '!azHandy.berlin20260203?';

// Pfad: MA_Zuornung_Shop.xlsx (Standard: Downloads-Ordner)
// Alternativ: IMPORT_EXCEL_PATH="C:\Pfad\zur\Datei.xlsx" npm run import-users-excel
const projectRoot = path.resolve(__dirname, '../..');
const downloadsRoot = path.dirname(path.dirname(projectRoot));
const excelPath = process.env.IMPORT_EXCEL_PATH || path.join(downloadsRoot, 'MA_Zuornung_Shop.xlsx');

function findCol(worksheet, names) {
  const row = worksheet.getRow(1);
  const cols = [];
  row.eachCell((cell, colNumber) => {
    const val = cell.value ? String(cell.value).trim() : '';
    if (val) cols.push({ num: colNumber, name: val });
  });
  for (const n of names) {
    const nLower = String(n).toLowerCase();
    const found = cols.find((c) => c.name.toLowerCase().includes(nLower));
    if (found) return found.num;
  }
  return null;
}

function getCellValue(row, colNum) {
  const cell = row.getCell(colNum);
  const v = cell.value;
  if (v == null) return '';
  return String(v).trim();
}

async function main() {
  console.log('🚀 Benutzer-Import startet…');
  if (!fs.existsSync(excelPath)) {
    console.error('❌ Excel nicht gefunden:', excelPath);
    process.exit(1);
  }

  console.log('📂 Lese Excel:', excelPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    console.error('❌ Kein Arbeitsblatt gefunden');
    process.exit(1);
  }

  const colVorname = findCol(sheet, ['Vorname', 'First Name']);
  const colNachname = findCol(sheet, ['Nachname', 'Last Name']);
  const colEmail = findCol(sheet, ['Email', 'E-Mail', 'e-mail', 'Mail']);

  const EINSATZ_ORTE = ['Zentrale', ...Object.keys(EINSATZORT_LEGACY_MAP)];
  const colEinsatzOrt = {};
  for (const ort of EINSATZ_ORTE) {
    const c = findCol(sheet, [ort]);
    if (c) colEinsatzOrt[ort] = c;
  }

  if (!colVorname || !colNachname) {
    console.error('❌ Spalten Vorname/Nachname nicht gefunden');
    const row = sheet.getRow(1);
    const headers = [];
    row.eachCell((c) => headers.push(c.value));
    console.error('   Vorhandene Spalten:', headers);
    process.exit(1);
  }

  const users = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const v = getCellValue(row, colVorname);
    const n = getCellValue(row, colNachname);
    if (!v && !n) return;
    const name = `${v} ${n}`.trim();
    const email = colEmail ? getCellValue(row, colEmail) : '';
    if (!email) return;

    let role = 'Mitarbeiter shop';
    let einsatzOrt = null;

    for (const ort of EINSATZ_ORTE) {
      const col = colEinsatzOrt[ort];
      if (!col) continue;
      const val = getCellValue(row, col).toUpperCase();
      if (!val) continue;
      if (val.includes('SL')) {
        role = 'Teamleiter shop';
        einsatzOrt = ort;
        break;
      }
      if (!einsatzOrt) einsatzOrt = ort;
    }

    users.push({
      name,
      email,
      password: PASSWORD,
      role,
      einsatz_ort: einsatzOrt ? canonicalizeEinsatzOrt(einsatzOrt) : null
    });
  });

  console.log(`\n📋 ${users.length} Benutzer aus Excel gelesen\n`);

  console.log('🔄 Verbinde mit PostgreSQL (ohne Schema-Alter)…');
  await connectDatabase();
  console.log('✅ Datenbank verbunden\n');

  let created = 0;
  let skipped = 0;
  let updated = 0;
  const updateExisting =
    process.env.IMPORT_UPDATE_EXISTING === 'true' || process.argv.includes('--update');

  for (const u of users) {
    const existing = await User.findOne({ where: { email: u.email.toLowerCase() } });
    if (existing) {
      if (updateExisting) {
        existing.name = u.name;
        existing.role = u.role;
        existing.einsatz_ort = u.einsatz_ort || null;
        existing.password = u.password;
        await existing.save();
        console.log(`🔄 Aktualisiert: ${u.name} | ${u.email} | ${u.role}${u.einsatz_ort ? ` | ${u.einsatz_ort}` : ''}`);
        updated++;
      } else {
        console.log(`⏭️  Übersprungen (existiert): ${u.name} (${u.email})`);
        skipped++;
      }
      continue;
    }
    await User.create({
      name: u.name,
      email: u.email.toLowerCase(),
      password: u.password,
      role: u.role,
      einsatz_ort: u.einsatz_ort || null,
    });
    console.log(`✅ Erstellt: ${u.name} | ${u.email} | ${u.role}${u.einsatz_ort ? ` | ${u.einsatz_ort}` : ''}`);
    created++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Erstellt: ${created}`);
  console.log(`🔄 Aktualisiert: ${updated}`);
  console.log(`⏭️  Übersprungen: ${skipped}`);
  console.log(`📧 Passwort für alle: ${PASSWORD}`);
  if (!updateExisting && skipped > 0) {
    console.log('💡 Bestehende Benutzer übersprungen. Passwörter zurücksetzen: npm run import-users-excel -- --update');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});
