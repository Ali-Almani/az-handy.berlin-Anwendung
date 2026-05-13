import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFormularCenterItems,
  uploadFormularCenterFile,
  deleteFormularCenterItem,
  getFormularCenterDownloadHref,
  updateFormularCenterItemMeta,
  replaceFormularCenterFile,
  createFormularSection,
  updateFormularSectionTitle,
  deleteFormularSection,
  moveFormularSection,
  moveFormularItem
} from '../../services/formularCenter.service';
import './FormularCenter.scss';

const FORMULAR_FILE_ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.xls,.mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,video/mp4';

/**
 * Verwaltung: Bereiche (Titel), Reihenfolge, Dateien.
 * @param {{ loadWhen?: boolean, focusSectionTitle?: string | null, onlySectionTitle?: string | null, excludeSectionTitles?: string[] }} props – im Dashboard nur laden, wenn der Tab aktiv ist
 */
export default function FormularCenterAdminPanel({
  loadWhen = true,
  focusSectionTitle = null,
  onlySectionTitle = null,
  excludeSectionTitles = []
}) {
  const formularFileInputRef = useRef(null);
  const formularReplaceInputRef = useRef(null);
  const formularReplaceTargetIdRef = useRef(null);
  const formularUploadTargetSectionIdRef = useRef(null);
  const focusedOnceRef = useRef(false);
  const [formularSections, setFormularSections] = useState([]);
  const [formularLoading, setFormularLoading] = useState(false);
  const [formularError, setFormularError] = useState(null);
  const [formularUploadBusy, setFormularUploadBusy] = useState(false);
  const [formularDeleteId, setFormularDeleteId] = useState(null);
  const [formularEditingId, setFormularEditingId] = useState(null);
  const [formularEditName, setFormularEditName] = useState('');
  const [formularEditDescription, setFormularEditDescription] = useState('');
  const [formularMetaBusy, setFormularMetaBusy] = useState(false);
  const [formularReplaceBusyId, setFormularReplaceBusyId] = useState(null);
  const [formularNewSectionTitle, setFormularNewSectionTitle] = useState('');
  const [formularSectionCreateBusy, setFormularSectionCreateBusy] = useState(false);
  const [formularEditingSectionId, setFormularEditingSectionId] = useState(null);
  const [formularEditSectionTitle, setFormularEditSectionTitle] = useState('');
  const [formularSectionMetaBusy, setFormularSectionMetaBusy] = useState(false);
  const [formularSectionDeleteId, setFormularSectionDeleteId] = useState(null);
  const [formularSectionMoveBusy, setFormularSectionMoveBusy] = useState(null);
  const [formularItemMoveBusy, setFormularItemMoveBusy] = useState(null);

  const loadFormularCenter = useCallback(async () => {
    setFormularLoading(true);
    setFormularError(null);
    try {
      const res = await getFormularCenterItems();
      setFormularSections(Array.isArray(res.data?.sections) ? res.data.sections : []);
    } catch (e) {
      setFormularError(e.response?.data?.message || e.message || 'Liste konnte nicht geladen werden.');
      setFormularSections([]);
    } finally {
      setFormularLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadWhen) return;
    loadFormularCenter();
  }, [loadWhen, loadFormularCenter]);

  const wantedOnlyTitle = String(onlySectionTitle || '')
    .trim()
    .toLowerCase();
  const excludedTitles = (Array.isArray(excludeSectionTitles) ? excludeSectionTitles : [])
    .map((t) => String(t || '').trim().toLowerCase())
    .filter(Boolean);

  const visibleFormularSections = (formularSections || []).filter((sec) => {
    const t = String(sec?.title || '')
      .trim()
      .toLowerCase();
    if (wantedOnlyTitle) return t === wantedOnlyTitle;
    if (excludedTitles.length > 0) return !excludedTitles.includes(t);
    return true;
  });

  useEffect(() => {
    if (!loadWhen) return;
    if (!focusSectionTitle) return;
    if (formularLoading) return;
    if (!visibleFormularSections || visibleFormularSections.length === 0) return;
    if (focusedOnceRef.current) return;

    const wanted = String(focusSectionTitle).trim().toLowerCase();
    if (!wanted) return;
    const esc = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape : (v) => String(v).replace(/"/g, '\\"');
    const el = document.querySelector(`[data-fc-section-title="${esc(wanted)}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      focusedOnceRef.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loadWhen, focusSectionTitle, formularLoading, visibleFormularSections]);

  const handleFormularPickUpload = (sectionId) => {
    formularUploadTargetSectionIdRef.current = sectionId;
    formularFileInputRef.current?.click();
  };

  const handleFormularFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const sectionId = formularUploadTargetSectionIdRef.current;
    formularUploadTargetSectionIdRef.current = null;
    if (!file || !sectionId) return;
    setFormularUploadBusy(true);
    setFormularError(null);
    try {
      await uploadFormularCenterFile(file, sectionId);
      await loadFormularCenter();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const apiMsg =
        data && typeof data === 'object' && typeof data.message === 'string' ? data.message : null;
      let msg = apiMsg || err.message || 'Upload fehlgeschlagen.';
      if (status === 413) {
        msg =
          apiMsg && apiMsg.length <= 160
            ? apiMsg
            : 'Upload zu groß (413). Nginx „client_max_body_size“ anpassen oder Datei max. 100 MB.';
      }
      setFormularError(msg);
    } finally {
      setFormularUploadBusy(false);
    }
  };

  const handleFormularDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('Dieses Formular wirklich löschen?')) return;
    setFormularDeleteId(id);
    setFormularError(null);
    try {
      await deleteFormularCenterItem(id);
      if (formularEditingId === id) {
        setFormularEditingId(null);
        setFormularEditName('');
      }
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setFormularDeleteId(null);
    }
  };

  const handleFormularSaveMeta = async () => {
    if (!formularEditingId) return;
    const name = formularEditName.trim();
    if (!name) {
      setFormularError('Bitte einen Anzeigename eingeben.');
      return;
    }
    const description = String(formularEditDescription || '').trim();
    setFormularMetaBusy(true);
    setFormularError(null);
    try {
      await updateFormularCenterItemMeta(formularEditingId, { originalName: name, description });
      setFormularEditingId(null);
      setFormularEditName('');
      setFormularEditDescription('');
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setFormularMetaBusy(false);
    }
  };

  const handleFormularReplacePick = (id) => {
    formularReplaceTargetIdRef.current = id;
    formularReplaceInputRef.current?.click();
  };

  const handleFormularReplaceFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetId = formularReplaceTargetIdRef.current;
    formularReplaceTargetIdRef.current = null;
    if (!file || !targetId) return;
    setFormularReplaceBusyId(targetId);
    setFormularError(null);
    try {
      await replaceFormularCenterFile(targetId, file);
      await loadFormularCenter();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const apiMsg =
        data && typeof data === 'object' && typeof data.message === 'string' ? data.message : null;
      let msg = apiMsg || err.message || 'Datei konnte nicht ersetzt werden.';
      if (status === 413) {
        msg =
          apiMsg && apiMsg.length <= 160
            ? apiMsg
            : 'Upload zu groß (413). Nginx „client_max_body_size“ anpassen oder Datei max. 100 MB.';
      }
      setFormularError(msg);
    } finally {
      setFormularReplaceBusyId(null);
    }
  };

  const handleFormularCreateSection = async () => {
    const title = formularNewSectionTitle.trim();
    if (!title) {
      setFormularError('Bitte einen Titel für den neuen Bereich eingeben.');
      return;
    }
    setFormularSectionCreateBusy(true);
    setFormularError(null);
    try {
      await createFormularSection({ title });
      setFormularNewSectionTitle('');
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Bereich konnte nicht angelegt werden.');
    } finally {
      setFormularSectionCreateBusy(false);
    }
  };

  const handleFormularSaveSectionTitle = async () => {
    if (!formularEditingSectionId) return;
    const title = formularEditSectionTitle.trim();
    if (!title) {
      setFormularError('Bitte einen Bereichstitel eingeben.');
      return;
    }
    setFormularSectionMetaBusy(true);
    setFormularError(null);
    try {
      await updateFormularSectionTitle(formularEditingSectionId, { title });
      setFormularEditingSectionId(null);
      setFormularEditSectionTitle('');
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setFormularSectionMetaBusy(false);
    }
  };

  const handleFormularDeleteSection = async (sectionId) => {
    if (!sectionId) return;
    if (!window.confirm('Diesen Bereich mit allen Dateien wirklich löschen?')) {
      return;
    }
    setFormularSectionDeleteId(sectionId);
    setFormularError(null);
    try {
      await deleteFormularSection(sectionId);
      if (formularEditingSectionId === sectionId) {
        setFormularEditingSectionId(null);
        setFormularEditSectionTitle('');
      }
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setFormularSectionDeleteId(null);
    }
  };

  const handleFormularSectionMove = async (sectionId, direction) => {
    setFormularSectionMoveBusy(`${sectionId}-${direction}`);
    setFormularError(null);
    try {
      await moveFormularSection(sectionId, direction);
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Sortierung fehlgeschlagen.');
    } finally {
      setFormularSectionMoveBusy(null);
    }
  };

  const handleFormularItemMove = async (itemId, direction) => {
    setFormularItemMoveBusy(`${itemId}-${direction}`);
    setFormularError(null);
    try {
      await moveFormularItem(itemId, direction);
      await loadFormularCenter();
    } catch (err) {
      setFormularError(err.response?.data?.message || err.message || 'Sortierung fehlgeschlagen.');
    } finally {
      setFormularItemMoveBusy(null);
    }
  };

  return (
    <div className="card dashboard-formular-center dashboard-admin-panel">
      <div className="dashboard-admin-panel__header dashboard-excel-upload__headerRow">
        <h2 className="card-title">Formular Center</h2>
        <span className="dashboard-excel-upload__badge">Verwaltung · PDF, Word, Excel, MP4</span>
      </div>
      <div className="card-body">
        <div className="formular-center-new-section">
          <label className="sr-only" htmlFor="formular-new-section-title">
            Neuer Bereichstitel
          </label>
          <input
            id="formular-new-section-title"
            type="text"
            className="formular-center-name-field formular-center-name-field--new"
            placeholder="Neuer Bereich (Titel)"
            value={formularNewSectionTitle}
            onChange={(ev) => setFormularNewSectionTitle(ev.target.value)}
            maxLength={200}
            disabled={formularSectionCreateBusy}
          />
          <button
            type="button"
            className="btn btn--primary btn--small"
            disabled={formularSectionCreateBusy}
            onClick={() => handleFormularCreateSection()}
          >
            {formularSectionCreateBusy ? '…' : 'Bereich anlegen'}
          </button>
        </div>
        <div className="formular-center-upload dashboard-formular-upload formular-center-upload--hidden">
          <input
            ref={formularReplaceInputRef}
            type="file"
            accept={FORMULAR_FILE_ACCEPT}
            className="formular-center-file-input"
            onChange={handleFormularReplaceFileChange}
          />
          <input
            ref={formularFileInputRef}
            type="file"
            accept={FORMULAR_FILE_ACCEPT}
            className="formular-center-file-input"
            onChange={handleFormularFileChange}
          />
        </div>
        <p className="formular-center-upload-hint formular-center-upload-hint--block">
          Dateien: max. 100 MB · PDF, Word, Excel, MP4 (Video) – je Bereich über „Datei hinzufügen“.
        </p>
        {formularError && <p className="text-error formular-center-error">{formularError}</p>}
        {formularLoading ? (
          <p>Lade Formulare…</p>
        ) : visibleFormularSections.length > 0 ? (
          <div className="formular-center-sections-admin">
            {visibleFormularSections.map((sec, secIdx) => (
              <section
                key={sec.id}
                className="formular-center-section-block"
                data-fc-section-title={String(sec.title || '').trim().toLowerCase()}
              >
                <div className="formular-center-section-header">
                  {formularEditingSectionId === sec.id ? (
                    <div className="formular-center-edit-panel formular-center-edit-panel--section">
                      <input
                        type="text"
                        className="formular-center-name-field"
                        value={formularEditSectionTitle}
                        onChange={(ev) => setFormularEditSectionTitle(ev.target.value)}
                        maxLength={200}
                        disabled={formularSectionMetaBusy}
                      />
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        disabled={formularSectionMetaBusy}
                        onClick={() => handleFormularSaveSectionTitle()}
                      >
                        {formularSectionMetaBusy ? '…' : 'Speichern'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        disabled={formularSectionMetaBusy}
                        onClick={() => {
                          setFormularEditingSectionId(null);
                          setFormularEditSectionTitle('');
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="formular-center-section-heading">{sec.title || 'Bereich'}</h3>
                      <span className="formular-center-section-controls">
                        <button
                          type="button"
                          className="btn btn--outline btn--small"
                          title="Bereich nach oben"
                          disabled={
                            secIdx === 0 || Boolean(formularSectionMoveBusy) || Boolean(formularSectionDeleteId)
                          }
                          onClick={() => handleFormularSectionMove(sec.id, 'up')}
                        >
                          {formularSectionMoveBusy === `${sec.id}-up` ? '…' : '↑'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--small"
                          title="Bereich nach unten"
                          disabled={
                            secIdx >= visibleFormularSections.length - 1 ||
                            Boolean(formularSectionMoveBusy) ||
                            Boolean(formularSectionDeleteId)
                          }
                          onClick={() => handleFormularSectionMove(sec.id, 'down')}
                        >
                          {formularSectionMoveBusy === `${sec.id}-down` ? '…' : '↓'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--small"
                          disabled={Boolean(formularSectionDeleteId)}
                          onClick={() => {
                            setFormularEditingSectionId(sec.id);
                            setFormularEditSectionTitle(sec.title || '');
                            setFormularError(null);
                          }}
                        >
                          Titel bearbeiten
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary btn--small"
                          disabled={formularUploadBusy || Boolean(formularSectionDeleteId)}
                          onClick={() => handleFormularPickUpload(sec.id)}
                        >
                          {formularUploadBusy ? '…' : 'Datei hinzufügen'}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--small"
                          disabled={formularSectionDeleteId === sec.id}
                          onClick={() => handleFormularDeleteSection(sec.id)}
                        >
                          {formularSectionDeleteId === sec.id ? '…' : 'Bereich löschen'}
                        </button>
                      </span>
                    </>
                  )}
                </div>
                <ul className="formular-center-list">
                  {(sec.items || []).map((it, itemIdx) => (
                    <li key={it.id} className="formular-center-item formular-center-item--dashboard">
                      {formularEditingId === it.id ? (
                        <div className="formular-center-edit-panel">
                          <label className="sr-only" htmlFor={`fc-name-${it.id}`}>
                            Anzeigename
                          </label>
                          <input
                            id={`fc-name-${it.id}`}
                            type="text"
                            className="formular-center-name-field"
                            value={formularEditName}
                            onChange={(ev) => setFormularEditName(ev.target.value)}
                            maxLength={500}
                            disabled={formularMetaBusy}
                          />
                          <label className="sr-only" htmlFor={`fc-desc-${it.id}`}>
                            Beschreibung
                          </label>
                          <input
                            id={`fc-desc-${it.id}`}
                            type="text"
                            className="formular-center-name-field"
                            value={formularEditDescription}
                            onChange={(ev) => setFormularEditDescription(ev.target.value)}
                            maxLength={1000}
                            placeholder="Beschreibung (optional)"
                            disabled={formularMetaBusy}
                          />
                          <button
                            type="button"
                            className="btn btn--primary btn--small"
                            disabled={formularMetaBusy}
                            onClick={() => handleFormularSaveMeta()}
                          >
                            {formularMetaBusy ? '…' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            disabled={formularMetaBusy}
                            onClick={() => {
                              setFormularEditingId(null);
                              setFormularEditName('');
                              setFormularEditDescription('');
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="formular-center-item-order">
                            <button
                              type="button"
                              className="btn btn--outline btn--small"
                              title="Nach oben"
                              disabled={
                                itemIdx === 0 ||
                                Boolean(formularItemMoveBusy) ||
                                Boolean(formularEditingSectionId)
                              }
                              onClick={() => handleFormularItemMove(it.id, 'up')}
                            >
                              {formularItemMoveBusy === `${it.id}-up` ? '…' : '↑'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--outline btn--small"
                              title="Nach unten"
                              disabled={
                                itemIdx >= (sec.items || []).length - 1 ||
                                Boolean(formularItemMoveBusy) ||
                                Boolean(formularEditingSectionId)
                              }
                              onClick={() => handleFormularItemMove(it.id, 'down')}
                            >
                              {formularItemMoveBusy === `${it.id}-down` ? '…' : '↓'}
                            </button>
                          </span>
                          <a
                            href={getFormularCenterDownloadHref(it.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="formular-center-link"
                          >
                            {it.originalName || 'Dokument'}
                          </a>
                          {String(it.description || '').trim() && (
                            <span className="formular-center-item-desc">– {String(it.description || '').trim()}</span>
                          )}
                          <span className="formular-center-dashboard-actions">
                            <button
                              type="button"
                              className="btn btn--outline btn--small"
                              disabled={
                                Boolean(formularDeleteId) ||
                                Boolean(formularReplaceBusyId) ||
                                Boolean(formularEditingSectionId)
                              }
                              onClick={() => {
                                setFormularEditingId(it.id);
                                setFormularEditName(it.originalName || '');
                                setFormularEditDescription(it.description || '');
                                setFormularError(null);
                              }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              type="button"
                              className="btn btn--outline btn--small"
                              disabled={
                                formularDeleteId === it.id ||
                                formularReplaceBusyId === it.id ||
                                Boolean(formularEditingId) ||
                                Boolean(formularEditingSectionId)
                              }
                              onClick={() => handleFormularReplacePick(it.id)}
                            >
                              {formularReplaceBusyId === it.id ? '…' : 'Datei ersetzen'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--small formular-center-delete"
                              disabled={formularDeleteId === it.id}
                              onClick={() => handleFormularDelete(it.id)}
                            >
                              {formularDeleteId === it.id ? '…' : 'Löschen'}
                            </button>
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {(!sec.items || sec.items.length === 0) && (
                  <p className="formular-center-section-empty">Noch keine Dateien in diesem Bereich.</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="formular-center-empty">
            Noch keine Bereiche. Legen Sie oben einen Titel an und klicken Sie auf „Bereich anlegen“.
          </p>
        )}
      </div>
    </div>
  );
}
