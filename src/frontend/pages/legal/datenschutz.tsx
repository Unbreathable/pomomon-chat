import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";

export const datenschutzPage = async (c: Context<AuthContext>) => {
  return html(
    <Layout c={c}>
      <div class="container max-w-3xl p-4 sm:p-8">
        <article class="prose">
          <h1>Datenschutzerklärung</h1>

          <h2>1. Grundlegendes</h2>
          <p>
            Diese Chat-Plattform ist ein persönliches Projekt und dient der
            Kommunikation innerhalb einer geschlossenen Gruppe. Ich nehme den
            Schutz deiner persönlichen Daten sehr ernst und verarbeite diese
            ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO,
            TMG).
          </p>
          <p>
            <strong>Privacy by Design:</strong> Ich gebe grundsätzlich keine
            Daten an Dritte weiter und verwende keine Tracking-Tools oder
            Analytics-Dienste. Die Privatsphäre meiner Nutzer hat oberste
            Priorität.
          </p>

          <h2>2. Verantwortlicher</h2>
          <p>
            Verantwortlicher für die Datenverarbeitung auf dieser Website ist:
            <br />
            Julian "Unbreathable" Golenhofen
            <br />
            c/o IP-Management #6901
            <br />
            Ludwig-Erhard-Straße 18
            <br />
            20459 Hamburg
            <br />
            E-Mail: legal[at]liphium.com
          </p>

          <h2>3. Datenerfassung auf dieser Website</h2>

          <h3>Server-Log-Dateien</h3>
          <p>
            Bei jedem Zugriff auf diese Webseite werden automatisch technische
            Informationen in Server-Log-Dateien gespeichert. Folgende Daten
            können anonymisiert gespeichert werden:
          </p>
          <ul>
            <li>IP-Adresse (anonymisiert)</li>
            <li>Datum und Uhrzeit der Anfrage</li>
            <li>Aufgerufene Seite/Datei</li>
            <li>Übertragene Datenmenge</li>
            <li>Browsertyp und -version</li>
            <li>Betriebssystem</li>
          </ul>
          <p>
            Diese Daten sind nicht bestimmten Personen zuordenbar und werden
            ausschließlich zur Fehleranalyse und Sicherheit des Systems
            verwendet.
          </p>

          <h3>Cookies</h3>
          <p>
            Diese Webseite verwendet ausschließlich technisch notwendige
            Cookies:
          </p>
          <ul>
            <li>
              <strong>theme:</strong> Speichert deine Präferenz für das
              Hell/Dunkel-Design
            </li>
            <li>
              <strong>session:</strong> Session-Cookie für die Authentifizierung
            </li>
            <li>
              <strong>disable_gifs:</strong> Speichert deine Einstellung, ob
              GIFs deaktiviert sind (verhindert Verbindungen zum externen
              GIF-Dienst KLIPY)
            </li>
          </ul>
          <p>
            Es werden keine Tracking-Cookies, Werbe-Cookies oder Cookies von
            Drittanbietern verwendet.
          </p>

          <h3>Benutzerkonten</h3>
          <p>
            Für die Nutzung der Chat-Plattform ist eine Registrierung
            erforderlich. Die Registrierung erfolgt unter umständen über einen
            Invite-Token, der von einem Administrator bereitgestellt wird.
          </p>
          <p>Bei der Registrierung werden folgende Daten gespeichert:</p>
          <ul>
            <li>Benutzername (frei wählbar)</li>
            <li>Passwort (verschlüsselt gespeichert)</li>
            <li>
              Zugeordneter Realname (vom Administrator bei Erstellung des
              Invite-Tokens angegeben)
            </li>
            <li>Profilbild und Bio (optional)</li>
          </ul>

          <h3>Chat-Nachrichten</h3>
          <p>
            Alle Chat-Nachrichten, die du sendest, werden auf dem Server
            gespeichert. Die Nachrichten sind für alle auf dem Server
            registrierten Benutzer sichtbar.
          </p>
          <p>
            Nur System-Administratoren können Chatrooms und Nachrichten
            dauerhaft löschen. Gelöschte Inhalte werden dauerhaft entfernt.
            Durch Nutzer gelöschte Nachrichten und Chatrooms sind nicht mehr für
            andere Nutzende sichtbar - für Administratoren bleiben sie jedoch
            erhalten.
          </p>

          <h3>Kontolöschung und Nachrichtenerhalt</h3>
          <p>
            Wenn du dein Konto selbst löschst oder eine Löschung deiner Daten
            beantragst, wird dein Benutzerkonto einschließlich aller
            personenbezogenen Daten (Benutzername, Profilbild, Bio, Passwort)
            vollständig und unwiderruflich gelöscht.
          </p>
          <p>
            <strong>Nachrichten bleiben erhalten:</strong> Die von dir
            verfassten Chat-Nachrichten werden dabei nicht gelöscht. Der Verweis
            auf dich als Autor wird jedoch entfernt – die Nachrichten erscheinen
            dann als von einem "Gelöschten Benutzer" verfasst. Diese Zuordnung
            ist unwiderruflich und kann nicht wiederhergestellt werden.
          </p>
          <p>
            <strong>Rechtsgrundlage:</strong> Die Aufbewahrung der Nachrichten
            erfolgt auf Grundlage eines berechtigten Interesses (Art. 6 Abs. 1
            lit. f DSGVO). Die Chat-Nachrichten sind Teil von Konversationen, an
            denen weitere Personen beteiligt sind. Eine vollständige Löschung
            würde den Gesprächsverlauf für andere Teilnehmer unverständlich
            machen und deren berechtigte Interessen an der Erhaltung des
            Kommunikationskontexts beeinträchtigen. Durch die Anonymisierung
            (Entfernung des Autorenverweises) wird ein angemessener Ausgleich
            zwischen deinem Recht auf Löschung und den Interessen der anderen
            Nutzer geschaffen.
          </p>

          <h3>Kontaktaufnahme</h3>
          <p>
            Bei Kontaktaufnahme per E-Mail werden deine Angaben zwecks
            Bearbeitung der Anfrage gespeichert. Diese Daten gebe ich nicht ohne
            deine Einwilligung weiter und lösche sie nach Abschluss der
            Kommunikation.
          </p>

          <h2>4. Deine Rechte</h2>
          <p>
            Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:
          </p>
          <ul>
            <li>
              <strong>Auskunft:</strong> Welche Daten ich über dich gespeichert
              habe
            </li>
            <li>
              <strong>Berichtigung:</strong> Korrektur falscher Daten
            </li>
            <li>
              <strong>Löschung:</strong> "Recht auf Vergessenwerden"
            </li>
            <li>
              <strong>Einschränkung:</strong> Sperrung der Verarbeitung
            </li>
            <li>
              <strong>Widerspruch:</strong> Gegen die Verarbeitung
            </li>
            <li>
              <strong>Datenübertragbarkeit:</strong> Export deiner Daten
            </li>
          </ul>
          <p>
            Zur Ausübung dieser Rechte kontaktiere mich einfach per E-Mail. Du
            hast zudem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren.
          </p>

          <h2>5. Hosting & Sicherheit</h2>
          <p>
            Diese Webseite wird auf Servern in Deutschland gehostet und
            unterliegt den strengen deutschen Datenschutzbestimmungen.
          </p>
          <p>
            <strong>SSL-Verschlüsselung:</strong> Diese Seite nutzt eine
            SSL-Verschlüsselung zum Schutz der Datenübertragung. Eine
            verschlüsselte Verbindung erkennst du am "https://" in der
            Adresszeile und am Schloss-Symbol im Browser.
          </p>

          <h2>6. Externe Dienste</h2>
          <p>
            Diese Webseite verwendet grundsätzlich keine Tracking-Dienste,
            Social Media Plugins, externe Schriftarten oder Werbenetzwerke.
            Ressourcen werden lokal von meinem Server ausgeliefert, um deine
            Privatsphäre zu schützen.
          </p>

          <h3>GIF-Dienst (KLIPY)</h3>
          <p>
            Für die optionale GIF-Funktion wird der externe Dienst{" "}
            <strong>KLIPY</strong> (klipy.com) der KIKLIKO, Inc. mit Sitz in San
            Francisco, USA verwendet.
          </p>

          <h4>Bei der GIF-Suche (Server-zu-Server)</h4>
          <p>
            Wenn du nach GIFs suchst, wird die Anfrage von{" "}
            <strong>unserem Server</strong> an KLIPY gestellt – nicht direkt von
            deinem Browser. Das bedeutet:{" "}
            <strong>
              Deine IP-Adresse, Browser- und Geräteinformationen werden bei der
              Suche NICHT an KLIPY übermittelt.
            </strong>
          </p>
          <p>
            Bei der Suche werden lediglich folgende Daten an KLIPY gesendet:
          </p>
          <ul>
            <li>Dein Suchbegriff</li>
            <li>
              Eine <strong>kryptographisch gehashte</strong> Version deiner
              Benutzer-ID (SHA-256)
            </li>
          </ul>
          <p>
            Der Hash der Benutzer-ID wird von KLIPY benötigt, um dir
            personalisierte "Zuletzt verwendet"-GIFs anzuzeigen. Deine
            tatsächliche Benutzer-ID wird dabei <strong>niemals</strong> im
            Klartext übertragen – KLIPY kann daraus nicht auf deine Identität
            schließen.
          </p>

          <h4>Beim Anzeigen von GIFs (Direkte Verbindung)</h4>
          <p>
            Wenn GIFs im Chat angezeigt werden, lädt{" "}
            <strong>dein Browser die Bilder direkt</strong> von den
            KLIPY-Servern. Dabei können automatisch folgende Daten an KLIPY
            übermittelt werden:
          </p>
          <ul>
            <li>IP-Adresse</li>
            <li>Browser- und Betriebssystem-Informationen</li>
            <li>Geräte-Identifikatoren</li>
          </ul>
          <p>
            <strong>Datenübertragung in die USA:</strong> Da KLIPY ein
            US-amerikanisches Unternehmen ist, werden Daten in die USA
            übertragen. KLIPY gibt an, internationale Transfers über das EU-U.S.
            Data Privacy Framework und/oder Standardvertragsklauseln
            abzusichern.
          </p>
          <p>
            <strong>Du kannst GIFs vollständig deaktivieren:</strong> In deinen
            Profil-Einstellungen findest du die Option "Disable GIFs". Wenn
            aktiviert, werden keine Anfragen an KLIPY gesendet und GIFs werden
            nur als Platzhalter mit Titel angezeigt, ohne externe Inhalte zu
            laden.
          </p>
          <p>
            Weitere Informationen findest du in der{" "}
            <a
              href="https://klipy.com/support/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzerklärung von KLIPY
            </a>
            .
          </p>

          <h3>API-Dokumentation (Scalar)</h3>
          <p>
            Für die interaktive API-Dokumentation unter{" "}
            <a href="/api/docs" target="_blank">
              /api/docs
            </a>{" "}
            wird <strong>Scalar</strong> verwendet. Scalar ist ein Tool zur
            Darstellung von OpenAPI-Dokumentationen.
          </p>
          <p>
            Die Scalar-Komponenten werden direkt von deren Servern geladen. Bei
            Aufruf der API-Dokumentation können dabei automatisch folgende Daten
            an Scalar übermittelt werden:
          </p>
          <ul>
            <li>IP-Adresse</li>
            <li>Browser- und Betriebssystem-Informationen</li>
          </ul>
          <p>
            <strong>Alternative ohne externe Verbindung:</strong> Die
            API-Spezifikation ist auch als reine OpenAPI-JSON-Datei unter{" "}
            <a href="/api/openapi.json?pretty" target="_blank">
              /api/openapi.json?pretty
            </a>{" "}
            verfügbar. Diese kann mit jedem beliebigen OpenAPI-Client (z.B.
            Postman, Insomnia, Swagger UI) genutzt werden, ohne dass eine
            Verbindung zu Scalar hergestellt wird.
          </p>
          <p>
            Weitere Informationen findest du in der{" "}
            <a
              href="https://scalar.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutzerklärung von Scalar
            </a>{" "}
            und den{" "}
            <a
              href="https://scalar.com/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nutzungsbedingungen von Scalar
            </a>
            .
          </p>

          <h2>7. Speicherdauer</h2>
          <p>
            Soweit innerhalb dieser Datenschutzerklärung keine speziellere
            Speicherdauer genannt wurde, verbleiben deine personenbezogenen
            Daten bei mir, bis der Zweck für die Datenverarbeitung entfällt.
            Wenn du ein berechtigtes Löschersuchen geltend machst oder eine
            Einwilligung zur Datenverarbeitung widerrufst, werden deine Daten
            gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für
            die Speicherung deiner personenbezogenen Daten haben.
          </p>

          <h2>8. Änderungen</h2>
          <p>
            Ich behalte mir vor, diese Datenschutzerklärung anzupassen, um sie
            an geänderte Rechtslagen oder Services anzupassen. Die jeweils
            aktuelle Version gilt für deinen Besuch. Größere Änderungen werde
            ich auf der Plattform ankündigen.
          </p>

          <h2>Weitere rechtliche Informationen</h2>
          <p>
            <a href="/impressum">Impressum</a>
            <br />
            <a href="/agb">Allgemeine Geschäftsbedingungen (AGB)</a>
          </p>
          <p class="text-sm text-dimmed">Stand: {new Date().getFullYear()}</p>
        </article>
      </div>
    </Layout>,
    { title: "Datenschutzerklärung", c },
  );
};
