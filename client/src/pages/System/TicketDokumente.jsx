import { useMemo, useRef, useState } from 'react';
import { deleteTicketDocumentApi, uploadTicketDocumentApi } from '../../services/whatsapp.service';
import {
  isLiveWhatsAppTicket,
  sanitizeDokumenteHidden,
  sanitizeTicketDokumente,
  ticketDokumente
} from './callcenterLeadData';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

function dokumentKindFromFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic)$/i.test(name)) return 'image';
  return '';
}

export default function TicketDokumente({
  ticket,
  onDokumenteChange,
  uploaderName = '',
  canDelete = false
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');
  const items = useMemo(() => ticketDokumente(ticket), [ticket]);

  const applyDocs = (docs, hidden = ticket?.dokumenteHidden) => {
    onDokumenteChange?.(sanitizeTicketDokumente(docs), sanitizeDokumenteHidden(hidden));
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setError('');
    setBusy(true);
    let docs = Array.isArray(ticket?.dokumente) ? [...ticket.dokumente] : [];
    try {
      for (const file of files) {
        const kind = dokumentKindFromFile(file);
        if (!kind) {
          setError('Nur PDF oder Bilder erlaubt.');
          continue;
        }
        if (isLiveWhatsAppTicket(ticket)) {
          const res = await uploadTicketDocumentApi(ticket.id, {
            file,
            uploadedBy: uploaderName
          });
          if (Array.isArray(res?.ticket?.dokumente)) {
            docs = res.ticket.dokumente;
            applyDocs(docs, res.ticket.dokumenteHidden);
          }
        } else {
          const src = await readFileAsDataUrl(file);
          docs = sanitizeTicketDokumente([
            ...docs,
            {
              id: `local-${Date.now()}-${file.name}`,
              src,
              name: file.name,
              mime: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
              kind,
              source: 'upload',
              at: new Date().toISOString(),
              uploadedBy: uploaderName
            }
          ]);
          applyDocs(docs);
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Upload fehlgeschlagen.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeItem = async (item) => {
    if (!canDelete || !item) return;
    if (!window.confirm('Dieses Dokument löschen?')) return;
    setError('');
    setBusy(true);
    try {
      if (isLiveWhatsAppTicket(ticket)) {
        const res = await deleteTicketDocumentApi(ticket.id, { src: item.src, id: item.id });
        applyDocs(res?.ticket?.dokumente, res?.ticket?.dokumenteHidden);
      } else {
        const hidden = sanitizeDokumenteHidden([
          ...(Array.isArray(ticket?.dokumenteHidden) ? ticket.dokumenteHidden : []),
          item.src,
          item.id
        ]);
        applyDocs(
          (Array.isArray(ticket?.dokumente) ? ticket.dokumente : []).filter((doc) => (
            (doc?.src || '') !== (item.src || '') && (doc?.id || '') !== (item.id || '')
          )),
          hidden
        );
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Löschen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="offen-dokumente" aria-label="Dokumente">
      <div className="offen-dokumente__head">
        <h3 className="vorvertrag-section-title">Dokumente</h3>
        <label className="btn btn--outline btn--small offen-dokumente__upload">
          {busy ? 'Laden…' : 'Hochladen'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            disabled={busy}
            aria-label="PDF oder Bild hochladen"
            onChange={(ev) => uploadFiles(ev.target.files)}
          />
        </label>
      </div>
      {items.length ? (
        <ul className="offen-dokumente__grid">
          {items.map((item) => (
            <li key={item.id || item.src} className="offen-dokumente__item">
              {canDelete ? (
                <button
                  type="button"
                  className="offen-dokumente__remove"
                  disabled={busy}
                  title="Löschen"
                  aria-label={`${item.name} löschen`}
                  onClick={() => removeItem(item)}
                >
                  ×
                </button>
              ) : null}
              {item.kind === 'image' ? (
                <button
                  type="button"
                  className="offen-dokumente__card"
                  title={item.name}
                  onClick={() => setLightboxSrc(item.src)}
                >
                  <img src={item.src} alt={item.name} />
                  <span className="offen-dokumente__name">{item.name}</span>
                </button>
              ) : (
                <a
                  className="offen-dokumente__card offen-dokumente__card--pdf"
                  href={item.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.name}
                >
                  <span className="offen-dokumente__pdf">PDF</span>
                  <span className="offen-dokumente__name">{item.name}</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="offen-dokumente__empty">Keine PDFs oder Bilder im Gespräch.</p>
      )}
      {error ? <p className="offen-dokumente__error">{error}</p> : null}
      {lightboxSrc ? (
        <button
          type="button"
          className="offen-dokumente-lightbox"
          onClick={() => setLightboxSrc('')}
          aria-label="Bild schließen"
        >
          <img src={lightboxSrc} alt="" />
        </button>
      ) : null}
    </section>
  );
}
