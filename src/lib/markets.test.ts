import { test, expect } from "vitest";
import {
  marketOccurrences,
  marketPresence,
  duplicateMarkets,
  pickupInstant,
  matchesMarketRule,
  emptyMarkets,
  filterMarkets,
  type Market,
  type MarketRule,
} from "./markets";
const id = (n: number) =>
  `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const market: Market = {
  id: id(1),
  name: "Prueba aislada",
  kind: "producers",
  description: "",
  locality: "Baiona",
  address: "",
  region: "Iparralde",
  latitude: 43.49,
  longitude: -1.47,
  timezone: "Europe/Paris",
  categories: ["Verduras"],
  status: "published",
  source_url: "https://example.invalid",
  source_key: "test",
  source_license: "test",
  verified_at: "2026-10-29T10:00:00Z",
  updated_at: "2026-10-29T10:00:00Z",
};
const rule: MarketRule = {
  id: id(2),
  market_id: market.id,
  participation_id: null,
  frequency: "weekly",
  starts_on: "2026-01-01",
  ends_on: null,
  weekdays: [3, 6],
  ordinal: null,
  opens: "09:00",
  closes: "13:00",
};
test("weekly multi-day and bounded expansion", () => {
  const d = { ...emptyMarkets(), markets: [market], rules: [rule] };
  expect(
    marketOccurrences(d, "2026-10-01", "2026-10-07").map((o) => o.day),
  ).toEqual(["2026-10-03", "2026-10-07"]);
  expect(() => marketOccurrences(d, "2026-01-01", "2027-01-01")).toThrow();
});
test("first and last monthly weekday, validity boundaries", () => {
  expect(
    matchesMarketRule(
      { ...rule, frequency: "monthly", weekdays: [0], ordinal: 1 },
      "2026-10-04",
    ),
  ).toBe(true);
  expect(
    matchesMarketRule(
      { ...rule, frequency: "monthly", weekdays: [0], ordinal: -1 },
      "2026-10-25",
    ),
  ).toBe(true);
  expect(
    matchesMarketRule({ ...rule, ends_on: "2026-10-02" }, "2026-10-03"),
  ).toBe(false);
});
test("multi-day fair with cancellation and clock exception", () => {
  const d = {
    ...emptyMarkets(),
    markets: [market],
    rules: [
      {
        ...rule,
        frequency: "once" as const,
        starts_on: "2026-10-01",
        ends_on: "2026-10-03",
      },
    ],
    exceptions: [
      {
        id: id(8),
        market_id: market.id,
        participation_id: null,
        day: "2026-10-02",
        cancelled: true,
        opens: null,
        closes: null,
      },
      {
        id: id(9),
        market_id: market.id,
        participation_id: null,
        day: "2026-10-03",
        cancelled: false,
        opens: "10:00",
        closes: "12:00",
      },
    ],
  };
  expect(
    marketOccurrences(d, "2026-10-01", "2026-10-04").map((o) => [
      o.day,
      o.opens,
    ]),
  ).toEqual([
    ["2026-10-01", "09:00"],
    ["2026-10-03", "10:00"],
  ]);
});
test("seller presence intersects opening and supports days off", () => {
  const part = {
    id: id(3),
    market_id: market.id,
    producer_id: id(4),
    active: true,
    own_production: true as const,
    production_kind: "artisan" as const,
    pickup_enabled: true,
    cutoff_minutes: 60,
  };
  const d = {
    ...emptyMarkets(),
    markets: [market],
    participants: [part],
    rules: [
      rule,
      {
        ...rule,
        id: id(5),
        participation_id: part.id,
        opens: "08:00",
        closes: "11:00",
      },
    ],
  };
  expect(marketPresence(d, part, "2026-10-03", "2026-10-03")[0].opens).toBe(
    "09:00",
  );
  expect(marketPresence(d, part, "2026-10-03", "2026-10-03")[0].closes).toBe(
    "11:00",
  );
  d.exceptions.push({
    id: id(7),
    market_id: market.id,
    participation_id: part.id,
    day: "2026-10-03",
    cancelled: true,
    opens: null,
    closes: null,
  });
  expect(marketPresence(d, part, "2026-10-03", "2026-10-03")).toEqual([]);
});
test("DST instants use local IANA time and reject ambiguous or absent clocks", () => {
  expect(pickupInstant("2026-07-04", "09:00")).toBe("2026-07-04T07:00:00.000Z");
  expect(pickupInstant("2026-12-05", "09:00")).toBe("2026-12-05T08:00:00.000Z");
  expect(() => pickupInstant("2026-10-25", "02:30")).toThrow();
  expect(() => pickupInstant("2026-03-29", "02:30")).toThrow();
});
test("source keys and normalized nearby names identify possible duplicates", () => {
  expect(
    duplicateMarkets(market, {
      ...market,
      source_key: "other",
      name: "PRUEBA AISLADA",
    }),
  ).toBe(true);
  expect(duplicateMarkets(market, { ...market, name: "Elsewhere" })).toBe(true);
  expect(
    duplicateMarkets(market, {
      ...market,
      source_key: null,
      name: "Other",
      longitude: 0,
    }),
  ).toBe(false);
});
test("filters are shared by list and map, no location means no distance claims", () => {
  const events = marketOccurrences(
    { ...emptyMarkets(), markets: [market], rules: [rule] },
    "2026-10-01",
    "2026-10-07",
  );
  const f = {
    query: "prueba",
    locality: "baiona",
    category: "Verduras",
    date: "",
    radius: 5,
    position: null,
  };
  expect(filterMarkets(events, f)).toEqual([]);
  expect(filterMarkets(events, { ...f, radius: 0 })).toHaveLength(2);
});
