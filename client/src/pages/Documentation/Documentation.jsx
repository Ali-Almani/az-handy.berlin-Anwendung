import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  isBüroMitarbeiter,
  isAdmin,
  canAccessDashboard,
  canAccessVoucherList,
  canShowExcelUpload
} from '../../utils/roles';
import './Documentation.scss';

const HANDBOOK_IMG = '/docs/handbook';

const DocFigure = ({ name, ext = 'svg', alt, caption }) => (
  <figure className="doc-figure">
    <img
      src={`${HANDBOOK_IMG}/${name}.${ext}`}
      alt={alt}
      loading="lazy"
      className="doc-figure__img"
    />
    {caption ? <figcaption className="doc-figure__caption">{caption}</figcaption> : null}
  </figure>
);

const Documentation = () => {
  const { user } = useAuth();
  const isBüro = isBüroMitarbeiter(user);
  const showDashboardDoc = user && canAccessDashboard(user);
  const showVoucherDoc = user && canAccessVoucherList(user);
  const showExcelDoc = user && canShowExcelUpload(user);

  return (
    <div className="documentation">
      <div className="card documentation__card">
        <div className="card-header documentation__card-header">
          <h1 className="card-title documentation__title">Benutzerhandbuch</h1>
          <p className="documentation__lead">
            <strong>az-intranet</strong> / <strong>az-handy.berlin</strong> – internes
            Mitarbeiterverwaltungssystem mit Modulen für Anweisungen, IMEIs, Voucher, Formulare und
            Verwaltungsfunktionen. Diese Seite fasst den aktuellen Funktionsumfang verständlich zusammen
            und ergänzt das Dokument <strong>Benutzerhandbuch_az-intranet</strong> durch Abbildungen und
            Direktlinks in der Anwendung.
          </p>
          <p className="documentation__meta">
            Die Grafiken liegen unter <code>client/public/docs/handbook/</code>. Echte Screenshots aus
            Word speichern Sie dort z.&nbsp;B. als <code>anmeldung.png</code> und setzen bei der jeweiligen{' '}
            <code>DocFigure</code> das Prop <code>ext=&quot;png&quot;</code> (Dateiname ohne Endung in{' '}
            <code>name</code>).
          </p>
        </div>
        <div className="card-body documentation__card-body">
          <section className="doc-section" id="einleitung">
            <h2>Einleitung und Zielgruppe</h2>
            <p>
              Das Intranet richtet sich an <strong>angemeldete Mitarbeitende</strong> der az-handy.berlin.
              Je nach <strong>Rolle</strong> und <strong>Einsatzort</strong> sehen Sie unterschiedliche
              Menüpunkte (z.&nbsp;B. IMEI- oder Voucher-Bereich). Die Oberfläche wird kontinuierlich
              erweitert; nicht jede später geplante Funktion ist hier bereits beschrieben.
            </p>
            <p>
              Nutzen Sie einen <strong>aktuellen Browser</strong> (z.&nbsp;B. Edge, Chrome, Firefox).
              Bei Anzeigeproblemen zuerst einen <strong>harten Reload</strong> (Strg+F5) oder ein
              privates Fenster versuchen.
            </p>
          </section>

          <section className="doc-section" id="anmeldung">
            <h2>Anmeldung und Abmeldung</h2>
            <p>
              Öffnen Sie die Intranet-Adresse Ihres Unternehmens (z.&nbsp;B.{' '}
              <strong>www.az-intranet.de</strong>). Auf der Anmeldeseite geben Sie{' '}
              <strong>E-Mail</strong> und <strong>Passwort</strong> ein und bestätigen mit{' '}
              <strong>Anmelden</strong>.
            </p>
            <DocFigure
              name="anmeldung"
              alt="Schemaskizze: Felder E-Mail und Passwort und Anmelden-Button"
              caption="Abb. 1: Ablauf der Anmeldung (schematisch)"
            />
            <p>
              Nach erfolgreicher Anmeldung gelangen Sie zur <strong>Startseite</strong> mit der aktuellen
              Anweisung, sofern eine hinterlegt ist. Über das <strong>Profilmenü</strong> (Avatar oben
              rechts) können Sie sich wieder <strong>abmelden</strong>.
            </p>
          </section>

          <section className="doc-section" id="navigation">
            <h2>Aufbau der Oberfläche</h2>
            <p>
              Oben finden Sie die <strong>Navigationsleiste</strong> mit Logo und Links zu den Bereichen,
              für die Sie berechtigt sind. Darunter liegt der <strong>Inhalt</strong> der gewählten Seite.
            </p>
            <DocFigure
              name="navigation"
              alt="Schemaskizze: Balken mit Logo und Menüpunkten über Inhaltsfläche"
              caption="Abb. 2: Prinzipielle Struktur aus Navigation und Inhalt"
            />
          </section>

          <section className="doc-section" id="startseite">
            <h2>Startseite</h2>
            <p>
              Die <Link to="/">Startseite</Link> zeigt die <strong>aktuelle Anweisung</strong> sowie
              Hinweise im Rahmen Ihrer Berechtigungen. Von hier aus erreichen Sie über die Navigation alle
              weiteren Module.
            </p>
          </section>

          {showDashboardDoc && (
            <section className="doc-section" id="dashboard">
              <h2>Dashboard</h2>
              <p>
                Im <Link to="/dashboard">Dashboard</Link> bündeln sich verwaltungsnahe Funktionen.
                <strong> Administratoren</strong> nutzen u.&nbsp;a. die{' '}
                <strong>Benutzerverwaltung</strong> (anlegen, bearbeiten, Rollen vergeben).{' '}
                <strong>Büro</strong> und <strong>Admin</strong> sehen je nach Konfiguration Zusatzbereiche
                wie Hinweise, News oder Importe.
              </p>
              <DocFigure
                name="dashboard"
                alt="Schemaskizze Dashboard mit Hinweis-, News- und Verwaltungsflächen"
                caption="Abb. 3: Dashboard – Bereiche schematisch"
              />
              {showExcelDoc && (
                <p>
                  Personen mit Berechtigung können hier <strong>Excel- oder CSV-Dateien</strong> für die
                  gemeinsame <strong>IMEI-Liste</strong> hochladen. Die Daten stehen anderen Nutzenden
                  nach dem Import zur Verfügung.
                </p>
              )}
              {user && isAdmin(user) && (
                <p>
                  Als <strong>Administrator</strong> pflegen Sie Benutzerkonten und relevante
                  Verwaltungsoptionen zentral in diesem Bereich.
                </p>
              )}
            </section>
          )}

          <section className="doc-section" id="imeis">
            <h2>IMEI-Verwaltung</h2>
            <p>
              Unter <Link to="/imeis">IMEIs</Link> arbeiten berechtigte Mitarbeitenden mit einer{' '}
              <strong>gemeinsamen Liste</strong>. (Nutzer mit Einsatzort &bdquo;Zentrale&ldquo; ohne
              Admin/Büro-Rolle sehen den Menüpunkt ggf. nicht – das entspricht der internen Regelung.)
            </p>
            <DocFigure
              name="imei-tabelle"
              alt="Schemaskizze einer IMEI-Tabelle mit Spalten und Reservieren-Option"
              caption="Abb. 4: IMEI-Liste (schematisch)"
            />
            <h3>Reservieren und kopieren</h3>
            <p>
              Markieren Sie eine Zeile (z.&nbsp;B. durch Klick auf eine IMEI-Zelle). In der Spalte{' '}
              <strong>Aktion</strong> können Sie <strong>Reservieren</strong> wählen; die IMEI wird in die
              Zwischenablage übernommen.
            </p>
            <p className="doc-note">
              Es gilt ein zeitliches <strong>Kopier-Limit</strong> (z.&nbsp;B. pro 30&nbsp;Minuten). Wenn
              Sie es erreichen, können Sie eine <strong>Extra-Kopie</strong> beim Büro anfragen (je nach
              Konfiguration über die Oberfläche).
            </p>
            <h3>Suche und Filter</h3>
            <p>
              Suche und Filter (Hersteller, Version, Variante, Speicher, Produkt u.&nbsp;a.) grenzen die
              Liste ein.
            </p>
            <h3>Verlauf</h3>
            <p>
              Unter <strong>Verlauf</strong> sehen Sie Ihre kopierten IMEIs. Büro- und
              Admin-Funktionen umfassen dort u.&nbsp;a. das Markieren von Aktionen und das Senden von
              Erinnerungen an Kolleginnen und Kollegen.
            </p>
          </section>

          {showVoucherDoc && (
            <section className="doc-section" id="voucher">
              <h2>Voucher</h2>
              <p>
                Der Bereich <Link to="/voucher">Voucher</Link> dient der Bearbeitung und Nachverfolgung von
                Voucher-Daten entsprechend Ihrer Rolle (Liste einsehen, Zeilen bearbeiten, Verlauf, ggf.
                Anfragen ans Büro).
              </p>
            </section>
          )}

          <section className="doc-section" id="formularzentrum">
            <h2>Formularzentrum</h2>
            <p>
              Unter <Link to="/formular-center">Formularzentrum</Link> stehen bereitgestellte{' '}
              <strong>Formulare und Dokumente</strong> zum Download bzw. Upload zur Verfügung – je nach
              Ausstattung Ihres Systems.
            </p>
          </section>

          <section className="doc-section" id="archiv">
            <h2>Archiv</h2>
            <p>
              <strong>Archiv Anweisung:</strong> vergangene und aktuelle Anweisungen, die für alle
              Leserinnen und Leser freigegeben sind –{' '}
              <Link to="/archiv-anweisung">Archiv Anweisung</Link>.
            </p>
            <p>
              <strong>Archiv News:</strong> veröffentlichte News und Medien –{' '}
              <Link to="/archiv-news">Archiv News</Link>.
            </p>
          </section>

          <section className="doc-section" id="einstellungen">
            <h2>Einstellungen und Passwort</h2>
            <p>
              Im Menü unter Ihrem Profil wählen Sie <Link to="/settings">Einstellungen</Link>. Dort können
              Sie <strong>Profilangaben</strong> und das <strong>Profilbild</strong> pflegen sowie das{' '}
              <strong>Passwort ändern</strong>.
            </p>
            <DocFigure
              name="einstellungen"
              alt="Schemaskizze Einstellungen mit Profil und Passwortbereich"
              caption="Abb. 5: Einstellungen – Bereiche schematisch"
            />
            <ol>
              <li>Profil öffnen (Avatar oben rechts) → <strong>Einstellungen</strong>.</li>
              <li>Abschnitt <strong>Passwort ändern</strong> aufsuchen.</li>
              <li>Aktuelles Passwort und neues Passwort (mind. 6 Zeichen) eingeben und bestätigen.</li>
              <li>Mit <strong>Passwort ändern</strong> speichern.</li>
            </ol>
          </section>

          {isBüro && (
            <section className="doc-section" id="buero">
              <h2>Ergänzung für Büro</h2>
              <p>
                Im IMEI-<strong>Verlauf</strong> stehen Ihnen Zusatzaktionen zur Verfügung (z.&nbsp;B.
                Annehmen/Ablehnen, Erinnerungen), soweit vom System vorgesehen.
              </p>
            </section>
          )}

          <section className="doc-section doc-section--help" id="hilfe">
            <h2>Hilfe und Rückfragen</h2>
            <p>
              Technische oder organisatorische Fragen zu diesem Handbuch oder zur Anwendung richten Sie an{' '}
              <a href="mailto:a.almani@az-handy.berlin">a.almani@az-handy.berlin</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
