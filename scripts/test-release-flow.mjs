// One isolated end-to-end data path: real SQL/RLS + the application's real data adapter.
// No HTTP, Supabase project, real account or production record is used.
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "vite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  vite = await createServer({
    server: { middlewareMode: true },
    logLevel: "silent",
  });
const memory = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  },
});
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let checks = 0;
async function txAs(uid, run) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role " + (uid ? "authenticated" : "anon"));
    if (uid)
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        uid,
      ]);
    return run(tx);
  });
}
function apiFor(uid) {
  const allowed = new Set([
    "uzta_profiles",
    "uzta_producers",
    "uzta_products",
    "uzta_pickup_slots",
    "uzta_orders",
    "uzta_favorites",
    "uzta_producer_favorites",
  ]);
  return {
    from(table) {
      assert.ok(allowed.has(table));
      let operation = "select",
        values,
        options = {},
        filters = [],
        ordering = [],
        single = false,
        join = false;
      const b = {
        select(text) {
          join = !!text?.includes("items:");
          return b;
        },
        eq(k, v) {
          assert.match(k, /^[a-z_]+$/);
          filters.push([k, v]);
          return b;
        },
        order(k, opt) {
          ordering.push(k + (opt?.ascending === false ? " desc" : ""));
          return b;
        },
        upsert(v, o) {
          operation = "upsert";
          values = v;
          options = o ?? {};
          return b;
        },
        insert(v) {
          operation = "insert";
          values = v;
          return b;
        },
        update(v) {
          operation = "update";
          values = v;
          return b;
        },
        delete() {
          operation = "delete";
          return b;
        },
        maybeSingle() {
          single = true;
          return execute();
        },
        single() {
          single = true;
          return execute();
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        },
      };
      async function execute() {
        try {
          return await txAs(uid, async (tx) => {
            let rows = [];
            if (operation === "upsert" || operation === "insert")
              for (const row of Array.isArray(values) ? values : [values]) {
                const keys = Object.keys(row);
                keys.forEach((k) => assert.match(k, /^[a-z_]+$/));
                const conflict = options.onConflict;
                let sql = `insert into public.${table}(${keys.join(",")}) values(${keys.map((_, i) => "$" + (i + 1)).join(",")})`;
                if (conflict)
                  sql +=
                    ` on conflict(${conflict}) ` +
                    (options.ignoreDuplicates
                      ? "do nothing"
                      : "do update set " +
                        keys
                          .filter((k) => !conflict.split(",").includes(k))
                          .map((k) => k + "=excluded." + k)
                          .join(","));
                await tx.query(
                  sql,
                  keys.map((k) => row[k]),
                );
              }
            else {
              let args = [],
                sql;
              if (operation === "update") {
                const keys = Object.keys(values);
                sql =
                  `update public.${table} set ` +
                  keys.map((k, i) => k + "=$" + (i + 1)).join(",");
                args = keys.map((k) => values[k]);
              } else
                sql =
                  (operation === "delete" ? "delete from " : "select * from ") +
                  `public.${table}`;
              if (filters.length)
                sql +=
                  " where " +
                  filters
                    .map(([k, v]) => {
                      args.push(v);
                      return k + "=$" + args.length;
                    })
                    .join(" and ");
              if (operation === "select" && ordering.length)
                sql += " order by " + ordering.join(",");
              rows = (await tx.query(sql, args)).rows;
              if (join)
                for (const row of rows)
                  row.items = (
                    await tx.query(
                      "select * from public.uzta_order_items where order_id=$1",
                      [row.id],
                    )
                  ).rows;
            }
            return {
              data: JSON.parse(
                JSON.stringify(single ? (rows[0] ?? null) : rows, (_key, v) =>
                  typeof v === "bigint" ? String(v) : v,
                ),
              ),
              error: null,
            };
          });
        } catch (error) {
          return {
            data: null,
            error: { message: error.message, code: error.code },
          };
        }
      }
      return b;
    },
    async rpc(name, args) {
      const columns = {
        uzta_reserve_order_payment: [
          "p_id",
          "p_slot",
          "p_items",
          "p_message",
          "p_preference",
        ],
        uzta_complete_order: ["p_id"],
        uzta_cancel_order: ["p_id"],
      }[name];
      assert.ok(columns, name);
      try {
        const result = await txAs(uid, (tx) =>
          tx.query(
            `select public.${name}(${columns.map((k, i) => "$" + (i + 1) + (k === "p_items" ? "::jsonb" : "")).join(",")}) value`,
            columns.map((k) =>
              k === "p_items" ? JSON.stringify(args[k]) : args[k],
            ),
          ),
        );
        return { data: result.rows[0].value, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error.message, code: error.code },
        };
      }
    },
  };
}
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;
create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;grant insert,update,delete on storage.objects to authenticated;`);
  for (const f of (await readdir("supabase/migrations"))
    .filter(
      (f) => f.endsWith(".sql") && f !== "20261029030000_producer_approval.sql",
    )
    .sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  const { loadCloudData, persistCloudCommand, cartTransition, writeCloudCart } =
    await vite.ssrLoadModule("/src/lib/cloud-data.ts");
  const { exploreEntries } = await vite.ssrLoadModule("/src/lib/explore.ts");
  const releaseConfig = (
    await vite.ssrLoadModule("/config/uzta-cloud.public.json")
  ).default;
  releaseConfig.cancellationsReady = true;
  const buyer = {
    id: id(2),
    email: "buyer@example.test",
    user_metadata: { display_name: "Comprador aislado" },
  };
  await db.query("insert into auth.users values($1)", [buyer.id]);
  for (const [offset, type] of [
    [100, "professional"],
    [200, "private"],
  ]) {
    const seller = {
      id: id(offset),
      email: type + "@example.test",
      user_metadata: { display_name: "Vendedor aislado" },
    };
    await db.query("insert into auth.users values($1)", [seller.id]);
    const api = apiFor(seller.id),
      buyerApi = apiFor(buyer.id);
    let loaded = await loadCloudData(seller, api);
    assert.equal(loaded.managedFarmId, null);
    const farm = {
      id: id(offset + 1),
      sellerType: type,
      name: "Tienda aislada " + type,
      location: "Baiona",
      description: "Solo base desechable",
      distance: "",
      ecological: false,
      position: { lat: 43.456789, lng: -1.234567 },
      slots: [
        {
          id: id(offset + 2),
          date: "2035-01-02",
          start: "12:00",
          end: "13:00",
        },
      ],
    };
    await persistCloudCommand(
      loaded.data,
      { type: "farm", value: farm },
      seller,
      null,
      api,
    );
    loaded = await loadCloudData(seller, api);
    assert.equal(loaded.managedFarmId, farm.id);
    checks++;
    const product = {
      id: id(offset + 3),
      farmId: farm.id,
      name: "Producto aislado " + type,
      description: "Local",
      priceCents: 199,
      stock: 5,
      unit: "kg",
      category: "Verduras",
      crop: [0, 0, 0, 0],
      photo: null,
      active: true,
      featured: true,
      availability: "available",
    };
    await persistCloudCommand(
      loaded.data,
      { type: "product", value: product },
      seller,
      farm.id,
      api,
    );
    checks++;
    let shopping = (await loadCloudData(buyer, buyerApi)).data;
    assert.ok(shopping.products.some((p) => p.id === product.id && p.active));
    assert.ok(
      exploreEntries(
        shopping.farms,
        shopping.products,
        "Producto aislado " + type,
        "",
        null,
        0,
      ).some((e) => e.farm.id === farm.id),
    );
    checks++;
    if (type === "private")
      assert.equal(
        shopping.farms.find((f) => f.id === farm.id).position.lat,
        43.46,
      );
    Object.assign(
      shopping,
      cartTransition(shopping, { type: "quantity", id: product.id, delta: 2 }),
    );
    writeCloudCart(buyer.id, shopping);
    await persistCloudCommand(
      shopping,
      {
        type: "reserve",
        id: id(offset + 4),
        slotId: id(offset + 2),
        now: new Date().toISOString(),
        paymentPreference: "EUR",
      },
      buyer,
      null,
      buyerApi,
    );
    checks++;
    let sellerData = (await loadCloudData(seller, api)).data;
    const order = sellerData.orders.find((o) => o.id === id(offset + 4));
    assert.equal(order.status, "Pendiente");
    assert.equal(order.lines[0].priceCents, 199);
    assert.equal(order.lines[0].quantity, 2);
    assert.equal(sellerData.products.find((p) => p.id === product.id).stock, 3);
    checks++;
    await persistCloudCommand(
      sellerData,
      { type: "complete", id: order.id },
      seller,
      farm.id,
      api,
    );
    const bought = (await loadCloudData(buyer, buyerApi)).data.orders.find(
      (o) => o.id === order.id,
    );
    assert.equal(bought.status, "Completado");
    assert.equal(bought.lines[0].priceCents, 199);
    checks++;
    await persistCloudCommand(
      sellerData,
      { type: "complete", id: order.id },
      seller,
      farm.id,
      api,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.uzta_sales where order_id=$1",
          [order.id],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select stock_units from public.uzta_products where id=$1",
          [product.id],
        )
      ).rows[0].stock_units,
      3,
    );
    checks++;
    assert.equal(
      (
        await txAs(buyer.id, (tx) =>
          tx.query(
            "select count(*)::int n from public.uzta_notifications where order_id=$1 and kind='completed'",
            [order.id],
          ),
        )
      ).rows[0].n,
      1,
    );
    checks++;
    await assert.rejects(() =>
      persistCloudCommand(
        shopping,
        { type: "cancel", id: order.id },
        buyer,
        null,
        buyerApi,
      ),
    );
    checks++;
    shopping = (await loadCloudData(buyer, buyerApi)).data;
    Object.assign(
      shopping,
      cartTransition(shopping, { type: "quantity", id: product.id, delta: 1 }),
    );
    writeCloudCart(buyer.id, shopping);
    const cancelId = id(offset + 5);
    await persistCloudCommand(
      shopping,
      {
        type: "reserve",
        id: cancelId,
        slotId: id(offset + 2),
        now: new Date().toISOString(),
      },
      buyer,
      null,
      buyerApi,
    );
    const unauthorized = await apiFor(null).rpc("uzta_cancel_order", {
      p_id: cancelId,
    });
    assert.ok(unauthorized.error);
    checks++;
    const stranger = {
      id: id(999),
      email: "other@example.test",
      user_metadata: {},
    };
    if (offset === 100)
      await db.query("insert into auth.users values($1)", [stranger.id]);
    assert.ok(
      (await apiFor(stranger.id).rpc("uzta_cancel_order", { p_id: cancelId }))
        .error,
    );
    checks++;
    await persistCloudCommand(
      shopping,
      { type: "cancel", id: cancelId },
      buyer,
      null,
      buyerApi,
    );
    await persistCloudCommand(
      shopping,
      { type: "cancel", id: cancelId },
      buyer,
      null,
      buyerApi,
    );
    assert.equal(
      (
        await db.query(
          "select stock_units from public.uzta_products where id=$1",
          [product.id],
        )
      ).rows[0].stock_units,
      3,
    );
    const cancelled = (
      await db.query("select * from public.uzta_orders where id=$1", [cancelId])
    ).rows[0];
    assert.equal(cancelled.status, "Cancelado");
    assert.equal(cancelled.cancelled_by, buyer.id);
    assert.ok(cancelled.cancelled_at);
    checks++;
    assert.ok((await api.rpc("uzta_complete_order", { p_id: cancelId })).error);
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.uzta_sales where order_id=$1",
          [cancelId],
        )
      ).rows[0].n,
      0,
    );
    checks++;
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.uzta_notifications where order_id=$1 and kind='cancelled'",
          [cancelId],
        )
      ).rows[0].n,
      2,
    );
    checks++;
  }
  // Edge cases use only this disposable PostgreSQL fixture.
  const sellerId = id(100),
    edgeId = id(800);
  // Look up fixture IDs rather than relying on an application-generated product UUID.
  const edgeProduct = (
    await db.query(
      "select id from public.uzta_products where producer_id=(select id from public.uzta_producers where owner_id=$1)",
      [sellerId],
    )
  ).rows[0].id;
  const edgeSlot = (
    await db.query(
      "select id from public.uzta_pickup_slots where producer_id=(select id from public.uzta_producers where owner_id=$1)",
      [sellerId],
    )
  ).rows[0].id;
  const edgeBuyer = (
    await db.query(
      "select customer_id from public.uzta_orders where producer_id=(select id from public.uzta_producers where owner_id=$1) limit 1",
      [sellerId],
    )
  ).rows[0].customer_id;
  const reserve = await apiFor(edgeBuyer).rpc("uzta_reserve_order_payment", {
    p_id: edgeId,
    p_slot: edgeSlot,
    p_items: [{ product_id: edgeProduct, quantity: 3 }],
    p_message: "",
    p_preference: "EUR",
  });
  assert.equal(reserve.error, null);
  assert.equal(
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [edgeProduct],
      )
    ).rows[0].availability,
    "sold_out",
  );
  checks++;
  await db.query(
    "update public.uzta_orders set pickup_starts_at=now()-interval '2 hours',pickup_ends_at=now()-interval '1 hour' where id=$1",
    [edgeId],
  );
  assert.ok(
    (await apiFor(edgeBuyer).rpc("uzta_cancel_order", { p_id: edgeId })).error,
  );
  checks++;
  assert.equal(
    (await apiFor(sellerId).rpc("uzta_cancel_order", { p_id: edgeId })).error,
    null,
  );
  assert.deepEqual(
    (
      await db.query(
        "select stock_units,availability from public.uzta_products where id=$1",
        [edgeProduct],
      )
    ).rows[0],
    { stock_units: 3, availability: "available" },
  );
  checks++;
  const overflowId = id(801);
  assert.equal(
    (
      await apiFor(edgeBuyer).rpc("uzta_reserve_order_payment", {
        p_id: overflowId,
        p_slot: edgeSlot,
        p_items: [{ product_id: edgeProduct, quantity: 1 }],
        p_message: "",
        p_preference: "EUR",
      })
    ).error,
    null,
  );
  await db.query(
    "update public.uzta_products set stock_units=100000 where id=$1",
    [edgeProduct],
  );
  assert.ok(
    (await apiFor(sellerId).rpc("uzta_cancel_order", { p_id: overflowId }))
      .error,
  );
  assert.equal(
    (
      await db.query("select status from public.uzta_orders where id=$1", [
        overflowId,
      ])
    ).rows[0].status,
    "Pendiente",
  );
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [edgeProduct],
      )
    ).rows[0].stock_units,
    100000,
  );
  checks++;
  console.log(
    `${checks} isolated real-adapter/SQL flow checks passed for professional and private sellers.`,
  );
} finally {
  await vite.close();
  await db.close();
}
