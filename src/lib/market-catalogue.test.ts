import { expect, test } from "vitest";
import {
  marketCatalogue,
  verifiedMarketCatalogue,
  marketCatalogueData,
  isCatalogueReview,
} from "./market-catalogue";
import {
  availableMarketPickups,
  marketOccurrences,
  filterMarkets,
} from "./markets";

const data = marketCatalogueData();
const byKey = (key: string) =>
  data.markets.find((m) => m.source_key === "iparralde/" + key)!;
const dates = (key: string, start: string, end: string) =>
  marketOccurrences(data, start, end).filter(
    (o) => o.market.id === byKey(key).id,
  );

test("research records have unique keys/IDs, evidence, confidence and explicit review status", () => {
  expect(new Set(marketCatalogue.map((m) => m.data.source_key)).size).toBe(
    marketCatalogue.length,
  );
  expect(new Set(marketCatalogue.map((m) => m.catalog_id)).size).toBe(
    marketCatalogue.length,
  );
  for (const m of marketCatalogue) {
    expect(m.data.status).toBe("pending");
    expect(["high", "medium", "low"]).toContain(m.confidence);
    expect(m.verified_on).toBe("2026-10-29");
    expect(m.source_urls.length).toBeGreaterThan(0);
    for (const s of m.source_urls)
      expect(new URL(s.url).protocol).toBe("https:");
    if (m.review_status === "verified")
      expect(m.rules.length).toBeGreaterThan(0);
    else expect(m.review_note.length).toBeGreaterThan(0);
    expect(m.data.latitude === null).toBe(m.data.longitude === null);
  }
  expect(new Set(verifiedMarketCatalogue.map((m) => m.province))).toEqual(
    new Set(["Lapurdi", "Nafarroa Beherea", "Zuberoa"]),
  );
});

test("review-only projection excludes unresolved records and creates no sellers or bookings", () => {
  expect(data.markets.length).toBe(verifiedMarketCatalogue.length);
  expect(data.markets.some((m) => m.source_key === "iparralde/tardets")).toBe(
    false,
  );
  expect(data.markets.some((m) => m.source_key === "osm/way/40952683")).toBe(
    false,
  );
  expect(data.participants).toEqual([]);
  expect(availableMarketPickups(data, "any-account")).toEqual([]);
  expect(new Set(data.rules.map((r) => r.id)).size).toBe(data.rules.length);
});

test("different same-town markets retain their own dates and clocks", () => {
  expect(
    dates("mauleon-haute-ville", "2026-11-02", "2026-11-08").map((o) => o.day),
  ).toEqual(["2026-11-03"]);
  expect(
    dates("mauleon-basse-ville", "2026-11-02", "2026-11-08").map((o) => o.day),
  ).toEqual(["2026-11-07"]);
  expect(dates("hasparren-2", "2026-11-02", "2026-11-08")[0].opens).toBe(
    "09:00",
  );
  expect(dates("hasparren-6", "2026-11-02", "2026-11-08")[0].opens).toBe(
    "08:00",
  );
  expect(
    dates("baigorry", "2026-11-01", "2026-11-30").map((o) => o.day),
  ).toEqual(["2026-11-07"]);
  expect(
    dates("anglet-halles", "2026-10-30", "2026-10-30").map((o) => [
      o.opens,
      o.closes,
    ]),
  ).toEqual([
    ["08:00", "14:00"],
    ["16:00", "19:00"],
  ]);
});

test("seasonal and one-off dates do not recur outside their verified edition", () => {
  expect(dates("hendaye-palmier-2026", "2026-11-01", "2026-12-31")).toEqual([]);
  expect(dates("ainhoa-2026", "2027-07-01", "2027-08-31")).toEqual([]);
  expect(dates("guethary-2026", "2026-09-14", "2026-09-30")).toEqual([]);
  expect(
    dates("lurrama-2026", "2026-11-01", "2026-11-30").map((o) => o.day),
  ).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  expect(
    dates("noel-mauleon-2026", "2026-10-22", "2026-11-30").map((o) => o.day),
  ).toEqual(["2026-11-29"]);
  expect(dates("garazi-lundi", "2027-01-01", "2027-03-01")).toEqual([]);
});

test("unknown hours/positions are not guessed; list and map filters share actual occurrences", () => {
  const event = dates("hendaye-sokoburu", "2026-11-07", "2026-11-07")[0];
  expect(event.opens).toBeNull();
  expect(event.closes).toBeNull();
  expect(byKey("boucau").latitude).toBeNull(); // old OSM place differs from mairie
  const month = marketOccurrences(data, "2026-11-01", "2026-11-30");
  const matched = filterMarkets(month, {
    query: "",
    locality: "Mauléon",
    category: "",
    date: "2026-11-07",
    radius: 0,
    position: null,
  });
  expect(matched.map((o) => o.market.id)).toEqual([
    byKey("mauleon-basse-ville").id,
  ]);
  expect(matched[0].market.latitude).not.toBeNull();
});

test("production or cloud failure can never select the reference catalogue", () => {
  expect(isCatalogueReview(false, false, "")).toBe(false);
  expect(isCatalogueReview(true, true, "")).toBe(false);
  expect(isCatalogueReview(true, true, "network error")).toBe(false);
  expect(isCatalogueReview(true, false, "network error")).toBe(false);
  expect(isCatalogueReview(true, false, "")).toBe(true);
});
