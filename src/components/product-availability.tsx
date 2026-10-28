import "./product-availability.css";
import { useState } from "react";
import { t, useLanguage, currentLanguage } from "../lib/language";
import {
  availabilityOf,
  availabilityLabel,
  type Availability,
  type AvailabilityFilter,
} from "../lib/availability";
import type { Product } from "../lib/local-model";
export function AvailabilityLabel({ product }: { product: Product }) {
  useLanguage();
  const status = availabilityOf(product);
  return (
    <small className="availability-label">
      <strong>{t(availabilityLabel(status))}</strong>
      {status === "upcoming" && product.expectedAvailableOn && (
        <span>
          {" "}
          · {t("Fecha orientativa:")}{" "}
          {new Intl.DateTimeFormat(currentLanguage(), {
            dateStyle: "long",
            timeZone: "UTC",
          }).format(new Date(product.expectedAvailableOn + "T12:00:00Z"))}
        </span>
      )}
    </small>
  );
}
export function AvailabilityFields({ product }: { product: Product }) {
  useLanguage();
  const [status, setStatus] = useState<Availability>(availabilityOf(product));
  return (
    <>
      <label>
        {t("Disponibilidad")}
        <select
          name="availability"
          value={status}
          onChange={(e) => setStatus(e.target.value as Availability)}
        >
          {(["available", "upcoming", "sold_out"] as const).map((s) => (
            <option key={s} value={s}>
              {t(availabilityLabel(s))}
            </option>
          ))}
        </select>
      </label>
      {status === "upcoming" && (
        <label>
          {t("Fecha prevista (opcional)")}
          <input
            name="expectedAvailableOn"
            type="date"
            defaultValue={product.expectedAvailableOn ?? ""}
          />
          <small>
            {t("La fecha es orientativa, no garantiza la entrega.")}
          </small>
        </label>
      )}
    </>
  );
}
export function AvailabilitySelect({
  value,
  onChange,
}: {
  value: AvailabilityFilter;
  onChange: (v: AvailabilityFilter) => void;
}) {
  useLanguage();
  return (
    <label className="availability-filter">
      {t("Disponibilidad")}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AvailabilityFilter)}
      >
        <option value="all">{t("Todos")}</option>
        <option value="available">{t("Disponibles")}</option>
        <option value="upcoming">{t("Próximamente")}</option>
      </select>
    </label>
  );
}
