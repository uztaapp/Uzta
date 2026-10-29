import catalogue from "../data/markets-initial.json";
import { marketSchema, ruleSchema, type MarketData } from "./markets";

export const marketCatalogue = catalogue;
export const verifiedMarketCatalogue = catalogue.filter(
  (entry) => entry.review_status === "verified",
);

// Real researched facts, rendered read-only using the existing calendar/list/map.
// This never supplies the Supabase provider, participation forms or checkout.
// The page calls it only in development / Vercel preview while activation is off.
export function marketCatalogueData(): MarketData {
  return {
    markets: verifiedMarketCatalogue.map((entry) =>
      marketSchema.parse({
        ...entry.data,
        id: entry.catalog_id,
        status: "published", // Calendar visibility only; not a database write.
        verified_at: entry.verified_on + "T00:00:00Z",
        updated_at: entry.verified_on + "T00:00:00Z",
      }),
    ),
    rules: verifiedMarketCatalogue.flatMap((entry) =>
      entry.rules.map((rule, index) =>
        ruleSchema.parse({
          ...rule,
          id: entry.catalog_id.slice(0, -4) + String(index).padStart(4, "0"),
          market_id: entry.catalog_id,
          participation_id: null,
        }),
      ),
    ),
    exceptions: [],
    participants: [],
  };
}

export function isCatalogueReview(
  enabled: boolean,
  cloudReady: boolean,
  error: string,
) {
  // Never use reference data to conceal a cloud query failure.
  return enabled && !cloudReady && !error;
}
