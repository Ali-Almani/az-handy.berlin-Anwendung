const ImeisControls = ({
  searchTerm,
  onSearchChange,
  history,
  onUndo,
  onExport,
  filteredImeisLength,
  copyHistoryLength,
  onShowHistory,
  imeisLength,
  onDeleteAll,
  onShowZustand,
  showAdvancedActions = true,
  showBestand = true,
  showDeleteAll = false,
  showSonderOfficeButton = false,
  onOpenSonderOffice,
  showAcceptedArchiveButton = false,
  onShowAcceptedArchive,
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  totalPages,
  startIndex,
  endIndex
}) => {
  return (
    <div className="imeis-controls">
      <div className="imeis-search">
        <input
          type="text"
          placeholder="Hersteller / Produkt suchen..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-input"
        />
      </div>
      <div className="imeis-actions">
        <div className="imeis-actions-info">
          <span className="imeis-hint" style={{ display: 'none' }}>
            💡 Klicken/Ziehen zum Markieren, Shift+Klick für Bereich, Delete zum Löschen. Kopieren nur über Dropdown-Aktion möglich.
          </span>
        </div>
        <div className="imeis-actions-buttons">
          {history.length > 0 && (
            <button
              onClick={onUndo}
              className="btn btn--secondary btn--small"
              title="Letzten Schritt rückgängig machen"
            >
              ↶ Rückgängig
            </button>
          )}
          {showAdvancedActions && (
            <button
              onClick={onExport}
              className="btn btn--secondary btn--small"
              disabled={filteredImeisLength === 0}
            >
              Exportieren (CSV)
            </button>
          )}
          <button
            onClick={onShowHistory}
            className="btn btn--small imeis-history-btn"
          >
            Verlauf ({copyHistoryLength})
          </button>
          {showAcceptedArchiveButton && (
            <button
              type="button"
              onClick={onShowAcceptedArchive}
              className="btn btn--outline btn--small"
              title="Archiv aller angenommenen IMEIs aller Mitarbeiter"
            >
              Angenommen (Archiv)
            </button>
          )}
          {showAdvancedActions && imeisLength > 0 && (
            <>
              {showDeleteAll && (
                <button
                  onClick={onDeleteAll}
                  className="btn btn--danger btn--small"
                >
                  Alle löschen
                </button>
              )}
              {showBestand && (
                <button
                  onClick={onShowZustand}
                  className="btn btn--secondary btn--small"
                  type="button"
                >
                  Bestand
                </button>
              )}
              {false && showSonderOfficeButton && imeisLength > 0 && (
                <button
                  type="button"
                  onClick={onOpenSonderOffice}
                  className="btn btn--outline btn--small"
                  title="Die zehn ältesten IMEIs für die Sonderliste im Shop freigeben"
                >
                  Sonder IMEI (älteste 10)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImeisControls;
