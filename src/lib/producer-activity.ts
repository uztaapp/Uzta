import type { LocalStore } from "./local-model";
import { availabilityOf } from "./availability";
import {
  addDays,
  localDay,
  marketPresence,
  pickupInstant,
  type MarketData,
} from "./markets";

// Presentation only: existing stock, reservation and attendance rules stay intact.
export function producerActivity(
  data: LocalStore,
  farmId: string,
  now = new Date(),
) {
  const products = data.products.filter(
    (p) => p.farmId === farmId && p.catalogVisible !== false,
  );
  const orders = data.orders.filter((o) => o.farmId === farmId && !o.example);
  const pending = orders.filter((o) => o.status === "Pendiente");
  const collectionDue = new Set(
    pending
      .filter((o) => {
        // A missing timestamp does not prove that collection has begun.
        const start = o.pickup.startsAt ? Date.parse(o.pickup.startsAt) : NaN;
        return Number.isFinite(start) && start <= now.getTime();
      })
      .map((o) => o.id),
  );
  return {
    products,
    orders,
    pending,
    collectionDue,
    active: products.filter((p) => p.active).length,
    completed: orders.filter((o) => o.status === "Completado").length,
    depleted: products.filter(
      (p) => p.active && availabilityOf(p) === "sold_out",
    ),
  };
}

export function producerMarketActivity(
  data: MarketData,
  farmId: string,
  now = new Date(),
) {
  const today = localDay(now);
  const occurrences = data.participants
    .filter((p) => p.producer_id === farmId && p.active)
    .flatMap((p) => marketPresence(data, p, today, addDays(today, 90)))
    .filter((o) => {
      if (o.day !== today || !o.closes) return true;
      try {
        return (
          Date.parse(pickupInstant(o.day, o.closes, o.market.timezone)) >
          now.getTime()
        );
      } catch {
        return false;
      }
    })
    .sort((a, b) =>
      (a.day + (a.opens ?? "")).localeCompare(b.day + (b.opens ?? "")),
    );
  const seen = new Set<string>();
  return occurrences.filter((o) => {
    if (seen.has(o.market.id)) return false;
    seen.add(o.market.id);
    return true;
  });
}
