import { z } from "zod";
import { madridToUtc } from "./cloud-data";
import { distanceKm, type Position } from "./nearby";
export const marketTypes = [
  "weekly",
  "producers",
  "craft",
  "agricultural",
  "special",
] as const;
export const marketTypeLabels: Record<string, string> = {
  weekly: "Mercado semanal",
  producers: "Mercado de productores",
  craft: "Feria artesanal",
  agricultural: "Feria agrícola",
  special: "Evento especial",
};
const day = z.string().date();
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/)
  .transform((v) => v.slice(0, 5))
  .nullable();
export const marketSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: z.enum(marketTypes),
  description: z.string(),
  locality: z.string(),
  address: z.string(),
  region: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: z.enum(["Europe/Madrid", "Europe/Paris"]),
  categories: z.array(z.string()),
  status: z.enum(["pending", "published", "inactive"]),
  source_url: z.string().url().nullable(),
  source_key: z.string().nullable(),
  source_updated_at: z.string().nullable().optional(),
  source_license: z.string(),
  verified_at: z.string().nullable(),
  updated_at: z.string(),
});
export const ruleSchema = z.object({
  id: z.string().uuid(),
  market_id: z.string().uuid(),
  participation_id: z.string().uuid().nullable(),
  frequency: z.enum(["once", "weekly", "monthly"]),
  starts_on: day,
  ends_on: day.nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  ordinal: z.number().int().nullable(),
  opens: clock,
  closes: clock,
});
export const exceptionSchema = z.object({
  id: z.string().uuid(),
  market_id: z.string().uuid(),
  participation_id: z.string().uuid().nullable(),
  day,
  cancelled: z.boolean(),
  opens: clock,
  closes: clock,
});
export const participationSchema = z.object({
  id: z.string().uuid(),
  market_id: z.string().uuid(),
  producer_id: z.string().uuid(),
  active: z.boolean(),
  own_production: z.literal(true),
  production_kind: z.enum(["farm", "artisan"]),
  pickup_enabled: z.boolean(),
  cutoff_minutes: z.number().int(),
});
export type Market = z.infer<typeof marketSchema>;
export type MarketRule = z.infer<typeof ruleSchema>;
export type MarketException = z.infer<typeof exceptionSchema>;
export type Participation = z.infer<typeof participationSchema>;
export type MarketData = {
  markets: Market[];
  rules: MarketRule[];
  exceptions: MarketException[];
  participants: Participation[];
};
export const emptyMarkets = (): MarketData => ({
  markets: [],
  rules: [],
  exceptions: [],
  participants: [],
});
export function localDay(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(value: string, n: number) {
  return new Date(Date.parse(day.parse(value) + "T12:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function matchesMarketRule(r: MarketRule, date: string) {
  day.parse(date);
  if (date < r.starts_on || (r.ends_on && date > r.ends_on)) return false;
  if (r.frequency === "once") return date <= (r.ends_on ?? r.starts_on);
  const d = new Date(date + "T12:00:00Z");
  if (!r.weekdays.includes(d.getUTCDay())) return false;
  return (
    r.frequency === "weekly" ||
    (r.ordinal === -1
      ? new Date(addDays(date, 7)).getUTCMonth() !== d.getUTCMonth()
      : Math.floor((d.getUTCDate() - 1) / 7) + 1 === r.ordinal)
  );
}
export type MarketOccurrence = {
  market: Market;
  day: string;
  opens: string | null;
  closes: string | null;
  key: string;
};
export function marketOccurrences(data: MarketData, from: string, to: string) {
  day.parse(from);
  day.parse(to);
  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (span < 0 || span > 93) throw Error("Intervalo máximo de 93 días");
  const result: MarketOccurrence[] = [];
  for (let date = from; date <= to; date = addDays(date, 1))
    for (const market of data.markets.filter((m) => m.status === "published")) {
      const exception = data.exceptions.find(
        (e) =>
          e.market_id === market.id && !e.participation_id && e.day === date,
      );
      if (exception?.cancelled) continue;
      for (const rule of data.rules.filter(
        (r) =>
          r.market_id === market.id &&
          !r.participation_id &&
          matchesMarketRule(r, date),
      )) {
        const opens = exception?.opens ?? rule.opens,
          closes = exception?.closes ?? rule.closes;
        const key = market.id + ":" + date + ":" + (opens ?? "");
        if (result.some((o) => o.key === key)) continue;
        result.push({ market, day: date, opens, closes, key });
      }
    }
  return result.sort((a, b) =>
    (a.day + (a.opens ?? "")).localeCompare(b.day + (b.opens ?? "")),
  );
}
export function marketPresence(
  data: MarketData,
  part: Participation,
  from: string,
  to: string,
) {
  if (!part.active) return [];
  return marketOccurrences(data, from, to)
    .filter((o) => o.market.id === part.market_id)
    .flatMap((o) => {
      const exception = data.exceptions.find(
        (e) => e.participation_id === part.id && e.day === o.day,
      );
      if (exception?.cancelled) return [];
      return data.rules
        .filter(
          (r) => r.participation_id === part.id && matchesMarketRule(r, o.day),
        )
        .flatMap((r) => {
          const start = exception?.opens ?? r.opens,
            end = exception?.closes ?? r.closes;
          const opens = o.opens && start ? [o.opens, start].sort()[1] : null,
            closes = o.closes && end ? [o.closes, end].sort()[0] : null;
          if (opens && closes && opens >= closes) return [];
          return [
            {
              ...o,
              opens,
              closes,
              participation: part,
              key: o.key + ":" + part.id,
            },
          ];
        });
    });
}
export function pickupInstant(
  date: string,
  time: string,
  zone: Market["timezone"] = "Europe/Madrid",
) {
  return madridToUtc(date, time, zone);
}
export function availableMarketPickups(
  data: MarketData,
  producer: string,
  now = new Date(),
) {
  return data.participants
    .filter((p) => p.producer_id === producer && p.pickup_enabled)
    .flatMap((p) =>
      marketPresence(data, p, localDay(now), addDays(localDay(now), 60)),
    )
    .filter((o) => {
      if (!o.opens || !o.closes) return false;
      try {
        return (
          Date.parse(pickupInstant(o.day, o.opens, o.market.timezone)) -
            o.participation.cutoff_minutes * 60000 >
          now.getTime()
        );
      } catch {
        return false;
      }
    });
}
export function filterMarkets(
  events: MarketOccurrence[],
  filter: {
    query: string;
    locality: string;
    category: string;
    date: string;
    radius: number;
    position: Position | null;
  },
) {
  const norm = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return events.filter(
    (o) =>
      norm(o.market.name + " " + o.market.locality).includes(
        norm(filter.query),
      ) &&
      norm(o.market.locality).includes(norm(filter.locality)) &&
      (!filter.date || o.day === filter.date) &&
      (!filter.category || o.market.categories.includes(filter.category)) &&
      (!filter.radius ||
        (filter.position !== null &&
          o.market.latitude !== null &&
          o.market.longitude !== null &&
          distanceKm(filter.position, {
            lat: o.market.latitude,
            lng: o.market.longitude,
          }) <= filter.radius)),
  );
}
export function duplicateMarkets(
  a: Pick<
    Market,
    "name" | "locality" | "latitude" | "longitude" | "source_key"
  >,
  b: Pick<
    Market,
    "name" | "locality" | "latitude" | "longitude" | "source_key"
  >,
) {
  const n = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  if (a.source_key && a.source_key === b.source_key) return true;
  return (
    n(a.name) === n(b.name) &&
    (n(a.locality) === n(b.locality) ||
      (a.latitude !== null &&
        b.latitude !== null &&
        a.longitude !== null &&
        b.longitude !== null &&
        distanceKm(
          { lat: a.latitude, lng: a.longitude },
          { lat: b.latitude, lng: b.longitude },
        ) < 0.15))
  );
}
