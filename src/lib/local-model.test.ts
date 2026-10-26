import { describe, it, expect } from "vitest";
import {
  seedStore,
  transition,
  readStore,
  STORAGE_KEY,
  lineTotal,
  storeSchema,
  type LocalStore,
} from "./local-model";
const slot = {
  id: "slot-test",
  date: "2040-01-02",
  start: "17:00",
  end: "18:00",
};
function ready() {
  const s = seedStore();
  s.farms[0].slots = [slot];
  return s;
}
const reserve = {
  type: "reserve" as const,
  id: "reserva-test",
  slotId: slot.id,
  now: "2039-12-01T12:00:00Z",
};
describe("UZTA local reservations", () => {
  it("rejects overlapping, invalid and past pickup slots", () => {
    const s = ready();
    expect(() =>
      transition(s, {
        type: "farm",
        value: {
          ...s.farms[0],
          slots: [
            slot,
            { ...slot, id: "overlap", start: "17:30", end: "18:30" },
          ],
        },
      }),
    ).toThrow(/solapar/);
    expect(() =>
      transition(s, {
        type: "farm",
        value: { ...s.farms[0], slots: [{ ...slot, date: "2020-01-01" }] },
      }),
    ).toThrow(/futuros/);
    expect(
      storeSchema.safeParse({
        ...s,
        farms: [
          { ...s.farms[0], slots: [{ ...slot, start: "99:00" }] },
          ...s.farms.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
  it("saves one complete snapshot, decrements inventory and clears the basket atomically", () => {
    const before = ready();
    const next = transition(before, reserve);
    const order = next.orders[0];
    expect(order.example).toBe(false);
    expect(lineTotal(order.lines)).toBe(1430);
    expect(next.quantities).toEqual({});
    expect(next.products[0].stock).toBe(18);
    expect(before.products[0].stock).toBe(20);
    const changed = transition(next, {
      type: "product",
      value: { ...next.products[0], priceCents: 900, name: "Otro nombre" },
    });
    expect(changed.orders[0].lines[0].priceCents).toBe(280);
    expect(changed.orders[0].lines[0].name).toBe("Tomates");
  });
  it("does not duplicate a repeated checkout request", () => {
    const saved = transition(ready(), reserve);
    const repeated = transition(saved, reserve);
    expect(repeated).toBe(saved);
    expect(repeated.products[0].stock).toBe(18);
  });
  it("rejects stock overselling and a basket mixing producers", () => {
    const s = ready();
    expect(() =>
      transition(s, { type: "quantity", id: "tomates", delta: 100 }),
    ).toThrow(/stock/);
    expect(() =>
      transition(s, { type: "quantity", id: "huevos-poules", delta: 1 }),
    ).toThrow(/otro productor/);
    s.products[0].stock = 1;
    expect(() => transition(s, reserve)).toThrow(/disponibilidad/);
    expect(s.orders).toEqual(seedStore().orders);
    expect(s.products[0].stock).toBe(1);
  });
  it("rejects missing or expired pickup slots and a closed local profile", () => {
    expect(() => transition(seedStore(), reserve)).toThrow(/fecha/);
    const s = ready();
    expect(() =>
      transition(s, { ...reserve, now: "2041-01-01T00:00:00Z" }),
    ).toThrow(/fecha/);
    s.sessionActive = false;
    expect(() => transition(s, reserve)).toThrow(/perfil/);
  });
  it("roundtrips local data and rejects corrupted storage without writing or deleting anything", () => {
    const data = transition(ready(), reserve);
    expect(readStore({ getItem: () => JSON.stringify(data) }).value).toEqual(
      data,
    );
    const invalid = readStore({ getItem: () => "{invalid" });
    expect(invalid.error).toContain("conservar");
    const wrong = structuredClone(data);
    wrong.products[0].priceCents = -1;
    expect(storeSchema.safeParse(wrong).success).toBe(false);
    expect(STORAGE_KEY).toBe("uzta.local.v1");
  });
  it("keeps immutable reservation pickup details after a slot is removed", () => {
    const saved = transition(ready(), reserve);
    const next = transition(saved, {
      type: "farm",
      value: { ...saved.farms[0], slots: [] },
    });
    expect(next.orders[0].pickup).toEqual(slot);
  });
});
