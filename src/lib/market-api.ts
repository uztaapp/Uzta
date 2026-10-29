import config from "../../config/uzta-cloud.public.json";
import { cloudClient } from "./cloud-client";
import {
  emptyMarkets,
  marketSchema,
  ruleSchema,
  exceptionSchema,
  participationSchema,
  type MarketData,
} from "./markets";
const fields =
  "id,name,kind,description,locality,address,region,latitude,longitude,timezone,categories,status,source_url,source_key,source_updated_at,source_license,verified_at,updated_at";
export async function loadMarkets(): Promise<MarketData> {
  if (!config.marketsReady) return emptyMarkets();
  const api = cloudClient();
  async function rows(table: string, select = "*") {
    const all: unknown[] = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const r = await api
        .from(table)
        .select(select)
        .order("id")
        .range(offset, offset + 999);
      if (r.error)
        throw Error("No se pudieron cargar los mercados. Inténtalo de nuevo.");
      all.push(...r.data);
      if (r.data.length < 1000) return all;
    }
    throw Error("Demasiados resultados. Acota la consulta.");
  }
  const [markets, rules, exceptions, participants] = await Promise.all([
    rows("uzta_markets", fields),
    rows("uzta_market_rules"),
    rows("uzta_market_exceptions"),
    rows("uzta_market_participations"),
  ]);
  return {
    markets: marketSchema.array().parse(markets),
    rules: ruleSchema.array().parse(rules),
    exceptions: exceptionSchema.array().parse(exceptions),
    participants: participationSchema.array().parse(participants),
  };
}
export async function marketRpc(
  name:
    | "uzta_save_market"
    | "uzta_save_market_participation"
    | "uzta_prepare_market_pickup",
  args: Record<string, unknown>,
) {
  if (!config.marketsReady)
    throw Error(
      "Mercados pendiente de activación. No se han guardado cambios.",
    );
  const r = await cloudClient().rpc(name, args);
  if (r.error) {
    if (r.error.code === "23505")
      throw Error("Posible mercado duplicado. Revisa los existentes.");
    throw Error("No se pudo guardar. Revisa los datos y tus permisos.");
  }
  return r.data as string;
}
export async function saveMarketException(
  values: {
    market_id: string;
    participation_id: string | null;
    day: string;
    cancelled: boolean;
    opens: string | null;
    closes: string | null;
  },
  id?: string,
) {
  if (!config.marketsReady)
    throw Error(
      "Mercados pendiente de activación. No se han guardado cambios.",
    );
  const r = await cloudClient().rpc("uzta_save_market_exception", {
    p_market: values.market_id,
    p_part: values.participation_id,
    p_day: values.day,
    p_cancelled: values.cancelled,
    p_opens: values.opens,
    p_closes: values.closes,
  });
  if (r.error)
    throw Error("No se pudo guardar. Revisa los datos y tus permisos.");
}
