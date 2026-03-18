# -*- coding: utf-8 -*-
"""
Skript: MA_Zuornung_Shop.xlsx → Neue Benutzer vorbereiten

- Name = Vorname + Nachname
- Passwort = !azHandy.berlin20260203?
- Email = wie in Excel
- Rolle = Mitarbeiter shop (Standard)
- Einsatz Orte (Spalten): Zentrale, Sonne, KM127, KM169, KM50, Turm, Bad, Haupt
- Wenn "SL" in einer Einsatz-Ort-Spalte → Teamleiter shop, einsatz_ort = diese Kategorie

Ausgabe: MA_Zuornung_Shop_Neu.xlsx + users_import.json
"""
import pandas as pd
import os
import json

BASE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(BASE)
DOWNLOADS = os.path.dirname(PARENT)
EXCEL_PATH = os.path.join(DOWNLOADS, "MA_Zuornung_Shop.xlsx")
OUTPUT_EXCEL = os.path.join(DOWNLOADS, "MA_Zuornung_Shop_Neu.xlsx")
OUTPUT_JSON = os.path.join(BASE, "users_import.json")
PASSWORD = "!azHandy.berlin20260203?"


def find_col(df, names):
    """Finde Spalte anhand möglicher Namen (case-insensitive)."""
    cols = [c for c in df.columns if str(c).strip()]
    for n in names:
        n_lower = str(n).lower()
        for c in cols:
            if n_lower in str(c).lower():
                return c
    return None


def main():
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Excel nicht gefunden: {EXCEL_PATH}")

    df = pd.read_excel(EXCEL_PATH, sheet_name=0)
    df = df.dropna(how="all")

    col_vorname = find_col(df, ["Vorname", "First Name"])
    col_nachname = find_col(df, ["Nachname", "Last Name"])
    col_email = find_col(df, ["Email", "E-Mail", "e-mail", "Mail"])

    EINSATZ_ORTE = ["Zentrale", "Sonne", "KM127", "KM169", "KM50", "Turm", "Bad", "Haupt"]
    col_einsatz = {ort: find_col(df, [ort]) for ort in EINSATZ_ORTE}

    if not col_vorname or not col_nachname:
        raise ValueError(
            f"Spalten Vorname/Nachname nicht gefunden. Vorhanden: {list(df.columns)}"
        )

    users = []
    for idx, row in df.iterrows():
        v = str(row.get(col_vorname, "") or "").strip()
        n = str(row.get(col_nachname, "") or "").strip()
        if not v and not n:
            continue
        name = f"{v} {n}".strip()
        email = str(row.get(col_email, "") or "").strip() if col_email else ""
        if not email:
            continue

        role = "Mitarbeiter shop"
        einsatz_ort = None
        for ort in EINSATZ_ORTE:
            c = col_einsatz.get(ort)
            if not c:
                continue
            val = str(row.get(c, "") or "").strip().upper()
            if not val:
                continue
            if "SL" in val:
                role = "Teamleiter shop"
                einsatz_ort = ort
                break
            if not einsatz_ort:
                einsatz_ort = ort

        users.append({
            "name": name,
            "email": email,
            "password": PASSWORD,
            "role": role,
            "einsatz_ort": einsatz_ort,
        })

    # DataFrame für neue Excel
    out_df = pd.DataFrame([
        {
            "Name": u["name"],
            "Email": u["email"],
            "Passwort": u["password"],
            "Rolle": u["role"],
            "Einsatz_Ort": u.get("einsatz_ort") or "",
        }
        for u in users
    ])
    out_df.to_excel(OUTPUT_EXCEL, index=False)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

    print(f"OK: {len(users)} Benutzer verarbeitet")
    print(f"Excel: {OUTPUT_EXCEL}")
    print(f"JSON:  {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
