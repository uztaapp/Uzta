import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  madridToUtc,
  madridParts,
  readCloudCart,
  writeCloudCart,
  cartKey,
  pendingCheckoutKey,
  emptyCloudData,
  loadCloudData,
  persistCloudCommand,
} from "./cloud-data";
const USER = "00000000-0000-4000-8000-000000000001",
  OTHER = "00000000-0000-4000-8000-000000000002",
  FARM = "00000000-0000-4000-8000-000000000010",
  PRODUCT = "00000000-0000-4000-8000-000000000020",
  SLOT = "00000000-0000-4000-8000-000000000030",
  ORDER = "00000000-0000-4000-8000-000000000040",
  ORDER2 = "00000000-0000-4000-8000-000000000041";
const user = {
  id: USER,
  email: "cuenta@example.test",
  user_metadata: { display_name: "Nombre de alta", role: "admin" },
} as unknown as User;
function fixture() {
  const rows: Record<string, any[]> = {
    uzta_producers: [
      {
        id: FARM,
        owner_id: USER,
        name: "Mi huerta",
        location: "Bayona",
        description: "",
        ecological: true,
        active: true,
      },
    ],
    uzta_products: [
      {
        id: PRODUCT,
        producer_id: FARM,
        name: "Tomates",
        price_cents: 280,
        unit: "kg",
        category: "Verduras",
        stock_units: 20,
        active: true,
        featured: false,
      },
    ],
    uzta_pickup_slots: [
      {
        id: SLOT,
        producer_id: FARM,
        starts_at: "2040-01-02T16:00:00Z",
        ends_at: "2040-01-02T17:00:00Z",
        active: true,
      },
    ],
    uzta_profiles: [
      { user_id: USER, display_name: "Perfil guardado", location: "Ustaritz" },
    ],
    uzta_orders: [],
    uzta_favorites: [],
  };
  const log: {
    table: string;
    operation: string;
    value?: any;
    filters?: any[];
  }[] = [];
  const rpc = vi.fn(async (_name: string, _args: any) => ({
    data: ORDER,
    error: null,
  }));
  const api = {
    rpc,
    from: (table: string) => {
      let operation = "read",
        value: any,
        filters: any[] = [];
      const builder: any = {
        select: () => builder,
        order: () => builder,
        eq: (key: string, v: any) => {
          filters.push([key, v]);
          return builder;
        },
        insert: (v: any) => {
          operation = "insert";
          value = v;
          return builder;
        },
        upsert: (v: any) => {
          operation = "upsert";
          value = v;
          return builder;
        },
        update: (v: any) => {
          operation = "update";
          value = v;
          return builder;
        },
        delete: () => {
          operation = "delete";
          return builder;
        },
        maybeSingle: () => execute(true),
        single: () => execute(true),
        then: (resolve: any, reject: any) =>
          execute(false).then(resolve, reject),
      };
      async function execute(single: boolean) {
        log.push({ table, operation, value, filters });
        if (operation === "upsert" || operation === "insert") {
          if (table === "uzta_profiles" && !rows[table].length)
            rows[table].push(value);
          return { data: null, error: null };
        }
        const selected = (rows[table] ?? []).filter((r) =>
          filters.every(([key, v]) => r[key] === v),
        );
        return { data: single ? (selected[0] ?? null) : selected, error: null };
      }
      return builder;
    },
  } as unknown as SupabaseClient;
  return { api, rows, log, rpc };
}
function order() {
  return {
    id: ORDER,
    customer_id: USER,
    producer_id: FARM,
    producer_name: "Mi huerta",
    pickup_starts_at: "2040-01-02T16:00:00Z",
    pickup_ends_at: "2040-01-02T17:00:00Z",
    message: "",
    status: "Pendiente",
    created_at: "2039-12-01T12:00:00Z",
    items: [
      {
        product_id: PRODUCT,
        product_name: "Tomates",
        unit_price_cents: 280,
        unit: "kg",
        quantity: 2,
      },
    ],
  };
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("cloud data boundary", () => {
  it("persists only an uploaded photo reference, never its data URL or temporary signed URL", async () => {
    const f = fixture();
    const path = `${USER}/${FARM}/${PRODUCT}/${ORDER}.webp`;
    f.rows.uzta_products[0].photo_path = path;
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const signed = `https://abgysktjctrxfkcejjwu.supabase.co/storage/v1/object/sign/uzta-product-photos/${path}?token=fixture`;
    (f.api as any).storage = {
      from: () => ({
        upload,
        createSignedUrls: vi.fn().mockResolvedValue({
          data: [{ path, signedUrl: signed }],
          error: null,
        }),
      }),
    };
    const { data } = await loadCloudData(user, f.api);
    expect(data.products[0].photoUrl).toBe(signed);
    f.log.length = 0;
    await persistCloudCommand(
      data,
      {
        type: "product",
        value: {
          ...data.products[0],
          photo: `data:image/webp;base64,${btoa("RIFFxxxxWEBPtest-pixels")}`,
        },
      },
      user,
      FARM,
      f.api,
    );
    const saved = f.log.find(
      (l) => l.table === "uzta_products" && l.operation === "upsert",
    )!.value;
    expect(saved.photo_path).toBe(upload.mock.calls[0][0]);
    expect(saved.photo_path).not.toBe(path);
    expect(saved).not.toHaveProperty("photo");
    expect(saved).not.toHaveProperty("photoUrl");
  });
  it("does not save product metadata when its photo upload fails", async () => {
    const f = fixture();
    const { data } = await loadCloudData(user, f.api);
    f.log.length = 0;
    (f.api as any).storage = {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: { message: "offline" } }),
      }),
    };
    await expect(
      persistCloudCommand(
        data,
        {
          type: "product",
          value: {
            ...data.products[0],
            photo: `data:image/webp;base64,${btoa("RIFFxxxxWEBPtest-pixels")}`,
          },
        },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow(/subir/);
    expect(f.log).toHaveLength(0);
  });
  it("creates a store only for the verified account and excludes presentation-only fields", async () => {
    const f = fixture();
    const farm = {
      id: FARM,
      name: " Mi tienda ",
      location: "Localidad de prueba",
      description: "Prueba",
      ecological: false,
      distance: "Sin calcular",
      slots: [],
    };
    await persistCloudCommand(
      emptyCloudData(),
      { type: "farm", value: farm },
      user,
      null,
      f.api,
    );
    expect(f.log[0].value).toEqual({
      id: FARM,
      owner_id: USER,
      name: "Mi tienda",
      seller_type: null,
      eusko_notes: false,
      eusko_digital: false,
      location: "Localidad de prueba",
      description: "Prueba",
      ecological: false,
      active: true,
    });
    await expect(
      persistCloudCommand(
        emptyCloudData(),
        { type: "farm", value: farm },
        user,
        OTHER,
        f.api,
      ),
    ).rejects.toThrow(/pertenece/);
    expect(f.log).toHaveLength(1);
  });
  it("validates all new pickup slots before any store write", async () => {
    const f = fixture();
    const { data } = await loadCloudData(user, f.api);
    f.log.length = 0;
    const farm = {
      ...data.farms[0],
      name: "Cambio pendiente",
      slots: [
        { id: ORDER, date: "2040-01-03", start: "10:00", end: "11:00" },
        { id: ORDER2, date: "2040-01-03", start: "10:30", end: "11:30" },
      ],
    };
    await expect(
      persistCloudCommand(
        data,
        { type: "farm", value: farm },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow(/solapar/);
    expect(f.log).toHaveLength(0);
  });
  it("sends new pickup slots together with Madrid timezone conversion", async () => {
    const f = fixture();
    const { data } = await loadCloudData(user, f.api);
    f.log.length = 0;
    const farm = {
      ...data.farms[0],
      slots: [
        ...data.farms[0].slots,
        { id: ORDER, date: "2040-01-03", start: "10:00", end: "12:00" },
      ],
    };
    await persistCloudCommand(
      data,
      { type: "farm", value: farm },
      user,
      FARM,
      f.api,
    );
    expect(f.log).toHaveLength(1);
    expect(f.log[0]).toMatchObject({
      table: "uzta_pickup_slots",
      operation: "insert",
      value: [
        {
          id: ORDER,
          producer_id: FARM,
          starts_at: "2040-01-03T09:00:00.000Z",
          ends_at: "2040-01-03T11:00:00.000Z",
          active: true,
        },
      ],
    });
  });
  it("rejects invalid product values and another producer before writing", async () => {
    const f = fixture();
    const { data } = await loadCloudData(user, f.api);
    f.log.length = 0;
    await expect(
      persistCloudCommand(
        data,
        { type: "product", value: { ...data.products[0], priceCents: -1 } },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow();
    await expect(
      persistCloudCommand(
        data,
        { type: "product", value: { ...data.products[0], farmId: OTHER } },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow(/pertenece/);
    expect(f.log).toHaveLength(0);
    await persistCloudCommand(
      data,
      { type: "product", value: data.products[0] },
      user,
      FARM,
      f.api,
    );
    expect(f.log[0].value).toMatchObject({
      producer_id: FARM,
      price_cents: 280,
      stock_units: 20,
      featured: false,
    });
    expect(f.log[0].value).not.toHaveProperty("crop");
  });
  it("converts Madrid pickup times correctly and rejects DST gaps and ambiguous repeated hours", () => {
    expect(madridToUtc("2026-01-15", "17:00")).toBe("2026-01-15T16:00:00.000Z");
    expect(madridToUtc("2026-07-15", "17:00")).toBe("2026-07-15T15:00:00.000Z");
    expect(madridParts("2026-07-15T15:00:00Z").time).toBe("17:00");
    expect(() => madridToUtc("2026-03-29", "02:30")).toThrow(/horario/);
    expect(() => madridToUtc("2026-10-25", "02:30")).toThrow(/horario/);
  });
  it("scopes carts per account and never reads or migrates demonstration data", () => {
    localStorage.setItem("uzta.local.v1", "retained-demo");
    writeCloudCart(USER, {
      quantities: { [PRODUCT]: 2 },
      message: "Mi cuenta",
    });
    expect(readCloudCart(OTHER)).toEqual({ quantities: {}, message: "" });
    expect(readCloudCart(null)).toEqual({ quantities: {}, message: "" });
    expect(readCloudCart(USER).message).toBe("Mi cuenta");
    expect(localStorage.getItem("uzta.local.v1")).toBe("retained-demo");
  });
  it("public loading does not create profiles or read any private table", async () => {
    const f = fixture();
    const loaded = await loadCloudData(null, f.api);
    expect(f.log.map((x) => x.table).sort()).toEqual([
      "uzta_pickup_slots",
      "uzta_producers",
      "uzta_products",
    ]);
    expect(loaded.data.profile.name).toBe("");
    expect(loaded.data.orders).toEqual([]);
    expect(loaded.managedFarmId).toBeNull();
  });
  it("uses the verified account and an actual producer ID instead of demo identities", async () => {
    const f = fixture();
    const loaded = await loadCloudData(user, f.api);
    expect(loaded.managedFarmId).toBe(FARM);
    expect(loaded.data.profile.name).toBe("Perfil guardado");
    expect(loaded.data.profile.email).toBe(user.email);
    expect(loaded.data.products[0].featured).toBe(false);
    expect(loaded.data.products[0].crop).toEqual([0, 0, 0, 0]);
    expect(loaded.data.farms[0].slots[0].start).toBe("17:00");
  });
  it("creates only the current verified profile, without trusting metadata roles", async () => {
    const f = fixture();
    f.rows.uzta_profiles = [];
    await loadCloudData(user, f.api);
    const inserted = f.log.find(
      (x) => x.table === "uzta_profiles" && x.operation === "upsert",
    )!.value;
    expect(inserted.user_id).toBe(USER);
    expect(inserted).not.toHaveProperty("role");
  });
  it("reuses a persisted receipt ID after an unknown transport error or page reload", async () => {
    const f = fixture();
    writeCloudCart(USER, { quantities: { [PRODUCT]: 2 }, message: "" });
    const { data } = await loadCloudData(user, f.api);
    f.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "transport failed" },
    } as any);
    const first = {
      type: "reserve" as const,
      id: ORDER,
      slotId: SLOT,
      now: "2039-01-01T00:00:00Z",
    };
    await expect(
      persistCloudCommand(data, first, user, FARM, f.api),
    ).rejects.toBeTruthy();
    await persistCloudCommand(
      data,
      { ...first, id: ORDER2 },
      user,
      FARM,
      f.api,
    );
    expect(f.rpc.mock.calls.map((c) => c[1].p_id)).toEqual([ORDER, ORDER]);
    expect(f.rpc.mock.calls[1][1].p_items).toEqual([
      { product_id: PRODUCT, quantity: 2 },
    ]);
    expect(f.rpc.mock.calls[1][1]).not.toHaveProperty("price");
  });
  it("does not send a reservation if its receipt cannot first be saved", async () => {
    const f = fixture();
    writeCloudCart(USER, { quantities: { [PRODUCT]: 2 }, message: "" });
    const { data } = await loadCloudData(user, f.api);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw Error("full");
    });
    await expect(
      persistCloudCommand(
        data,
        { type: "reserve", id: ORDER, slotId: SLOT, now: "" },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow("full");
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("reconciles a confirmed receipt after reload without duplicating or keeping an already-reserved cart", async () => {
    const f = fixture();
    writeCloudCart(USER, { quantities: { [PRODUCT]: 2 }, message: "" });
    localStorage.setItem(
      pendingCheckoutKey(USER),
      JSON.stringify({ id: ORDER, fingerprint: "fixture" }),
    );
    f.rows.uzta_orders = [order()];
    const loaded = await loadCloudData(user, f.api);
    expect(loaded.data.quantities).toEqual({});
    expect(readCloudCart(USER).quantities).toEqual({});
    expect(localStorage.getItem(pendingCheckoutKey(USER))).toBeNull();
    expect(loaded.data.orders[0].customerId).toBe(USER);
  });
  it("preserves a changed cart when recovering an older confirmed receipt", async () => {
    const f = fixture();
    writeCloudCart(USER, {
      quantities: { [PRODUCT]: 3 },
      message: "Otra cesta",
    });
    localStorage.setItem(
      pendingCheckoutKey(USER),
      JSON.stringify({ id: ORDER, fingerprint: "fixture" }),
    );
    f.rows.uzta_orders = [order()];
    const loaded = await loadCloudData(user, f.api);
    expect(loaded.data.quantities[PRODUCT]).toBe(3);
    expect(loaded.data.message).toBe("Otra cesta");
  });
  it("keeps unavailable cart entries visible so they are not silently discarded", async () => {
    const f = fixture();
    writeCloudCart(USER, { quantities: { [ORDER2]: 1 }, message: "" });
    const loaded = await loadCloudData(user, f.api);
    expect(loaded.data.products.find((p) => p.id === ORDER2)?.active).toBe(
      false,
    );
    expect(loaded.data.quantities[ORDER2]).toBe(1);
  });
});

it("private locations are normalized at the cloud boundary even if an old API returns precision", async () => {
  const f = fixture();
  Object.assign(f.rows.uzta_producers[0], {
    seller_type: "private",
    public_latitude: 43.456123,
    public_longitude: -1.456123,
  });
  const { data } = await loadCloudData(null, f.api);
  expect(data.farms[0].sellerType).toBe("private");
  expect(data.farms[0].position).toEqual({ lat: 43.46, lng: -1.46 });
});

it("writes a private seller with coarse coordinates and no administrative claims", async () => {
  const f = fixture();
  await persistCloudCommand(
    emptyCloudData(),
    {
      type: "farm",
      value: {
        id: FARM,
        name: "Public name",
        location: "Town",
        description: "",
        ecological: false,
        distance: "",
        slots: [],
        sellerType: "private",
        position: { lat: 43.456123, lng: -1.456123 },
      },
    },
    user,
    null,
    f.api,
  );
  expect(f.log[0].value).toMatchObject({
    owner_id: USER,
    seller_type: "private",
    public_latitude: 43.46,
    public_longitude: -1.46,
  });
  expect(f.log[0].value).not.toHaveProperty("role");
});

it("loads favorites again after sign-out and isolates account data", async () => {
  const f = fixture();
  f.rows.uzta_favorites = [{ user_id: USER, product_id: PRODUCT }];
  expect((await loadCloudData(user, f.api)).data.favorites).toEqual([PRODUCT]);
  expect((await loadCloudData(null, f.api)).data.favorites).toEqual([]);
  expect(
    (await loadCloudData({ ...user, id: OTHER }, f.api)).data.favorites,
  ).toEqual([]);
  expect((await loadCloudData(user, f.api)).data.favorites).toEqual([PRODUCT]);
});
it("writes and removes product favorites using only the current account", async () => {
  const f = fixture(),
    data = emptyCloudData();
  await persistCloudCommand(
    data,
    { type: "favorite", id: PRODUCT },
    user,
    null,
    f.api,
  );
  expect(f.log.at(-1)).toMatchObject({
    table: "uzta_favorites",
    operation: "upsert",
    value: { user_id: USER, product_id: PRODUCT },
  });
  data.favorites = [PRODUCT];
  await persistCloudCommand(
    data,
    { type: "favorite", id: PRODUCT },
    user,
    null,
    f.api,
  );
  expect(f.log.at(-1)).toMatchObject({
    operation: "delete",
    filters: [
      ["user_id", USER],
      ["product_id", PRODUCT],
    ],
  });
  await expect(
    persistCloudCommand(
      data,
      { type: "favorite", id: PRODUCT },
      null,
      null,
      f.api,
    ),
  ).rejects.toThrow();
});
it("seller favorites reuse loading and persistence when activated", async () => {
  const config = (await import("../../config/uzta-cloud.public.json")).default;
  const before = config.sellerFavoritesReady;
  config.sellerFavoritesReady = true;
  try {
    const f = fixture();
    f.rows.uzta_producer_favorites = [{ user_id: USER, producer_id: FARM }];
    const data = (await loadCloudData(user, f.api)).data;
    expect(data.sellerFavorites).toEqual([FARM]);
    await persistCloudCommand(
      data,
      { type: "sellerFavorite", id: FARM },
      user,
      null,
      f.api,
    );
    expect(f.log.at(-1)).toMatchObject({
      table: "uzta_producer_favorites",
      operation: "delete",
      filters: [
        ["user_id", USER],
        ["producer_id", FARM],
      ],
    });
    data.sellerFavorites = [];
    await persistCloudCommand(
      data,
      { type: "sellerFavorite", id: FARM },
      user,
      null,
      f.api,
    );
    expect(f.log.at(-1)).toMatchObject({
      table: "uzta_producer_favorites",
      operation: "upsert",
      value: { user_id: USER, producer_id: FARM },
    });
  } finally {
    config.sellerFavoritesReady = before;
  }
});

it("persists seasonal availability and its estimate through existing product writes", async () => {
  const config = (await import("../../config/uzta-cloud.public.json")).default;
  const before = config.availabilityReady;
  config.availabilityReady = true;
  try {
    const f = fixture();
    f.rows.uzta_products[0].availability = "upcoming";
    f.rows.uzta_products[0].expected_available_on = "2040-07-15";
    const loaded = await loadCloudData(user, f.api);
    const product = loaded.data.products[0];
    expect(product.availability).toBe("upcoming");
    expect(product.expectedAvailableOn).toBe("2040-07-15");
    await persistCloudCommand(
      loaded.data,
      { type: "product", value: product },
      user,
      FARM,
      f.api,
    );
    expect(f.log.at(-1)).toMatchObject({
      table: "uzta_products",
      value: { availability: "upcoming", expected_available_on: "2040-07-15" },
    });
    await expect(
      persistCloudCommand(
        loaded.data,
        {
          type: "product",
          value: { ...product, availability: "available", stock: 0 },
        },
        user,
        FARM,
        f.api,
      ),
    ).rejects.toThrow();
  } finally {
    config.availabilityReady = before;
  }
});
it("real reservation rejects upcoming products even if they still have stock", async () => {
  const f = fixture(),
    loaded = await loadCloudData(user, f.api);
  const product = loaded.data.products[0];
  product.availability = "upcoming";
  loaded.data.quantities = { [PRODUCT]: 1 };
  await expect(
    persistCloudCommand(
      loaded.data,
      { type: "reserve", slotId: SLOT, id: ORDER, now: "2040-01-01T10:00:00Z" },
      user,
      null,
      f.api,
    ),
  ).rejects.toThrow();
  expect(f.rpc).not.toHaveBeenCalled();
});

it("saves the seller's declared Eusko methods through existing ownership writes", async () => {
  const config = (await import("../../config/uzta-cloud.public.json")).default;
  const prior = config.euskoReady;
  config.euskoReady = true;
  try {
    const f = fixture();
    f.rows.uzta_producers[0].eusko_notes = true;
    const loaded = await loadCloudData(user, f.api);
    expect(loaded.data.farms[0].euskoNotes).toBe(true);
    await persistCloudCommand(
      loaded.data,
      {
        type: "farm",
        value: {
          ...loaded.data.farms[0],
          euskoNotes: false,
          euskoDigital: true,
        },
      },
      user,
      FARM,
      f.api,
    );
    expect(
      f.log
        .filter((e) => e.table === "uzta_producers" && e.operation === "upsert")
        .at(-1),
    ).toMatchObject({
      value: { eusko_notes: false, eusko_digital: true, owner_id: USER },
    });
  } finally {
    config.euskoReady = prior;
  }
});
it("sends only an informational payment preference with unchanged reservation quantities", async () => {
  const config = (await import("../../config/uzta-cloud.public.json")).default;
  const prior = config.euskoReady;
  config.euskoReady = true;
  try {
    const f = fixture();
    f.rows.uzta_producers[0].eusko_digital = true;
    const loaded = await loadCloudData(user, f.api);
    loaded.data.quantities = { [PRODUCT]: 1 };
    await persistCloudCommand(
      loaded.data,
      {
        type: "reserve",
        id: ORDER,
        slotId: SLOT,
        now: "2040-01-01T10:00:00Z",
        paymentPreference: "EUSKO",
      },
      user,
      null,
      f.api,
    );
    expect(f.rpc).toHaveBeenCalledWith(
      "uzta_reserve_order_payment",
      expect.objectContaining({
        p_preference: "EUSKO",
        p_items: [{ product_id: PRODUCT, quantity: 1 }],
      }),
    );
  } finally {
    config.euskoReady = prior;
  }
});

it("uses a Google display name only for a new profile, never for privileges", async () => {
  const f = fixture();
  f.rows.uzta_profiles = [];
  await loadCloudData(
    { ...user, user_metadata: { full_name: "Persona Google", role: "admin" } },
    f.api,
  );
  expect(
    f.log.find((e) => e.table === "uzta_profiles" && e.operation === "upsert"),
  ).toMatchObject({ value: { display_name: "Persona Google" } });
  expect(
    f.log.find((e) => e.table === "uzta_profiles" && e.operation === "upsert")
      ?.value,
  ).not.toHaveProperty("role");
});

it("legacy examples remain available to owner history but are not public offers", async () => {
  const config = (await import("../../config/uzta-cloud.public.json")).default;
  const f = fixture(),
    farm = config.knownExampleProducerIds[0],
    product = config.knownExampleProductIds[0];
  f.rows.uzta_producers[0].id = farm;
  f.rows.uzta_products[0].producer_id = farm;
  f.rows.uzta_products[0].id = product;
  f.rows.uzta_pickup_slots[0].producer_id = farm;
  const data = (await loadCloudData(user, f.api)).data;
  expect(data.products).toHaveLength(1);
  expect(data.products[0].catalogVisible).toBe(false);
  expect(data.farms[0].catalogVisible).toBe(false);
  const { canReserve } = await import("./availability");
  expect(canReserve(data.products[0])).toBe(false);
  expect(
    f.log.filter((e) => e.table !== "uzta_profiles" && e.operation !== "read"),
  ).toEqual([]);
});
