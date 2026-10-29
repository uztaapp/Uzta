import { useState } from "react";
import { useMarkets } from "./market-data";
import { useUzta } from "../app-context";
import { availableMarketPickups } from "../lib/markets";
import { marketRpc } from "../lib/market-api";
import { pickupDate } from "../lib/pickup-date";
import { t, useLanguage } from "../lib/language";
export function MarketPickupChoices({
  producer,
  onSelect,
}: {
  producer: string;
  onSelect: (id: string, date: string) => void;
}) {
  useLanguage();
  const { data, error, loading } = useMarkets();
  const { refresh, userId } = useUzta();
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const options = availableMarketPickups(data, producer);
  const unique = options.filter(
    (o, i) =>
      options.findIndex(
        (x) => x.participation.id === o.participation.id && x.day === o.day,
      ) === i,
  );
  async function choose(value: string) {
    const o = unique.find((x) => x.key === value);
    if (!o) return;
    setBusy(true);
    setFailure("");
    try {
      const id = await marketRpc("uzta_prepare_market_pickup", {
        p_part: o.participation.id,
        p_day: o.day,
      });
      await refresh();
      onSelect(id, o.day);
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="market-pickup">
      {error && <p role="alert">{t(error)}</p>}
      {failure && <p role="alert">{t(failure)}</p>}
      {loading && <p role="status">{t("Cargando mercados…")}</p>}
      {unique.length > 0 && (
        <label>
          {t("Recoger en un mercado")}
          <select
            disabled={busy || !userId}
            value=""
            onChange={(e) => void choose(e.target.value)}
          >
            <option value="">
              {t(
                userId
                  ? "Selecciona un mercado"
                  : "Inicia sesión para elegir mercado",
              )}
            </option>
            {unique.map((o) => (
              <option key={o.key} value={o.key}>
                {o.market.name} · {pickupDate(o.day)} · {o.opens}–{o.closes}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
