import {
  languages,
  useLanguage,
  useLanguagePreference,
  setLanguage,
  type LanguagePreference,
} from "../lib/language";
export function LanguageSelector() {
  const language = useLanguage();
  const preference = useLanguagePreference();
  return (
    <div className="uzta-form">
      <label>
        {language === "fr"
          ? "Langue de l’interface"
          : language === "en"
            ? "Interface language"
            : language === "eu"
              ? "Interfazearen hizkuntza"
              : "Idioma de la interfaz"}
        <select
          value={preference}
          onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
        >
          <option value="auto">Automático · Auto</option>
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <p className="subtle">
        {language === "fr"
          ? "Les noms et descriptions des producteurs restent dans leur langue d’origine."
          : language === "en"
            ? "Producer names and descriptions stay in their original language."
            : language === "eu"
              ? "Ekoizleen izenak eta deskribapenak jatorrizko hizkuntzan mantentzen dira."
              : "Los nombres y descripciones de los productores conservan su idioma original."}
      </p>
      <p className="subtle">
        {language === "fr"
          ? "La traduction des messages détaillés est encore en cours."
          : language === "en"
            ? "Detailed message translations are still in progress."
            : language === "eu"
              ? "Mezu zehatzen itzulpenak oraindik prestatzen ari dira."
              : "La traducción de los avisos detallados sigue en curso."}
      </p>
    </div>
  );
}
