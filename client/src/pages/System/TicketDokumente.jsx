import { useMemo, useRef, useState } from 'react';
import { uploadTicketDocumentApi } from '../../services/whatsapp.service';
import {
  isLiveWhatsAppTicket,
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
  uploaderName = ''
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const items = useMemo(() => ticketDokumente(ticket), [ticket]);

  const applyDocs = (docs) => {
    onDokumenteChange?.(sanitizeTicketDokumente(docs));
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
            applyDocs(docs);
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

  return (
    <section className="offen-dokumente" aria-label="Dokument">
      <div className="offen-dokumente__head">
        <h3 className="vorvertrag-section-title">Dokument</h3>
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
              <a
                className={`offen-dokumente__card${item.kind === 'pdf' ? ' offen-dokumente__card--pdf' : ''}`}
                href={item.src}
                target="_blank"
                rel="noopener noreferrer"
                title={item.name}
              >
                {item.kind === 'image' ? (
                  <img src={item.src} alt={item.name} />
                ) : (
                  <span className="offen-dokumente__pdf">PDF</span>
                )}
                <span className="offen-dokumente__name">{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="offen-dokumente__empty">Keine PDFs oder Bilder im Gespräch.</p>
      )}
      {error ? <p className="offen-dokumente__error">{error}</p> : null}
    </section>
  );
}
