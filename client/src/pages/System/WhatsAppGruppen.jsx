import { useEffect, useState } from 'react';
import { getInboxGroupsApi, saveInboxGroupsApi } from '../../services/whatsapp.service';

const MAX_GROUPS = 10;

export default function WhatsAppGruppen() {
  const [groups, setGroups] = useState([]);
  const [displayWaId, setDisplayWaId] = useState('');
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const applyPayload = (res) => {
    setGroups(Array.isArray(res?.groups) ? res.groups : []);
    setDisplayWaId(String(res?.displayWaId || ''));
    setStaff(Array.isArray(res?.staff) ? res.staff : []);
  };

  useEffect(() => {
    let on = true;
    getInboxGroupsApi()
      .then((res) => {
        if (!on) return;
        applyPayload(res);
        setError('');
      })
      .catch((err) => {
        if (!on) return;
        setError(err.response?.data?.message || err.message || 'Gruppen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => { on = false; };
  }, []);

  const persist = async (nextGroups) => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await saveInboxGroupsApi({
        displayWaId,
        groups: nextGroups.map((group) => ({
          id: group.id,
          name: group.name,
          viewerIds: group.viewerIds || []
        }))
      });
      applyPayload(res);
      setSaved(true);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Speichern fehlgeschlagen.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addGroup = async () => {
    const nextName = name.replace(/\s+/g, ' ').trim();
    if (nextName.length < 2) {
      setError('Gruppenname mindestens 2 Zeichen.');
      return;
    }
    if (groups.length >= MAX_GROUPS) {
      setError('Höchstens 10 Gruppen.');
      return;
    }
    if (groups.some((group) => String(group.name || '').toLowerCase() === nextName.toLowerCase())) {
      setError(`Name „${nextName}“ gibt es schon.`);
      return;
    }
    const ok = await persist([...groups, { name: nextName, viewerIds: [] }]);
    if (ok) setName('');
  };

  const copyLink = async (group) => {
    const link = String(group.link || '').trim();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(group.id);
      window.setTimeout(() => setCopiedId((current) => (current === group.id ? '' : current)), 1600);
    } catch {
      setError('Link konnte nicht kopiert werden.');
    }
  };

  const toggleViewer = (groupId, userId) => {
    const uid = String(userId);
    persist(groups.map((group) => {
      if (group.id !== groupId) return group;
      const viewerIds = group.viewerIds || [];
      const has = viewerIds.some((id) => String(id) === uid);
      return {
        ...group,
        viewerIds: has ? viewerIds.filter((id) => String(id) !== uid) : [...viewerIds, uid]
      };
    }));
  };

  const removeGroup = (groupId) => {
    persist(groups.filter((group) => group.id !== groupId));
  };

  if (loading) return <p className="auto-flow">Gruppen werden geladen…</p>;

  return (
    <section className="auto-flow wa-gruppen" aria-label="WhatsApp-Gruppen">
      <p className="wa-gruppen__hint">
        Sublink auf der Nummer +49 30 585812888. Der Kunde sendet den Gruppennamen als erste Nachricht.
        Administrator sieht alle Gruppen.
      </p>
      <div className="auto-flow__bar">
        <label className="auto-flow__wait">
          Neue Gruppe
          <span>
            <input
              className="form-input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="z. B. kundenservice"
              maxLength={40}
              aria-label="Gruppenname"
            />
            <button type="button" className="btn btn--primary btn--small" onClick={addGroup} disabled={saving}>
              Anlegen
            </button>
          </span>
        </label>
      </div>
      <div className="auto-flow-list">
        {groups.map((group) => (
          <article key={group.id} className="auto-flow-card auto-flow-card--open">
            <div className="auto-flow-card__head">
              <strong>{group.name}</strong>
              <button type="button" className="btn btn--small" onClick={() => copyLink(group)}>
                {copiedId === group.id ? 'Kopiert' : 'Link kopieren'}
              </button>
              <button type="button" className="btn btn--small" onClick={() => removeGroup(group.id)} disabled={saving}>
                Löschen
              </button>
            </div>
            <input className="form-input" value={group.link || ''} readOnly aria-label={`Link ${group.name}`} />
            <div className="wa-gruppen-staff">
              {staff.length ? staff.map((person) => {
                const checked = (group.viewerIds || []).some((id) => String(id) === String(person.id));
                return (
                  <label key={`${group.id}-${person.id}`} className="wa-gruppen-staff__item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleViewer(group.id, person.id)}
                      disabled={saving}
                    />
                    {person.name}
                    <span>{person.role}</span>
                  </label>
                );
              }) : (
                <p>Keine Ticketing-Mitarbeiter gefunden.</p>
              )}
            </div>
          </article>
        ))}
      </div>
      {saved ? <span role="status">Gespeichert.</span> : null}
      {error ? <p className="vorvertrag-error" role="alert">{error}</p> : null}
    </section>
  );
}
