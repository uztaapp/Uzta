import { t } from "../lib/language";
import type { Farm } from "../lib/local-model";
import { sellerPosition } from "../lib/sellers";
import { publicMapUrl } from "../lib/nearby";
export function PickupLocation({ farm }: { farm?: Farm }) {
  const url = publicMapUrl(sellerPosition(farm?.position, farm?.sellerType));
  return (
    <section className="pickup-location" aria-label={t("Lugar de recogida")}>
      <h3>{t("Lugar de recogida")}</h3>
      {farm ? (
        <p>{farm.location}</p>
      ) : (
        <p>
          {t("El lugar de recogida no está disponible. Consulta al vendedor.")}
        </p>
      )}
      {farm?.sellerType === "private" && (
        <p className="subtle">
          {t(
            "Se muestra una zona aproximada para proteger el domicilio del vendedor.",
          )}
        </p>
      )}
      {url && (
        <a
          className="text-button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t(
            farm?.sellerType === "private"
              ? "Abrir zona de recogida"
              : "Abrir ubicación de recogida",
          )}
        </a>
      )}
      {farm && !url && (
        <p className="subtle">
          {t("El vendedor todavía no ha publicado un punto en el mapa.")}
        </p>
      )}
    </section>
  );
}
