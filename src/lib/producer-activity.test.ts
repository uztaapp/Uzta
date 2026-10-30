import { test, expect } from "vitest";
import { seedStore } from "./local-model";
import { producerActivity, producerMarketActivity } from "./producer-activity";
import { marketCatalogueData } from "./market-catalogue";
const now = new Date("2026-10-30T12:00:00Z");

test("collection task requires a real due timestamp; future stock is not depleted stock", () => {
  const data = seedStore();
  const product = data.products[0];
  data.products = [
    { ...product, farmId: "urki", stock: 0, availability: "upcoming" },
  ];
  const base = {
    ...data.orders[0],
    farmId: "urki",
    example: false,
    status: "Pendiente" as const,
  };
  data.orders = [
    {
      ...base,
      id: "due",
      pickup: { ...base.pickup, startsAt: "2026-10-30T10:00:00Z" },
    },
    {
      ...base,
      id: "future",
      pickup: { ...base.pickup, startsAt: "2026-11-02T10:00:00Z" },
    },
    { ...base, id: "unknown", pickup: { ...base.pickup, startsAt: undefined } },
  ];
  const result = producerActivity(data, "urki", now);
  expect([...result.collectionDue]).toEqual(["due"]);
  expect(result.depleted).toEqual([]);
});

test("confirmed markets count only own active attendance and deduplicate recurring dates", () => {
  const data = marketCatalogueData();
  const market = data.markets.find(
    (m) => m.source_key === "iparralde/anglet-quintaou",
  )!;
  const other = data.markets.find(
    (m) => m.source_key === "iparralde/bidart-quatre-saisons",
  )!;
  data.participants = [
    {
      id: "own",
      market_id: market.id,
      producer_id: "urki",
      active: true,
      own_production: true,
      production_kind: "farm",
      pickup_enabled: false,
      cutoff_minutes: 60,
    },
    {
      id: "other",
      market_id: other.id,
      producer_id: "another",
      active: true,
      own_production: true,
      production_kind: "farm",
      pickup_enabled: true,
      cutoff_minutes: 60,
    },
    {
      id: "inactive",
      market_id: other.id,
      producer_id: "urki",
      active: false,
      own_production: true,
      production_kind: "farm",
      pickup_enabled: false,
      cutoff_minutes: 60,
    },
  ];
  data.rules.push({
    id: "attendance",
    market_id: market.id,
    participation_id: "own",
    frequency: "weekly",
    starts_on: "2026-10-29",
    ends_on: null,
    weekdays: [0, 4],
    ordinal: null,
    opens: "08:00",
    closes: "13:00",
  });
  const upcoming = producerMarketActivity(data, "urki", now);
  expect(upcoming).toHaveLength(1);
  expect(upcoming[0].day).toBe("2026-11-01");
  data.exceptions.push({
    id: "away",
    market_id: market.id,
    participation_id: "own",
    day: "2026-11-01",
    cancelled: true,
    opens: null,
    closes: null,
  });
  expect(producerMarketActivity(data, "urki", now)[0].day).toBe("2026-11-05");
  market.status = "pending";
  expect(producerMarketActivity(data, "urki", now)).toEqual([]);
});

test("finished collections today are excluded from upcoming attendance", () => {
  const data = marketCatalogueData();
  const market = data.markets[0];
  data.participants = [
    {
      id: "own",
      market_id: market.id,
      producer_id: "urki",
      active: true,
      own_production: true,
      production_kind: "farm",
      pickup_enabled: false,
      cutoff_minutes: 60,
    },
  ];
  data.rules = [
    {
      id: "day",
      market_id: market.id,
      participation_id: null,
      frequency: "once",
      starts_on: "2026-10-30",
      ends_on: "2026-10-30",
      weekdays: [],
      ordinal: null,
      opens: "08:00",
      closes: "10:00",
    },
    {
      id: "attendance",
      market_id: market.id,
      participation_id: "own",
      frequency: "once",
      starts_on: "2026-10-30",
      ends_on: "2026-10-30",
      weekdays: [],
      ordinal: null,
      opens: "08:00",
      closes: "10:00",
    },
  ];
  expect(producerMarketActivity(data, "urki", now)).toEqual([]);
});
