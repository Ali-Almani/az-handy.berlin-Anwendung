const ImeisEmpty = ({ searchTerm, sonderOnly, acceptedReuploadOnly }) => (
  <div className="imeis-empty">
    <p>
      {acceptedReuploadOnly
        ? 'Keine IMEIs in der Kategorie „Angenommen (Excel)“ – Treffer entstehen beim Excel-Upload, wenn eine IMEI im Angenommen-Archiv steht.'
        : sonderOnly
          ? 'Für Sonder IMEI sind aktuell keine freigegebenen IMEIs in diesem Bestand oder die Filter zeigen keine Treffer.'
          : searchTerm
            ? 'Keine IMEIs gefunden, die dem Suchbegriff entsprechen.'
            : 'Keine IMEIs vorhanden.'}
    </p>
  </div>
);

export default ImeisEmpty;
