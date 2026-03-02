const ImeisEmpty = ({ searchTerm }) => (
  <div className="imeis-empty">
    <p>
      {searchTerm
        ? 'Keine IMEIs gefunden, die dem Suchbegriff entsprechen.'
        : 'Keine IMEIs vorhanden.'}
    </p>
  </div>
);

export default ImeisEmpty;
