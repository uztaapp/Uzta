import { t } from "../lib/language";
import type { SellerType } from "../lib/sellers";
export function SellerFields({
  value,
  onChange,
  enabled,
}: {
  value: SellerType | "";
  onChange: (value: SellerType | "") => void;
  enabled: boolean;
}) {
  return (
    <>
      <label>
        {t("Tipo de vendedor")}
        <select
          name="sellerType"
          value={value}
          onChange={(e) => onChange(e.target.value as SellerType)}
          required={enabled}
          disabled={!enabled}
        >
          <option value="">{t("Elige el tipo de vendedor")}</option>
          <option value="professional">{t("Agricultor profesional")}</option>
          <option value="private">{t("Particular")}</option>
        </select>
      </label>
      {!enabled && (
        <p>{t("Tipos de vendedor pendientes de activar en Supabase.")}</p>
      )}
      {value === "private" && (
        <p>
          {t(
            "Usa un nombre público y una localidad. No escribas tu domicilio en la descripción. El mapa publicará solo una zona aproximada.",
          )}
        </p>
      )}
    </>
  );
}
