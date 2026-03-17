import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { isBüroMitarbeiter } from '../../utils/roles';
import './Documentation.scss';

const Documentation = () => {
  const { user } = useAuth();
  const isBüro = isBüroMitarbeiter(user);

  return (
    <div className="documentation">
      <div className="documentation-header">
        <h1>Benutzerhandbuch</h1>
        <p>Anleitung für az-handy.berlin – IMEI-Verwaltung und Mitarbeiter-System</p>
      </div>

      <section className="doc-section">
        <h2>Was ist az-handy.berlin?</h2>
        <p>
          az-handy.berlin ist ein internes Mitarbeiterverwaltungssystem für die IMEI-Verwaltung.
          Alle eingeloggten Benutzer sehen die gemeinsame IMEI-Liste (von Melih hochgeladen),
          können IMEIs kopieren und ihren eigenen Verlauf einsehen.
        </p>
      </section>

      <section className="doc-section">
        <h2>Anmeldung</h2>
        <p>
          Melden Sie sich mit Ihrer E-Mail und Ihrem Passwort an. Nach der Anmeldung erscheint
          die Startseite mit der aktuellen Anweisung (falls vorhanden).
        </p>
      </section>

      <section className="doc-section">
        <h2>Passwort ändern</h2>
        <ol>
          <li>Klicken Sie auf Ihr Profilbild (oben rechts) und wählen Sie <strong>Einstellungen</strong>.</li>
          <li>Scrollen Sie zum Bereich <strong>Passwort ändern</strong>.</li>
          <li>Geben Sie Ihr aktuelles Passwort ein.</li>
          <li>Geben Sie das neue Passwort ein (mindestens 6 Zeichen).</li>
          <li>Bestätigen Sie das neue Passwort.</li>
          <li>Klicken Sie auf <strong>Passwort ändern</strong>.</li>
        </ol>
      </section>

      <section className="doc-section">
        <h2>IMEI-Verwaltung</h2>
        <p>
          Unter <Link to="/imeis">IMEIs</Link> sehen Sie die gemeinsame IMEI-Liste. Alle Benutzer
          haben Zugriff auf dieselbe Liste.
        </p>

        <h3>IMEI kopieren</h3>
        <ol>
          <li>Klicken Sie auf eine IMEI-Zelle, um die Zeile zu markieren.</li>
          <li>In der Spalte <strong>Aktion</strong> erscheint eine Checkbox mit der Option <strong>Kopieren</strong>.</li>
          <li>Wählen Sie <strong>Kopieren</strong> – die IMEI wird in die Zwischenablage kopiert.</li>
          <li>Alternativ: Markieren Sie mehrere Zellen (Klicken/Ziehen oder Shift+Klick für Bereich) und nutzen Sie die Kopier-Aktion.</li>
        </ol>
        <p className="doc-note">
          Es gibt ein Limit: Pro 30 Minuten können Sie eine begrenzte Anzahl IMEIs kopieren.
          Wenn Sie das Limit erreicht haben, können Sie eine <strong>Extra-Kopie</strong> bei Melih anfragen.
        </p>

        <h3>Suche und Filter</h3>
        <p>
          Nutzen Sie das Suchfeld, um IMEIs zu finden. Die Filter (Hersteller, Version, Variante, GB, Produkt)
          helfen, die Liste einzugrenzen.
        </p>

        <h3>Verlauf</h3>
        <p>
          Klicken Sie auf <strong>Verlauf</strong>, um Ihre kopierten IMEIs zu sehen. Dort können Sie:
        </p>
        <ul>
          <li>Ihre eigenen Kopien einsehen</li>
          {isBüro && (
            <>
              <li>Einträge anderer als <strong>angenommen</strong> oder <strong>abgelehnt</strong> markieren</li>
              <li>Eine <strong>Erinnerung</strong> an Mitarbeiter senden („Benutzt du noch diese IMEI?“)</li>
            </>
          )}
        </ul>

        <h3>Reservieren</h3>
        <p>
          Beim Markieren einer Zeile können Sie die Checkbox <strong>Reservieren</strong> aktivieren,
          um eine IMEI zu reservieren.
        </p>

        {isBüro && (
          <>
            <h3>Excel-Upload (nur Melih)</h3>
            <p>
              Melih kann im <Link to="/dashboard">Dashboard</Link> Excel- oder CSV-Dateien
              hochladen. Die IMEIs erscheinen danach für alle Benutzer.
            </p>
          </>
        )}
      </section>

      <section className="doc-section">
        <h2>Einstellungen</h2>
        <p>
          Unter <Link to="/settings">Einstellungen</Link> können Sie:
        </p>
        <ul>
          <li><strong>Profil bearbeiten</strong> – Profilbild ändern oder entfernen</li>
          <li><strong>Passwort ändern</strong> – siehe oben</li>
          {user && (user.role === 'Administrator' || user.role?.toLowerCase?.().includes('admin')) && (
            <li><strong>Benutzerverwaltung</strong> – Benutzer anlegen, bearbeiten, löschen (nur Administrator)</li>
          )}
        </ul>
      </section>

      <section className="doc-section">
        <h2>Archiv Anweisung</h2>
        <p>
          Alle Benutzer (außer Admin) sehen unter <strong>Archiv Anweisung</strong> die gespeicherten
          Nachrichten und Anweisungen. Der Administrator erstellt diese im Dashboard.
        </p>
      </section>

      <section className="doc-section doc-section--help">
        <h2>Hilfe</h2>
        <p>
          Bei Fragen kontaktieren Sie <a href="mailto:a.almani@az-handy.berlin">a.almani@az-handy.berlin</a>.
        </p>
      </section>
    </div>
  );
};

export default Documentation;
