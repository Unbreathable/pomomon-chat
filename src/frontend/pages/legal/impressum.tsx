import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";

export const impressumPage = async (c: Context<AuthContext>) => {
  return html(
    <Layout c={c}>
      <div class="container max-w-3xl p-4 sm:p-8">
        <article class="prose">
          <h1>Impressum</h1>

          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            Julian “Unbreathable” Golenhofen
            <br />
            c/o IP-Management #6901
            <br />
            Ludwig-Erhard-Straße 18
            <br />
            20459 Hamburg
          </p>

          <h2>Kontakt</h2>
          <p>
            E-Mail: legal[at]liphium.com
            <br />
            Telefon: 07307 2010090
            <br />
            (Bitte "[at]" durch "@" ersetzen)
          </p>

          <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>
            Julian “Unbreathable” Golenhofen
          </p>

          <h2>Haftungsausschluss</h2>

          <h3>Haftung für Inhalte</h3>
          <p>
            Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für
            die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird
            jedoch keine Gewähr übernommen. Als Diensteanbieter bin ich gemäß §
            7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
            allgemeinen Gesetzen verantwortlich.
          </p>
          <p>
            Für Inhalte, die von Nutzern erstellt werden (Chat-Nachrichten),
            gelten die Regelungen der §§ 8-10 TMG. Ich bin nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen.
            Bei Kenntnis von Rechtsverstößen werden entsprechende Inhalte
            umgehend entfernt.
          </p>

          <h3>Haftung für Links</h3>
          <p>
            Diese Website kann Links zu externen Webseiten Dritter enthalten,
            auf deren Inhalte ich keinen Einfluss habe. Deshalb kann ich für
            diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte
            der verlinkten Seiten ist stets der jeweilige Anbieter oder
            Betreiber der Seiten verantwortlich.
          </p>

          <h3>Urheberrecht</h3>
          <p>
            Die durch mich oder andere Nutzende erstellten Inhalte und Werke auf
            diesen Seiten unterliegen dem deutschen Urheberrecht. Die
            Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
            Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
            schriftlichen Zustimmung durch mich oder entsprechend der jeweiligen
            Nutzer. Downloads und Kopien dieser Seite sind nur für den privaten,
            nicht kommerziellen Gebrauch gestattet.
          </p>

          <h2>Weitere rechtliche Informationen</h2>
          <p>
            <a href="/datenschutz">Datenschutzerklärung</a>
            <br />
            <a href="/agb">Allgemeine Geschäftsbedingungen (AGB)</a>
          </p>
          <p class="text-sm text-dimmed">Stand: {new Date().getFullYear()}</p>
        </article>
      </div>
    </Layout>,
    { title: "Impressum", c },
  );
};
