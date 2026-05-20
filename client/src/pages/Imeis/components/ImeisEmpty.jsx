const ImeisEmpty = ({ searchTerm, sonderOnly }) => (
  <div className="imeis-empty">
    <p>
      {sonderOnly
        ? 'Für Sonder IMEI sind aktuell keine freigegebenen IMEIs in diesem Bestand oder die Filter zeigen keine Treffer.'
        : searchTerm
          ? 'Keine IMEIs gefunden, die dem Suchbegriff entsprechen.'
          : 'Keine IMEIs vorhanden.'}
    </p>
  </div>
);

export default ImeisEmpty;
