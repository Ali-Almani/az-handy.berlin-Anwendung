const ImeisStats = ({
  activeManufacturer,
  activeVersion,
  activeVariant,
  activeProduct,
  activeGB,
  filteredImeisLength,
  searchTerm,
  startIndex,
  endIndex,
  itemsPerPage,
  onItemsPerPageChange,
  onPageReset
}) => {
  const getVersionDisplayName = () => {
    if (!activeManufacturer || !activeVersion) return '';
    const manufacturerLower = activeManufacturer.toLowerCase();
    let versionName = '';
    if (manufacturerLower.includes('apple')) {
      versionName = `iPhone ${activeVersion}`;
    } else if (manufacturerLower.includes('google')) {
      versionName = `Pixel ${activeVersion}`;
    } else if (manufacturerLower.includes('samsung')) {
      versionName = activeVersion.startsWith('S') ? `Galaxy ${activeVersion}` : `Galaxy S${activeVersion}`;
    } else {
      versionName = `${activeManufacturer} ${activeVersion}`;
    }
    if (activeVariant !== null && activeVariant !== '') {
      versionName += ` ${activeVariant}`;
    }
    return versionName;
  };

  return (
    <div className="imeis-stats">
      <p>
        {activeManufacturer ? (
          <>
            Hersteller: <strong>{activeManufacturer}</strong>
            {activeVersion ? (
              <>
                {activeVersion && (
                  <> | Version: <strong>{getVersionDisplayName()}</strong></>
                )}
                {activeGB && (
                  <> | GB: <strong>{activeGB}</strong></>
                )}
              </>
            ) : (
              <>
                {activeProduct && (
                  <> | Produkt: <strong>{activeProduct}</strong></>
                )}
              </>
            )}
            <> | IMEIs: <strong>{filteredImeisLength}</strong></>
          </>
        ) : (
          <>IMEIs: <strong>{filteredImeisLength}</strong></>
        )}
        {searchTerm && (
          <> | Gefunden: <strong>{filteredImeisLength}</strong></>
        )}
        {filteredImeisLength > 0 && (
          <> | Zeige <strong>{startIndex + 1}</strong> - <strong>{Math.min(endIndex, filteredImeisLength)}</strong> von <strong>{filteredImeisLength}</strong></>
        )}
      </p>
      <div className="imeis-pagination-controls">
        <label>
          Zeilen pro Seite:
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageReset?.();
            }}
            className="form-select"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </label>
      </div>
    </div>
  );
};

export default ImeisStats;
