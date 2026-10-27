import { expect, test } from "vitest";
import { seedStore, transition } from "./local-model";
import { cartTransition } from "./cloud-data";
const ID = "00000000-0000-4000-8000-000000000020";
function fixture() {
  const data = seedStore();
  data.products[0].id = ID;
  data.quantities = { [ID]: 2 };
  return data;
}
for (const [name, change] of [
  ["demo", transition],
  ["cloud", cartTransition],
] as const) {
  test(`${name}: reduce a basket above new stock without allowing increases or reservation`, () => {
    const data = fixture();
    data.quantities[ID] = 10;
    data.products.find((p) => p.id === ID)!.stock = 3;
    expect(
      change(data, { type: "quantity", id: ID, delta: -1 }).quantities[ID],
    ).toBe(9);
    expect(() => change(data, { type: "quantity", id: ID, delta: 1 })).toThrow(
      /stock/,
    );
    expect(data.quantities[ID]).toBe(10);
  });
  test(`${name}: a withdrawn product can be reduced but never increased`, () => {
    const data = fixture();
    data.products.find((p) => p.id === ID)!.active = false;
    expect(
      change(data, { type: "quantity", id: ID, delta: -1 }).quantities[ID],
    ).toBe(1);
    expect(() => change(data, { type: "quantity", id: ID, delta: 1 })).toThrow(
      /disponible/,
    );
  });
}
