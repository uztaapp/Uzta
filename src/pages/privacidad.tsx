import { currentLanguage, useLanguage } from "../lib/language";
import { privacyCopy } from "../lib/privacy-copy";
import legal from "../../config/uzta-legal.public.json";
import { LanguageSelector } from "../components/language-selector";
import "./privacidad.css";
export function PrivacyLink() {
  useLanguage();
  return <a href="/privacidad">{privacyCopy[currentLanguage()].title}</a>;
}
export function Privacidad({ preview = false }: { preview?: boolean }) {
  useLanguage();
  const copy = privacyCopy[currentLanguage()];
  return (
    <article className="uzta-privacy">
      <h1>{copy.title}</h1>
      <LanguageSelector />
      {!legal.privacyApproved && !preview ? (
        <p>{copy.pending}</p>
      ) : (
        <>
          {!legal.privacyApproved && <p role="status">{copy.draft}</p>}
          <p>
            {copy.updated}{" "}
            <time dateTime={legal.updatedAt}>
              {new Intl.DateTimeFormat(currentLanguage(), {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(legal.updatedAt + "T12:00:00Z"))}
            </time>
          </p>
          {copy.sections.map(([title, body]) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </section>
          ))}
          <h2>{copy.providers}</h2>
          <ul>
            <li>
              <a href="https://supabase.com/legal/customer-resources/data-processing-addendum">
                Supabase
              </a>
            </li>
            <li>
              <a href="https://vercel.com/legal/dpa">Vercel</a>
            </li>
            <li>
              <a href="https://policies.google.com/privacy">Google</a>
            </li>
            <li>
              <a href="https://osmfoundation.org/wiki/Privacy_Policy">
                OpenStreetMap
              </a>
            </li>
            <li>
              <a href="https://www.cnil.fr/">CNIL</a>
            </li>
          </ul>
          <p>
            <a href={"mailto:" + legal.contactEmail}>{legal.contactEmail}</a>
          </p>
        </>
      )}
    </article>
  );
}
