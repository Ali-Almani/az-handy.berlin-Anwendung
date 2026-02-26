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
  itemsPerPage,
  onItemsPerPageChange,
  currentPage,
  totalPages,
  startIndex,
  endIndex
}) => {
  return (
    <div className="imeis-controls">
      <div className="imeis-search" style={{ display: 'none' }}>
        <input
          type="text"
          placeholder="IMEI suchen..."
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
          <button
            onClick={onExport}
            className="btn btn--secondary btn--small"
            disabled={filteredImeisLength === 0}
          >
            Exportieren (CSV)
          </button>
          <button
            onClick={onShowHistory}
            className="btn btn--small imeis-history-btn"
          >
            Verlauf ({copyHistoryLength})
          </button>
          {imeisLength > 0 && (
            <>
              <button
                onClick={onDeleteAll}
                className="btn btn--danger btn--small"
              >
                Alle löschen
              </button>
              <button
                onClick={onShowZustand}
                className="btn btn--secondary btn--small"
              >
                Bestand
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImeisControls;
