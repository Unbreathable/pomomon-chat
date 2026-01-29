import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";

export const agbPage = async (c: Context<AuthContext>) => {
  return html(
    <Layout c={c}>
      <div class="container max-w-3xl p-4 sm:p-8">
        <article class="prose">
          <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

          <h2>§ 1 Geltungsbereich</h2>
          <p>
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung dieser
            Chat-Plattform. Die Plattform ist ein persönliches Projekt und dient
            der Kommunikation innerhalb einer geschlossenen Gruppe. Mit der
            Registrierung und Nutzung der Plattform akzeptierst du diese
            Bedingungen.
          </p>
          <p>
            <strong>Diese AGB gelten gleichermaßen für:</strong>
          </p>
          <ul>
            <li>Reguläre Benutzerkonten</li>
            <li>
              Bot-Accounts und deren Betreiber – Wer einen Bot erstellt, ist für
              dessen Verhalten und die Einhaltung dieser AGB verantwortlich
            </li>
            <li>
              Drittanbieter-Clients, die über die API auf die Plattform
              zugreifen
            </li>
          </ul>
          <p>
            Die Plattform ist kostenlos und wird ohne kommerzielle Absichten
            betrieben.
          </p>

          <h2>§ 2 Registrierung und Zugang</h2>
          <p>
            Die Nutzung der Plattform erfordert eine Registrierung. Der Zugang
            erfolgt unter umständen über einen Invite-Token, der von einem
            Administrator bereitgestellt wird.
          </p>
          <p>Bei der Registrierung sind folgende Punkte zu beachten:</p>
          <ul>
            <li>Jeder Nutzer darf nur ein Benutzerkonto anlegen</li>
            <li>Der Benutzername muss eindeutig sein</li>
            <li>Du bist verpflichtet, deine Zugangsdaten geheim zu halten</li>
            <li>
              Bei Verdacht auf unbefugten Zugriff muss dies umgehend gemeldet
              werden
            </li>
          </ul>

          <h2>§ 3 Nutzungsbedingungen</h2>
          <p>Der Nutzer verpflichtet sich:</p>
          <ul>
            <li>Die Plattform nur für erlaubte Zwecke zu nutzen</li>
            <li>
              Keine rechtswidrigen, beleidigenden oder anstößigen Inhalte zu
              veröffentlichen
            </li>
            <li>
              Die Rechte Dritter (insbesondere Urheberrechte,
              Persönlichkeitsrechte) zu respektieren
            </li>
            <li>Keine technischen Schutzmechanismen zu umgehen</li>
            <li>Die Plattform nicht für kommerzielle Zwecke zu nutzen</li>
            <li>
              Keine Spam-Nachrichten oder automatisierte Massenanfragen zu
              versenden
            </li>
          </ul>

          <h2>§ 4 Inhalte und Verantwortlichkeit</h2>
          <p>
            Nutzer sind für ihre veröffentlichten Inhalte selbst verantwortlich.
            Der Betreiber behält sich vor, rechtswidrige oder gegen diese AGB
            verstoßende Inhalte zu löschen und Nutzerkonten zu sperren.
          </p>
          <p>
            <strong>Notice-and-Takedown-Verfahren:</strong> Bei Meldung von
            Rechtsverstößen oder Missbrauch werden die gemeldeten Inhalte nach
            Prüfung entfernt. Der betroffene Nutzer kann dazu angehört werden.
          </p>
          <p>Meldungen bitte an: legal[at]liphium.com</p>

          <h2>§ 4a Verbot der persistenten Nachrichtenspeicherung</h2>
          <p>
            <strong>
              Die dauerhafte Speicherung von Nachrichten außerhalb dieser
              Plattform ist ausdrücklich untersagt.
            </strong>
          </p>
          <p>Dies gilt für:</p>
          <ul>
            <li>Reguläre Benutzer und deren Clients</li>
            <li>Bot-Accounts und deren Betreiber</li>
            <li>Drittanbieter-Anwendungen, die die API nutzen</li>
          </ul>
          <p>
            <strong>Begründung:</strong> Die Plattform bietet Nutzern die
            Möglichkeit, ihre Nachrichten zu bearbeiten oder zu löschen. Diese
            Funktionen sind nur dann sinnvoll, wenn Nachrichten nicht extern
            kopiert und dauerhaft gespeichert werden.
          </p>
          <p>
            <strong>Erlaubt ist lediglich:</strong>
          </p>
          <ul>
            <li>
              Temporäres Caching für die unmittelbare Anzeige im Client (z.B.
              während einer aktiven Session)
            </li>
            <li>
              Kurzfristige Zwischenspeicherung für die Verarbeitung durch Bots
              (z.B. zur Beantwortung einer Nachricht), sofern die Daten
              unmittelbar danach gelöscht werden
            </li>
          </ul>
          <p>
            <strong>Ausdrücklich verboten ist:</strong>
          </p>
          <ul>
            <li>
              Das Anlegen von Datenbanken, Logfiles oder Archiven mit
              Nachrichteninhalten
            </li>
            <li>Das Exportieren oder Sichern von Chatverläufen</li>
            <li>
              Das Weiterleiten von Nachrichten an externe Dienste zur
              Speicherung oder Analyse
            </li>
            <li>
              Jegliche Form der persistenten Speicherung, die über die aktive
              Nutzung hinausgeht
            </li>
          </ul>
          <p>
            Verstöße gegen dieses Verbot können zur sofortigen Sperrung des
            Accounts führen.
          </p>

          <h2>§ 5 Datenschutz</h2>
          <p>
            Die Verarbeitung personenbezogener Daten erfolgt gemäß der{" "}
            <a href="/datenschutz">Datenschutzerklärung</a>. Mit der Nutzung der
            Plattform stimmst du der Datenverarbeitung gemäß der
            Datenschutzerklärung zu.
          </p>

          <h2>§ 6 Verfügbarkeit und Änderungen</h2>
          <p>
            Der Betreiber ist bemüht, die Plattform ständig verfügbar zu halten,
            übernimmt jedoch keine Garantie für eine ununterbrochene
            Verfügbarkeit.
          </p>
          <p>
            <strong>Best-Effort-Prinzip:</strong> Ich bemühe mich um:
          </p>
          <ul>
            <li>Regelmäßige Backups (ohne Gewähr)</li>
            <li>Stabile Verfügbarkeit der Services</li>
            <li>Rechtzeitige Information bei geplanten Wartungen</li>
            <li>Vorankündigung bei Service-Einstellung</li>
          </ul>
          <p>
            Der Betreiber behält sich vor, die Plattform jederzeit zu ändern,
            einzuschränken oder einzustellen.
          </p>

          <h2>§ 7 Kündigung und Löschung</h2>
          <p>Beide Parteien können das Nutzungsverhältnis jederzeit beenden:</p>
          <ul>
            <li>
              Der Betreiber kann Konten bei Verstößen gegen diese AGB sperren
              oder löschen
            </li>
            <li>Eine Wiederherstellung gelöschter Konten ist nicht möglich</li>
          </ul>

          <h2>§ 8 Haftungsausschluss</h2>
          <p>
            Die Plattform wird "as is" ohne jegliche Gewährleistung
            bereitgestellt. Die Nutzung erfolgt auf eigene Gefahr.
          </p>
          <p>Der Betreiber haftet nicht für:</p>
          <ul>
            <li>Datenverlust oder Beschädigung</li>
            <li>Service-Unterbrechungen oder -Ausfälle</li>
            <li>Schäden durch von Nutzern erstellte Inhalte</li>
            <li>Folgeschäden jeder Art</li>
          </ul>
          <p>
            Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt,
            soweit gesetzlich zulässig.
          </p>

          <h2>§ 9 Änderungen der AGB</h2>
          <p>
            Der Betreiber behält sich vor, diese AGB jederzeit zu ändern. Nutzer
            werden über wesentliche Änderungen informiert. Die Fortsetzung der
            Nutzung nach Änderungen gilt als Zustimmung zu den geänderten AGB.
          </p>

          <h2>§ 10 GIF-Integration (Klipy)</h2>
          <p>
            Die Plattform nutzt den Dienst <strong>Klipy</strong> für die
            GIF-Suche und -Anzeige. Bei der Nutzung dieser Funktion gelten
            zusätzlich die{" "}
            <a
              href="https://docs.klipy.com/attribution"
              target="_blank"
              rel="noopener noreferrer"
            >
              Nutzungsbedingungen von Klipy
            </a>
            .
          </p>
          <p>
            <strong>Attribution:</strong> Gemäß den Klipy-Nutzungsbedingungen
            gelten folgende Anforderungen:
          </p>
          <ul>
            <li>
              In Suchfeldern für GIFs muss "Search Klipy" oder eine ähnliche
              Kennzeichnung angezeigt werden, zusammen mit dem Klipy-Logo
            </li>
            <li>
              Bei der Anzeige von GIFs im Chat muss das Klipy-Logo als Overlay
              sichtbar sein
            </li>
          </ul>
          <p>
            Diese Anforderungen gelten auch für Drittanbieter-Clients, die die
            API dieser Plattform nutzen.
          </p>

          <h2>§ 11 API-Nutzungsbedingungen</h2>
          <p>
            Die Plattform stellt eine API für Drittanbieter-Clients bereit.
            Entwickler, die diese API nutzen, verpflichten sich zur Einhaltung
            der folgenden Bedingungen:
          </p>

          <h3>Authentifizierung und Sicherheit</h3>
          <ul>
            <li>
              Benutzer-Credentials (Passwörter, Session-Tokens) dürfen nur lokal
              auf dem Gerät des jeweiligen Nutzers gespeichert werden
            </li>
            <li>
              Credentials dürfen niemals an Dritte weitergegeben, auf externen
              Servern gespeichert oder anderweitig missbraucht werden
            </li>
            <li>
              Session-Tokens müssen sicher gespeichert werden (z.B. in
              verschlüsseltem Speicher)
            </li>
          </ul>

          <h3>Rate Limiting</h3>
          <ul>
            <li>
              Maximal <strong>60 Anfragen pro Sekunde</strong> pro Nutzer
              (inklusive WebSocket-Nachrichten)
            </li>
            <li>
              Bei Autocomplete-Endpoints müssen Anfragen auf mindestens{" "}
              <strong>300ms debounced/throttled</strong> werden – Anfragen bei
              jedem Tastendruck sind nicht erlaubt
            </li>
            <li>
              HTTP 429 (Too Many Requests) Responses müssen respektiert werden;
              Clients müssen vor erneuten Anfragen warten
            </li>
          </ul>

          <h3>Verbotene Aktivitäten</h3>
          <ul>
            <li>
              Automatisiertes Scraping oder Massen-Downloads von Nachrichten,
              Medien oder Nutzerdaten
            </li>
            <li>
              Umgehung von Rate-Limits durch mehrere Accounts oder verteilte
              Anfragen
            </li>
            <li>
              Nutzung der API für Spam, Harassment oder andere Nutzungsverstöße
            </li>
          </ul>

          <p>
            Bei Verstößen gegen diese API-Bedingungen kann der Zugang zur API
            ohne Vorwarnung gesperrt werden.
          </p>

          <h2>§ 12 Schlussbestimmungen</h2>
          <p>
            <strong>Anwendbares Recht:</strong> Es gilt das Recht der
            Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
          </p>
          <p>
            <strong>Gerichtsstand:</strong> Gerichtsstand ist Ulm, sofern
            gesetzlich zulässig.
          </p>
          <p>
            <strong>Salvatorische Klausel:</strong> Sollten einzelne
            Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der
            übrigen Bestimmungen davon unberührt.
          </p>
          <p>
            <strong>Kontakt bei Fragen:</strong> legal[at]liphium.com
          </p>

          <h2>Weitere rechtliche Informationen</h2>
          <p>
            <a href="/impressum">Impressum</a>
            <br />
            <a href="/datenschutz">Datenschutzerklärung</a>
          </p>
          <p class="text-sm text-dimmed">Stand: {new Date().getFullYear()}</p>
        </article>
      </div>
    </Layout>,
    { title: "Allgemeine Geschäftsbedingungen", c },
  );
};
