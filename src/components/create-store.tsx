import { t, useLanguage } from "../lib/language";
import { useState, useRef, type FormEvent } from "react";
import { useUzta } from "../app-context";
import config from "../../config/uzta-cloud.public.json";
import { SellerFields } from "./seller-fields";
import type { SellerType } from "../lib/sellers";
export function CreateStore() {
  useLanguage();
  const { run, busy, mode } = useUzta();
  const enabled = mode === "demo" || config.sellerTypesReady;
  const [sellerType, setSellerType] = useState<SellerType | "">("");
  const id = useRef(crypto.randomUUID());
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setError("");
    const ok = await run({
      type: "farm",
      value: {
        id: id.current,
        ...(enabled ? { sellerType: sellerType || null } : {}),
        name: String(f.get("name")).trim(),
        location: String(f.get("location")).trim(),
        description: String(f.get("description")).trim(),
        ecological: f.get("ecological") === "on",
        distance: "",
        slots: [],
      },
    });
    if (!ok)
      setError(
        "No se pudo guardar la tienda. Revisa el aviso y vuelve a intentarlo.",
      );
  }
  return (
    <section className="management">
      <h2>{t("Tu tienda de productor")}</h2>
      <p>
        {t(
          "Aún no tienes una tienda. Añade sus datos para publicar productos y franjas de recogida.",
        )}
      </p>
      <form className="uzta-form" onSubmit={submit}>
        <SellerFields
          value={sellerType}
          onChange={setSellerType}
          enabled={enabled}
        />
        <label>
          {t(
            sellerType === "private"
              ? "Nombre público"
              : "Nombre de la explotación",
          )}
          <input name="name" required maxLength={100} />
        </label>
        <label>
          {t("Localidad")}
          <input name="location" required maxLength={100} />
        </label>
        <label>
          {t("Descripción")}
          <textarea name="description" maxLength={2000} />
        </label>
        <label className="check-label">
          <input type="checkbox" name="ecological" />
          {t("Producción ecológica")}
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="primary" disabled={busy}>
          {t("Crear mi tienda")}
        </button>
      </form>
    </section>
  );
}
