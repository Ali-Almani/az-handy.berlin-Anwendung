# Imeis Komponenten-Struktur

Die große `Imeis.jsx` Datei wurde in mehrere kleinere Komponenten aufgeteilt:

## Struktur

```
Imeis/
├── Imeis.jsx                    # Hauptkomponente (refactored)
├── Imeis.scss                   # Styles
├── utils/
│   └── ImeisUtils.js            # Utility-Funktionen
└── components/
    ├── ImeisHistoryModal.jsx    # History Modal
    ├── ImeisRateLimitModal.jsx  # Rate Limit Modal
    ├── ImeisFilters.jsx         # Filter-Tabs (zu erstellen)
    ├── ImeisTable.jsx           # Haupttabelle (zu erstellen)
    └── ImeisControls.jsx        # Controls (zu erstellen)
```

## Utility-Funktionen (ImeisUtils.js)

- `maskImei()` - Maskiert IMEI-Nummern
- `getProductFull()` - Extrahiert vollständigen Produktnamen
- `extractGB()` - Extrahiert GB-Angabe
- `extractProductVersion()` - Extrahiert Produktversion
- `extractProductVariant()` - Extrahiert Produktvariante
- `extractColor()` - Extrahiert Farbe
- `removeColorAndManufacturerFromProduct()` - Bereinigt Produktnamen
- `hasO2Aktion()` - Prüft auf o2-Aktion
- `getProduct()` - Extrahiert Produkt für Gruppierung
- `getManufacturer()` - Extrahiert Hersteller

## Komponenten

### ImeisHistoryModal
Zeigt den Kopier-Verlauf an.

### ImeisRateLimitModal
Zeigt Rate-Limit Warnung an.

### ImeisFilters (zu erstellen)
Enthält alle Filter-Tabs:
- Hersteller-Tabs
- Version-Tabs
- Varianten-Tabs
- GB-Tabs

### ImeisTable (zu erstellen)
Enthält die Haupttabelle mit IMEI-Daten.

### ImeisControls (zu erstellen)
Enthält Controls:
- Suchfeld
- Buttons (Export, Löschen, etc.)
- Pagination

## Nächste Schritte

1. ✅ Utility-Funktionen extrahiert
2. ✅ Modals extrahiert
3. ⏳ Filter-Komponente erstellen
4. ⏳ Tabelle-Komponente erstellen
5. ⏳ Controls-Komponente erstellen
6. ⏳ Hauptkomponente refactoren
