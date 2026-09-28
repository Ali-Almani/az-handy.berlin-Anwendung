import { useCallback, useRef, useState } from 'react';
import { downloadFileWithName, suggestSepaPdfFileName } from '../../utils/sepaMandatePdfRename';
import './SepaPdfRenamer.scss';

const SepaPdfRenamer = ({ embedded = false }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);

  const processFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      String(f.name || '').toLowerCase().endsWith('.pdf')
    );
    if (!files.length) return;

    setBusy(true);
    const next = [];
    for (const file of files) {
      try {
        const result = await suggestSepaPdfFileName(file);
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          status: 'ok',
          originalName: file.name,
          suggestedName: result.suggestedName,
          kontoinhaber: result.kontoinhaber,
          datum: result.datum,
          pageNum: result.pageNum,
          pageCount: result.pageCount
        });
      } catch (e) {
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          status: 'error',
          originalName: file.name,
          error: e?.message || 'Auslesen fehlgeschlagen'
        });
      }
    }
    setRows((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      for (const r of next) map.set(r.id, r);
      return Array.from(map.values());
    });
    setBusy(false);
  }, []);

  const onInputChange = (e) => {
    void processFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    void processFiles(e.dataTransfer?.files);
  };

  const downloadOne = (row) => {
    if (row.status !== 'ok' || !row.file) return;
    downloadFileWithName(row.file, row.suggestedName);
  };

  const downloadAllOk = () => {
    rows.filter((r) => r.status === 'ok').forEach((r) => downloadFileWithName(r.file, r.suggestedName));
  };

  const clearList = () => setRows([]);

  return (
    <div className={`sepa-pdf-renamer${embedded ? ' sepa-pdf-renamer--embedded' : ''}`}>
      <p className="sepa-pdf-renamer__hint">
        PDFs werden lokal im Browser gelesen. Es wird jede Seite durchsucht, bis eine{' '}
        <strong>SEPA-Lastschriftmandat</strong>-Seite (z.&nbsp;B. O2) gefunden ist. Umbenennung nur
        mit <strong>Kontoinhaber</strong> und <strong>Datum</strong> – keine IBAN oder Nummern.
      </p>

      <div
        className="sepa-pdf-renamer__dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sepa-pdf-renamer__input"
          onChange={onInputChange}
        />
        {busy ? 'PDF wird ausgelesen…' : 'PDF-Dateien hier ablegen oder klicken (mehrere möglich)'}
      </div>

      {rows.length > 0 && (
        <div className="sepa-pdf-renamer__actions">
          <button type="button" className="btn btn-primary" onClick={downloadAllOk} disabled={busy}>
            Alle erfolgreichen herunterladen
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearList} disabled={busy}>
            Liste leeren
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <table className="sepa-pdf-renamer__table">
          <thead>
            <tr>
              <th>Original</th>
              <th>Kontoinhaber</th>
              <th>Datum</th>
              <th>Seite</th>
              <th>Neuer Name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.status === 'error' ? 'sepa-pdf-renamer__row--error' : ''}>
                <td>{row.originalName}</td>
                <td>{row.status === 'ok' ? row.kontoinhaber : '–'}</td>
                <td>{row.status === 'ok' ? row.datum : '–'}</td>
                <td>{row.status === 'ok' ? `${row.pageNum} / ${row.pageCount}` : '–'}</td>
                <td>{row.status === 'ok' ? row.suggestedName : row.error}</td>
                <td>
                  {row.status === 'ok' && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => downloadOne(row)}>
                      Download
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SepaPdfRenamer;
