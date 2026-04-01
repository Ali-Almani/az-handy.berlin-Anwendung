import { Link } from 'react-router-dom';
import './Documentation.scss';

/** Statische Screenshots unter client/public/photo/ (URL /photo/…) */
const HANDBOOK_IMG = '/photo';

const DocFigure = ({ name, alt, caption }) => (
  <figure className="doc-figure">
    <img
      src={`${HANDBOOK_IMG}/${name}.png`}
      alt={alt}
      loading="lazy"
      className="doc-figure__img"
    />
    {caption ? <figcaption className="doc-figure__caption">{caption}</figcaption> : null}
  </figure>
);

const Documentation = () => {
  return (
    <div className="documentation">
      <div className="card documentation__card">
        <div className="card-header documentation__card-header">
          <h1 className="card-title documentation__title">Benutzerhandbuch</h1>
          <p className="documentation__lead">
            <strong>
              <a href="https://www.az-intranet.de" target="_blank" rel="noopener noreferrer">
                www.az-intranet.de
              </a>
            </strong>{' '}
            – A-Z Handy Shop GmbH
          </p>
        </div>

        <div className="card-body documentation__card-body">
          <section className="doc-section" id="allgemeines">
            <h2>Allgemeines</h2>
            <p>
              Das Intranet der <strong>A-Z Handy Shop GmbH</strong> ist ein internes System, um:
            </p>
            <ul>
              <li>den <strong>Informationsfluss</strong> an die Mitarbeitenden sicherzustellen;</li>
              <li>
                ein <strong>IMEI-Verwaltungstool</strong> für Aufträge bereitzustellen;
              </li>
              <li>
                ein <strong>Voucher-Verwaltungstool</strong> für F&amp;F, Ay Yildiz usw. bereitzustellen;
              </li>
              <li>
                eine <strong>Mitarbeiterübersicht</strong> inkl. Rufnummern und Standortauskunft zu
                ermöglichen;
              </li>
              <li>
                <strong>Dokumentenvorlagen</strong> für eigene Dokumente der A-Z Handy Shop anzubieten;
              </li>
              <li>
                eine <strong>Übersicht aktueller Zahlen und Ziele</strong> zu liefern.
              </li>
            </ul>
            <p>
              Das Intranet wird kontinuierlich ausgebaut und erweitert.{' '}
              <strong>Vorschläge zum Programm sind ausdrücklich erwünscht.</strong>
            </p>
            <p>
              <strong>Programmierung:</strong> Ali Almani.
            </p>
            <p>
              <strong>Fragen:</strong>{' '}
              <a href="mailto:a.almani@az-handy.berlin">a.almani@az-handy.berlin</a>
            </p>
          </section>

          <section className="doc-section" id="nutzen">
            <h2>Was ist der Nutzen des Programms?</h2>
            <p>
              Das Programm entstand aus dem Alltag im Team: Nachfragen wie „Ich brauche mal eine IMEI
              S26?“ oder „Wer hat einen F&amp;F-Voucher für mich?“ sollen gebündelt und zuverlässig
              beantwortbar sein.
            </p>
            <p>
              Es soll Mitarbeitenden im Shop die Arbeit erleichtern: alle nötigen Informationen
              schnell griffbereit haben, um den Antrag mit dem Kunden abzuschließen.
            </p>
            <p>
              Nachrichten in Teams geraten leicht aus dem Blick und werden vergessen. Nachrichten in
              diesem System bleiben sichtbar und auffindbar.
            </p>
            <p>
              <strong>Dienstanweisungen</strong> (z.&nbsp;B. von Akram) müssen von allen Mitarbeitenden
              bestätigt werden – damit wird der administrative Aufwand <strong>deutlich reduziert</strong>.
            </p>
          </section>

          <section className="doc-section" id="funktionen">
            <h2>Übersicht der aktuellen Funktionen</h2>
            <ul>
              <li>
                <strong>Dashboard</strong> (Kennzahlen)
              </li>
              <li>
                <strong>IMEIs</strong>
              </li>
              <li>
                <strong>Voucher</strong>
              </li>
              <li>
                <strong>Anweisungen</strong>
              </li>
              <li>
                <strong>News</strong>
              </li>
              <li>
                <strong>Formular-Center</strong>
              </li>
              <li>
                <strong>Einstellungen</strong>
              </li>
            </ul>
          </section>

          <section className="doc-section" id="anmeldung">
            <h2>Anmeldung</h2>
            <p>
              Melden Sie sich mit Ihrer <strong>E-Mail</strong> und dem Ihnen mitgeteilten{' '}
              <strong>Einmalpasswort</strong> an.
            </p>
          </section>

          <section className="doc-section" id="passwort">
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

          <section className="doc-section" id="dashboard">
            <h2>Dashboard (Kennzahlen)</h2>
            <p>
              Das Dashboard ist die Startseite des A-Z-Intranets. Wichtiger Bestandteil sind die{' '}
              <strong>Kennzahlen</strong> der A-Z in Bezug auf den Mobilfunkpartner Telefónica. Die Zahlen
              werden derzeit <strong>manuell</strong> aktualisiert. Ergänzend gibt es den Bereich{' '}
              <strong>News</strong>. Diese Seite wird sich weiterentwickeln.
            </p>
            <DocFigure
              name="bild1"
              alt="Dashboard mit Kennzahlen (Monats- und Quartalsziele) und News-Bereich"
              caption="Abb. 1: Dashboard – Kennzahlen und News"
            />
          </section>

          <section className="doc-section" id="anweisungen">
            <h2>Anweisungen</h2>
            <p>
              Anweisungen sind Nachrichten der Geschäftsführung: wichtige Informationen, bei denen
              festgestellt werden soll, dass alle Mitarbeitenden informiert wurden bzw. die Kenntnis{' '}
              <strong>bestätigen</strong>.
            </p>
            <DocFigure
              name="bild2"
              alt="Modal: Neue Nachricht von Akram Zalloom mit Button Gelesen und verstanden"
              caption="Abb. 2: Anweisung im Vordergrund – zur Kenntnis bestätigen"
            />
            <p>
              Anweisungen erscheinen im Vordergrund des Dashboards. Erst nach Lesen und{' '}
              <strong>Bestätigung</strong> können Sie das System weiter wie gewohnt nutzen. Alle
              Anweisungen werden gespeichert und können später erneut eingesehen werden (z.&nbsp;B. unter{' '}
              <Link to="/archiv-anweisung">Archiv Anweisung</Link>).
            </p>
          </section>

          <section className="doc-section" id="news">
            <h2>News</h2>
            <p>
              <strong>News</strong> unterscheiden sich von Anweisungen: Es besteht{' '}
              <strong>keine Pflicht</strong>, sie zu lesen. Sie informieren über Neuigkeiten zu
              Telefónica. Inhalte aus den Mails von Kathrin werden in das System übernommen, damit alle
              schnell informiert sind (z.&nbsp;B. <Link to="/archiv-news">Archiv News</Link>).
            </p>
          </section>

          <section className="doc-section" id="imeis">
            <h2>IMEIs</h2>
            <p>
              Der Hauptgrund für dieses System ist die <strong>IMEI-Verwaltung</strong>.
            </p>
            <DocFigure
              name="bild3"
              alt="IMEI-Verwaltung: Filter nach Hersteller, Modell, Variante, Speicher und Tabelle mit IMEIs"
              caption="Abb. 3: IMEI-Verwaltung – Auswahl und Liste"
            />
            <p>
              Alle angemeldeten Benutzer sehen die <strong>gemeinsame IMEI-Liste</strong> der A-Z Handy
              Shop GmbH. Sie können IMEIs <strong>reservieren</strong>, <strong>kopieren</strong>, wieder
              freigeben oder aus dem Ablauf heraus <strong>bestätigen/ablehnen</strong>.
            </p>

            <h3>Reservieren und IMEI kopieren</h3>
            <p>
              Alle Geräte im Bestand der A-Z stehen in dieser Liste. Neue Lieferungen werden regelmäßig
              aktualisiert. <strong>IMEIs, die nicht in der Liste sind, gibt es nicht im Bestand</strong> –
              bitte beim Verkauf beachten.
            </p>
            <DocFigure
              name="bild4"
              alt="Zeile mit maskierter IMEI und Checkbox Reservieren"
              caption="Abb. 4: IMEI auswählen und reservieren"
            />
            <p>
              Wählen Sie das Gerät über die Filter: <strong>Hersteller</strong>, <strong>Typ</strong>,{' '}
              <strong>Speicher</strong>, <strong>Farbe</strong> – dann sehen Sie die verfügbaren IMEIs.
              Mit Klick auf eine IMEI können Sie die Option <strong>Reservieren</strong> nutzen.
            </p>
            <p>
              Nach einer Reservierung wird die IMEI in die <strong>Zwischenablage</strong> kopiert und kann
              direkt in den Vertrag eingefügt werden.
            </p>
            <p className="doc-note">
              Es gibt ein Limit: pro 30&nbsp;Minuten nur eine begrenzte Anzahl Kopien. Bei Erreichen des
              Limits können Sie eine <strong>Extra-Kopie</strong> bei <strong>Melih</strong> anfragen.
            </p>

            <h3>Verlauf und Vertragsstatus</h3>
            <p>
              Unter <strong>Verlauf</strong> sehen Sie, welche IMEIs Sie kopiert haben. Dort können Sie
              festhalten, ob der Vertrag von Telefónica <strong>abgelehnt</strong> oder{' '}
              <strong>genehmigt</strong> wurde. Bei <strong>Abgelehnt</strong> wird die IMEI wieder dem
              Bestand zugeführt, und kollegial die nächste Person kann reservieren.
            </p>
            <DocFigure
              name="bild5"
              alt="Verlauf-Dialog mit Aktion wählen, Angenommen und Abgelehnt"
              caption="Abb. 5: Verlauf – Status setzen"
            />
            <p>
              Wenn der Vertrag genehmigt ist, bestätigen Sie dies. Es erscheint ein <strong>Hinweisdialog</strong>{' '}
              zum Check-out (Partos).
            </p>
            <DocFigure
              name="bild6"
              alt="Sicherheitsabfrage: CHECK-OUT bei Partos mit Ja und Nein"
              caption="Abb. 6: Hinweis nach Vertragsfreigabe – Check-out prüfen"
            />
            <p>
              Bitte prüfen Sie, ob der <strong>Check-out</strong> durchgeführt wurde. Mit dieser
              Absicherung sollen vergessene Check-outs reduziert und Verluste für die A-Z Handy Shop
              minimiert werden.
            </p>
            <p>
              Halten Sie Ihre Verlaufsliste nach Möglichkeit <strong>leer</strong>. Bleiben IMEIs länger als{' '}
              <strong>3&nbsp;Tage</strong> unbearbeitet, wird der Shopleiter informiert, um gemeinsam zu
              bereinigen. Nach <strong>5&nbsp;Tagen</strong> wird Akram die Liste mit dem Mitarbeiter
              bearbeiten; der Termin findet in der <strong>Zentrale</strong> statt.
            </p>
          </section>

          <section className="doc-section" id="voucher">
            <h2>Voucher</h2>
            <p>
              Voucher funktionieren ähnlich wie IMEIs: abrufen und reservieren. Bei genehmigtem Antrag
              bitte den Voucher bestätigen; bei Ablehnung dem System mitteilen – der Voucher geht wieder in
              den Pool.
            </p>
            <DocFigure
              name="bild7"
              alt="Voucher-Verwaltung mit Tabs und maskierten Vouchernummern"
              caption="Abb. 7: Voucher-Verwaltung"
            />
            <p>
              Mitarbeitende, die Voucher <strong>zur Liste hinzufügen</strong> möchten, nutzen dafür die
              Dashboard-Funktion. Derzeit ist dies v. a. <strong>Shopleitenden</strong> vorbehalten.
            </p>
          </section>

          <section className="doc-section" id="formularzentrum">
            <h2>Formular-Center</h2>
            <p>
              Hier werden <strong>Vorlagen</strong> für den täglichen Bedarf bereitgestellt (z.&nbsp;B.
              Vorvertrag). Vorschläge für zusätzliche Dokumente sind willkommen –{' '}
              <Link to="/formular-center">Formularzentrum</Link> ist offen für Erweiterungen gemeinsam mit
              dem Team.
            </p>
          </section>

          <section className="doc-section" id="ideen">
            <h2>Ideen für die Zukunft</h2>
            <p>Geplante Erweiterungen unter anderem:</p>
            <ul>
              <li>
                <strong>Mitarbeiterübersicht</strong> mit Foto, Funktion, Standort und Telefonnummer – für
                einen schnellen Überblick für neue Kolleginnen und Kollegen in der A-Z.
              </li>
            </ul>
          </section>

          <section className="doc-section doc-section--help" id="hilfe">
            <h2>Hilfe</h2>
            <p>
              Kontakt:{' '}
              <a href="mailto:a.almani@az-handy.berlin">a.almani@az-handy.berlin</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
