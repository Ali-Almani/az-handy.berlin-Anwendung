import { useEffect } from 'react';
import ImeisFilters from '../Imeis/components/ImeisFilters';
import { useVorvertragGeraetTabs } from './useVorvertragGeraetTabs';
import '../Imeis/Imeis.scss';

export default function VorvertragGeraetPicker({
  imeis = [],
  seedGeraet = '',
  selectedGeraet = '',
  selectedFarbe = '',
  onGeraetChange,
  onFarbeChange,
  loading = false
}) {
  const tabs = useVorvertragGeraetTabs(imeis, seedGeraet);

  useEffect(() => {
    if (tabs.resolvedGeraet !== selectedGeraet) {
      onGeraetChange?.(tabs.resolvedGeraet);
    }
  }, [tabs.resolvedGeraet, selectedGeraet, onGeraetChange]);

  useEffect(() => {
    if (!selectedFarbe) return;
    if (tabs.availableColors.length > 0 && !tabs.availableColors.includes(selectedFarbe)) {
      onFarbeChange?.('');
    }
  }, [selectedFarbe, tabs.availableColors, onFarbeChange]);

  const showMatchingProducts =
    tabs.matchingProducts.length > 1 &&
    tabs.activeVersion &&
    tabs.activeVariant !== null &&
    tabs.activeGB;

  return (
    <div className="vorvertrag-geraet-picker">
      <span className="form-label">Gerät</span>
      {loading ? (
        <p className="vorvertrag-geraet-picker__hint">Geräte werden geladen…</p>
      ) : imeis.length === 0 ? (
        <p className="vorvertrag-geraet-picker__hint">Kein IMEI-Bestand verfügbar.</p>
      ) : (
        <div className="imeis vorvertrag-geraet-picker__tabs">
          <ImeisFilters
            availableManufacturers={tabs.availableManufacturers}
            activeManufacturer={tabs.activeManufacturer}
            onManufacturerChange={tabs.onManufacturerChange}
            appleHardwareTabsVisible={tabs.appleHardwareTabsVisible}
            appleHardwareShowIphoneTab={tabs.appleHardwareShowIphoneTab}
            activeAppleHardwareTab={tabs.activeAppleHardwareTab}
            onAppleHardwareTabChange={tabs.onAppleHardwareTabChange}
            availableVersions={tabs.availableVersions}
            activeVersion={tabs.activeVersion}
            onVersionChange={tabs.onVersionChange}
            availableVariants={tabs.availableVariants}
            activeVariant={tabs.activeVariant}
            onVariantChange={tabs.onVariantChange}
            availableGBs={tabs.availableGBs}
            activeGB={tabs.activeGB}
            onGBChange={tabs.onGBChange}
            availableProducts={tabs.availableProducts}
            activeProduct={tabs.activeProduct}
            onProductChange={tabs.onProductChange}
          />

          {showMatchingProducts ? (
            <div className="imeis-product-tabs">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  tabs.onMatchingProductChange(null);
                }}
                className={`imeis-product-tab ${tabs.activeProduct === null ? 'imeis-product-tab--active' : ''}`}
              >
                Produkt wählen
              </button>
              {tabs.matchingProducts.map((product) => (
                <button
                  key={product}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    tabs.onMatchingProductChange(product);
                  }}
                  className={`imeis-product-tab ${tabs.activeProduct === product ? 'imeis-product-tab--active' : ''}`}
                >
                  {product}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {selectedGeraet ? (
        <p className="vorvertrag-geraet-picker__selected">
          Ausgewählt: <strong>{selectedGeraet}</strong>
        </p>
      ) : null}

      <div className="form-group vorvertrag-geraet-picker__farbe">
        <label htmlFor="vv-farbe" className="form-label">Farbe</label>
        <select
          id="vv-farbe"
          className="form-input"
          value={selectedFarbe}
          onChange={(ev) => onFarbeChange?.(ev.target.value)}
          disabled={!selectedGeraet}
        >
          <option value="">
            {!selectedGeraet
              ? 'Zuerst Gerät wählen'
              : tabs.availableColors.length === 0
                ? '— keine Farbe im Bestand —'
                : '— Farbe auswählen —'}
          </option>
          {selectedFarbe &&
            !tabs.availableColors.includes(selectedFarbe) && (
              <option value={selectedFarbe}>{selectedFarbe}</option>
            )}
          {tabs.availableColors.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
