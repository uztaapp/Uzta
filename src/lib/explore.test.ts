import { expect, test } from "vitest";
import { seedStore } from "./local-model";
import { clusterEntries, exploreEntries } from "./explore";
test("map and list share active available products and accent-insensitive catalogue search", () => {
  const data = seedStore();
  const entries = exploreEntries(
    data.farms,
    data.products,
    "aromaticas",
    "",
    null,
    0,
  );
  expect(entries).toHaveLength(1);
  expect(entries[0].products.every((p) => p.name.includes("aromáticas"))).toBe(
    true,
  );
  expect(
    exploreEntries(data.farms, data.products, "URKI", "", null, 0)[0].farm.id,
  ).toBe("urki");
  const inactive = data.products.map((p) => ({ ...p, active: false }));
  expect(exploreEntries(data.farms, inactive, "", "", null, 0)).toEqual([]);
  expect(
    exploreEntries(
      data.farms,
      data.products.map((p) => ({ ...p, stock: 0 })),
      "",
      "",
      null,
      0,
    ),
  ).toEqual([]);
});
test("missing coordinates remain listable but are never fabricated as pins", () => {
  const data = seedStore();
  data.farms.forEach((f) => (f.position = null));
  const entries = exploreEntries(data.farms, data.products, "", "", null, 0);
  expect(entries.length).toBeGreaterThan(0);
  expect(clusterEntries(entries, (p) => ({ x: p.lat, y: p.lng }))).toEqual([]);
  expect(
    exploreEntries(
      data.farms,
      data.products,
      "",
      "",
      { lat: 43.45, lng: -1.46 },
      5,
    ),
  ).toEqual([]);
});
test("public markers preserve precise coordinates and cluster across cell boundaries", () => {
  const data = seedStore();
  const a = {
    farm: { ...data.farms[0], position: { lat: 43.456789, lng: -1.456789 } },
    products: [data.products[0]],
  };
  const b = { farm: { ...a.farm, id: "second" }, products: a.products };
  let calls = 0;
  const groups = clusterEntries([a, b], (p) => {
    expect(p).toEqual({ lat: 43.456789, lng: -1.456789 });
    return { x: ++calls === 1 ? 51 : 53, y: 10 };
  });
  expect(groups).toHaveLength(1);
  expect(groups[0].entries).toHaveLength(2);
  expect(a.farm.position.lat).toBe(43.456789);
});
test("ten thousand entries cluster with one projection per point", () => {
  const data = seedStore();
  const entries = Array.from({ length: 10000 }, (_, i) => ({
    farm: {
      ...data.farms[0],
      id: String(i),
      position: { lat: 43.45, lng: -1.46 },
    },
    products: [data.products[0]],
  }));
  let calls = 0;
  const start = performance.now();
  const groups = clusterEntries(entries, () => {
    calls++;
    return { x: 100, y: 100 };
  });
  expect(groups).toHaveLength(1);
  expect(groups[0].entries).toHaveLength(10000);
  expect(calls).toBe(10000);
  expect(performance.now() - start).toBeLessThan(2000);
});

test("seller privacy, category, locality, distance and stock filters compose", () => {
  const data = seedStore();
  data.farms[0].sellerType = "private";
  data.farms[0].position = { lat: 43.456123, lng: -1.456123 };
  data.farms[1].sellerType = "professional";
  const entries = exploreEntries(
    data.farms,
    data.products,
    "",
    "Verduras",
    null,
    0,
    "private",
  );
  expect(entries).toHaveLength(1);
  expect(entries[0].farm.position).toEqual({ lat: 43.46, lng: -1.46 });
  expect(
    entries[0].products.every(
      (p) => p.farmId === data.farms[0].id && p.category === "Verduras",
    ),
  ).toBe(true);
  expect(data.farms[0].position.lat).toBe(43.456123);
  expect(
    exploreEntries(
      data.farms,
      data.products,
      "",
      "",
      { lat: 0, lng: 0 },
      1,
      "private",
    ),
  ).toEqual([]);
  const sold = data.products.map((p) => ({ ...p, stock: 0 }));
  expect(exploreEntries(data.farms, sold, "", "", null, 0, "private")).toEqual(
    [],
  );
  expect(
    exploreEntries(data.farms, sold, "", "", null, 0, "private", false),
  ).toHaveLength(1);
});
