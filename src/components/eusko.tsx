import config from "../../config/uzta-cloud.public.json";
import { useState, useEffect } from "react";
import { t, useLanguage } from "../lib/language";
import {
  acceptsEusko,
  euskoAdoption,
  type EuskoMethods,
  type PaymentPreference,
} from "../lib/eusko";
export function EuskoBadge({ farm }: { farm: EuskoMethods | undefined }) {
  useLanguage();
  return acceptsEusko(farm) ? (
    <small className="eusko-badge">{t("Acepta Eusko")}</small>
  ) : null;
}
export function EuskoFields({ farm }: { farm: EuskoMethods }) {
  useLanguage();
  const [enabled, setEnabled] = useState(acceptsEusko(farm));
  return (
    <fieldset>
      <legend>{t("Pago presencial")}</legend>
      <label className="check-label">
        <input
          name="acceptsEusko"
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        {t("Acepto pagos en Eusko")}
      </label>
      {enabled && (
        <>
          <label className="check-label">
            <input
              name="euskoNotes"
              type="checkbox"
              defaultChecked={farm.euskoNotes ?? false}
            />
            {t("Billetes Eusko")}
          </label>
          <label className="check-label">
            <input
              name="euskoDigital"
              type="checkbox"
              defaultChecked={farm.euskoDigital ?? false}
            />
            {t("Eusko digital (Euskopay/Euskokart)")}
          </label>
        </>
      )}
      <p>
        {t(
          "El vendedor debe cumplir los requisitos de adhesión y autorización de Euskal Moneta. Activa solo los medios que aceptas realmente.",
        )}
      </p>
      <a
        href="https://www.euskalmoneta.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("Información de Euskal Moneta")}
      </a>
    </fieldset>
  );
}
export function PaymentMethods({ farm }: { farm: EuskoMethods | undefined }) {
  useLanguage();
  return (
    <div>
      <strong>{t("Métodos aceptados por el vendedor")}</strong>
      <p>
        {t("Euros")}
        {farm?.euskoNotes ? ` · ${t("Billetes Eusko")}` : ""}
        {farm?.euskoDigital
          ? ` · ${t("Eusko digital (Euskopay/Euskokart)")}`
          : ""}
      </p>
      {farm?.euskoNotes && (
        <p>
          {t(
            "Los billetes Eusko no tienen céntimos. Acuerda el importe fraccionario con el vendedor.",
          )}
        </p>
      )}
    </div>
  );
}
export function PaymentChoice({
  farm,
  value,
  onChange,
  disabled = false,
}: {
  farm: EuskoMethods | undefined;
  value: PaymentPreference;
  onChange: (v: PaymentPreference) => void;
  disabled?: boolean;
}) {
  useLanguage();
  const accepted = acceptsEusko(farm);
  return (
    <>
      <PaymentMethods farm={farm} />
      <label>
        {t("Preferencia de pago")}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as PaymentPreference)}
          disabled={disabled}
        >
          <option value="EUR">{t("Euros")}</option>
          {(accepted || value === "EUSKO") && (
            <option value="EUSKO" disabled={!accepted}>
              Eusko
            </option>
          )}
        </select>
      </label>
      {value === "EUSKO" && !accepted && (
        <p role="alert">{t("Eusko no aceptado por este vendedor.")}</p>
      )}
      <p>
        {t(
          "Preferencia informativa: no constituye un pago. El total permanece en euros.",
        )}
      </p>
    </>
  );
}

export function EuskoAdminSummary() {
  useLanguage();
  const [count, setCount] = useState<{
      total: number;
      notes: number;
      digital: number;
    } | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (config.euskoReady)
      void euskoAdoption()
        .then((value) => {
          if (active) setCount(value);
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, []);
  if (!config.euskoReady) return null;
  return (
    <aside>
      {error ? (
        <p role="alert">{t("No se pudo cargar la aceptación de Eusko.")}</p>
      ) : count ? (
        <>
          <p>
            {t("Vendedores que aceptan Eusko")}: {count.total} ·{" "}
            {t("Billetes Eusko")}: {count.notes} ·{" "}
            {t("Eusko digital (Euskopay/Euskokart)")}: {count.digital}
          </p>
          <small>
            {t(
              "Aceptación declarada por vendedores; no representa pagos realizados.",
            )}
          </small>
        </>
      ) : (
        <p role="status">{t("Cargando…")}</p>
      )}
    </aside>
  );
}
