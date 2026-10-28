import { acceptsEusko } from "./eusko";
import {
  canReserve,
  matchesAvailability,
  type AvailabilityFilter,
} from "./availability";
import type { Farm, Product } from "./local-model";
import { publicPosition, withinRadius, type Position } from "./nearby";
import { sellerPosition, type SellerType } from "./sellers";
export type ExploreEntry = { farm: Farm; products: Product[] };
export function exploreEntries(
  farms: Farm[],
  products: Product[],
  query: string,
  category: string,
  center: Position | null,
  radius: number,
  sellerType: SellerType | "" = "",
  availableOnly = true,
  availability?: AvailabilityFilter,
  euskoOnly = false,
) {
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const q = normalize(query);
  const grouped = new Map<string, Product[]>();
  for (const p of products)
    if (
      p.active &&
      p.catalogVisible !== false &&
      (availability
        ? matchesAvailability(p, availability)
        : !availableOnly || canReserve(p)) &&
      (!category || p.category === category)
    ) {
      const list = grouped.get(p.farmId) ?? [];
      list.push(p);
      grouped.set(p.farmId, list);
    }
  return farms.flatMap((original) => {
    if (original.catalogVisible === false) return [];
    if (sellerType && original.sellerType !== sellerType) return [];
    if (euskoOnly && !acceptsEusko(original)) return [];
    const farm = {
      ...original,
      position: sellerPosition(original.position, original.sellerType),
    };
    let available = grouped.get(farm.id) ?? [];
    if (q && !normalize(`${farm.name} ${farm.location}`).includes(q))
      available = available.filter((p) =>
        normalize(`${p.name} ${p.category}`).includes(q),
      );
    return available.length &&
      (!radius || withinRadius(farm.position, center, radius))
      ? [{ farm, products: available }]
      : [];
  });
}
// TRUKA's 52 px proximity grouping, indexed into neighboring cells for large catalogues.
export function clusterEntries(
  entries: ExploreEntry[],
  project: (p: Position) => { x: number; y: number },
  size = 52,
) {
  const groups: {
    entries: ExploreEntry[];
    position: Position;
    x: number;
    y: number;
  }[] = [];
  const cells = new Map<string, typeof groups>();
  for (const entry of entries) {
    const position = sellerPosition(entry.farm.position, entry.farm.sellerType);
    if (!position) continue;
    const pixel = project(position),
      cx = Math.floor(pixel.x / size),
      cy = Math.floor(pixel.y / size);
    let found: (typeof groups)[number] | undefined;
    for (let dx = -1; dx <= 1 && !found; dx++)
      for (let dy = -1; dy <= 1 && !found; dy++)
        found = cells
          .get(`${cx + dx}:${cy + dy}`)
          ?.find((g) => Math.hypot(g.x - pixel.x, g.y - pixel.y) < size);
    if (found) found.entries.push(entry);
    else {
      const group = { entries: [entry], position, ...pixel };
      groups.push(group);
      const key = `${cx}:${cy}`;
      const bucket = cells.get(key) ?? [];
      bucket.push(group);
      cells.set(key, bucket);
    }
  }
  return groups;
}
