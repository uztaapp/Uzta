// Disposable PostgreSQL only. No real account, HTTP request or production data.
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const migration = "20261028212455_atomic_reservation_cancellation.sql";
const id = (n) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seller = id(1),
  buyer = id(2),
  stranger = id(3),
  admin = id(4),
  farm = id(10),
  slot = id(11),
  p = id(20),
  q = id(21);
let checks = 0;
function checked(name, actual = true) {
  assert.ok(actual, name);
  checks++;
  console.log("PASS " + name);
}
async function as(actor, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role " + (actor ? "authenticated" : "anon"));
    if (actor)
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        actor,
      ]);
    return tx.query(sql, args);
  });
}
async function denied(name, fn) {
  await assert.rejects(fn);
  checked(name);
}
async function reserve(
  n,
  items = [{ product_id: p, quantity: 1 }],
  preference = "EUR",
) {
  await as(
    buyer,
    "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'',$4)",
    [id(n), slot, JSON.stringify(items), preference],
  );
  return id(n);
}
const cancel = (actor, order) =>
  as(actor, "select public.uzta_cancel_order($1)", [order]);
const complete = (actor, order) =>
  as(actor, "select public.uzta_complete_order($1)", [order]);
const row = async (order) =>
  (await db.query("select * from public.uzta_orders where id=$1", [order]))
    .rows[0];
const stock = async (product) =>
  (
    await db.query("select stock_units from public.uzta_products where id=$1", [
      product,
    ])
  ).rows[0].stock_units;
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;
    grant select on storage.objects to anon,authenticated;grant insert,update,delete on storage.objects to authenticated;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && f !== migration)
    .sort())
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  for (const actor of [seller, buyer, stranger, admin])
    await db.query("insert into auth.users values($1)", [actor]);
  await db.query("insert into uzta_private.commission_admins values($1)", [
    admin,
  ]);
  const application = (
    await as(
      seller,
      "select public.uzta_request_producer('Tienda aislada','Baiona','Verduras','Solo pruebas') id",
    )
  ).rows[0].id;
  await as(admin, "select public.uzta_review_producer($1,'approved','')", [
    application,
  ]);
  await as(
    seller,
    "insert into public.uzta_producers(id,owner_id,name,location,seller_type,eusko_notes,eusko_digital) values($1,$2,'Tienda aislada','Baiona','professional',true,true)",
    [farm, seller],
  );
  await as(
    seller,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '2 days',now()+interval '2 days 1 hour')",
    [slot, farm],
  );
  for (const product of [p, q])
    await as(
      seller,
      "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Aislado',250,'unidad','Verduras',50)",
      [product, farm],
    );
  const oldPending = await reserve(
    30,
    [{ product_id: p, quantity: 2 }],
    "EUSKO",
  );
  const oldCompleted = await reserve(31);
  await complete(seller, oldCompleted);
  const historyBefore = (
    await db.query(
      "select to_jsonb(o) value from public.uzta_orders o order by id",
    )
  ).rows;
  const inventoryBefore = (
    await db.query(
      "select to_jsonb(p) value from public.uzta_products p order by id",
    )
  ).rows;
  const salesBefore = (
    await db.query(
      "select to_jsonb(s) value from public.uzta_sales s order by id",
    )
  ).rows;
  await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(o)-'cancelled_at'-'cancelled_by' value from public.uzta_orders o order by id",
      )
    ).rows,
    historyBefore,
  );
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(p) value from public.uzta_products p order by id",
      )
    ).rows,
    inventoryBefore,
  );
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(s) value from public.uzta_sales s order by id",
      )
    ).rows,
    salesBefore,
  );
  checked(
    "migration preserves existing pending/completed orders, inventory and sales",
  );
  const before = await row(oldPending),
    beforeStock = await stock(p);
  await denied("anonymous cannot call cancellation", () =>
    cancel(null, oldPending),
  );
  await denied("unrelated user cannot cancel", () =>
    cancel(stranger, oldPending),
  );
  await denied("admin membership alone does not grant cancellation", () =>
    cancel(admin, oldPending),
  );
  await denied("unavailable reservation cannot be cancelled", () =>
    cancel(buyer, id(999)),
  );
  await denied("authenticated clients cannot write order state directly", () =>
    as(buyer, "update public.uzta_orders set status='Cancelado' where id=$1", [
      oldPending,
    ]),
  );
  await cancel(buyer, oldPending);
  const cancelled = await row(oldPending);
  checked(
    "authorized buyer cancels pending reservation",
    cancelled.status === "Cancelado",
  );
  checked(
    "stock restored by exact original quantity",
    (await stock(p)) === beforeStock + 2,
  );
  checked(
    "cancellation records buyer and time",
    cancelled.cancelled_by === buyer && !!cancelled.cancelled_at,
  );
  for (const key of [
    "total_cents",
    "payment_preference",
    "eusko_notes_accepted",
    "eusko_digital_accepted",
  ])
    assert.deepEqual(cancelled[key], before[key]);
  checked("Eusko preference and original amounts remain unchanged");
  await cancel(buyer, oldPending);
  await cancel(seller, oldPending);
  assert.deepEqual(await row(oldPending), cancelled);
  checked(
    "retries do not repeat stock or cancellation trace",
    (await stock(p)) === beforeStock + 2,
  );
  for (const actor of [seller, buyer])
    checked(
      "order readable by its party: " + (actor === seller ? "seller" : "buyer"),
      (
        await as(actor, "select status from public.uzta_orders where id=$1", [
          oldPending,
        ])
      ).rows[0].status === "Cancelado",
    );
  checked(
    "unrelated user cannot read cancellation history",
    (
      await as(stranger, "select id from public.uzta_orders where id=$1", [
        oldPending,
      ])
    ).rows.length === 0,
  );
  checked(
    "exactly one cancellation notification for each party",
    (
      await db.query(
        "select count(*)::int n from public.uzta_notifications where order_id=$1 and kind='cancelled'",
        [oldPending],
      )
    ).rows[0].n === 2,
  );
  checked(
    "pending cancellation creates no sale or commission",
    (
      await db.query(
        "select count(*)::int n from public.uzta_sales where order_id=$1",
        [oldPending],
      )
    ).rows[0].n === 0,
  );
  await denied("cancelled order cannot complete", () =>
    complete(seller, oldPending),
  );
  await denied("buyer cannot cancel a completed historical reservation", () =>
    cancel(buyer, oldCompleted),
  );
  await denied("seller cannot cancel a completed historical reservation", () =>
    cancel(seller, oldCompleted),
  );
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(s) value from public.uzta_sales s order by id",
      )
    ).rows,
    salesBefore,
  );
  checked("completed historical sale and commission remain intact");
  const elapsed = await reserve(32);
  await db.query(
    "update public.uzta_orders set pickup_starts_at=now()-interval '2 hours',pickup_ends_at=now()-interval '1 hour' where id=$1",
    [elapsed],
  );
  await denied("buyer cannot cancel once pickup has begun", () =>
    cancel(buyer, elapsed),
  );
  await cancel(seller, elapsed);
  checked(
    "seller can cancel a pending reservation after pickup start",
    (await row(elapsed)).status === "Cancelado",
  );
  const overflow = await reserve(33, [
    { product_id: p, quantity: 1 },
    { product_id: q, quantity: 1 },
  ]);
  const firstStock = await stock(p);
  await db.query(
    "update public.uzta_products set stock_units=100000 where id=$1",
    [q],
  );
  await denied("restock overflow rejects the entire operation", () =>
    cancel(seller, overflow),
  );
  checked(
    "multi-product failure rolls back every earlier stock update",
    (await stock(p)) === firstStock &&
      (await stock(q)) === 100000 &&
      (await row(overflow)).status === "Pendiente",
  );
  await db.query("update public.uzta_products set stock_units=49 where id=$1", [
    q,
  ]);
  await cancel(seller, overflow);
  checked(
    "seller cancellation succeeds after inventory inconsistency is corrected",
    (await row(overflow)).status === "Cancelado",
  );
  const seasonal = await reserve(34);
  await db.query(
    "update public.uzta_products set availability='upcoming',expected_available_on=(current_date+30) where id=$1",
    [p],
  );
  await cancel(buyer, seasonal);
  checked(
    "restocking does not put a seasonal product on sale",
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [p],
      )
    ).rows[0].availability === "upcoming",
  );
  await db.query(
    "update public.uzta_products set availability='available',expected_available_on=null where id=$1",
    [p],
  );
  const withdrawn = await reserve(35);
  await db.query("update public.uzta_products set active=false where id=$1", [
    p,
  ]);
  await cancel(buyer, withdrawn);
  checked(
    "restocking does not republish a withdrawn product",
    (await db.query("select active from public.uzta_products where id=$1", [p]))
      .rows[0].active === false,
  );
  await db.query("update public.uzta_products set active=true where id=$1", [
    p,
  ]);
  const remaining = await stock(p),
    soldout = await reserve(36, [{ product_id: p, quantity: remaining }]);
  checked("reservation exhausts stock", (await stock(p)) === 0);
  await cancel(buyer, soldout);
  checked(
    "restock returns sold-out product to existing available state",
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [p],
      )
    ).rows[0].availability === "available" && (await stock(p)) === remaining,
  );
  const revoked = await reserve(37),
    revStock = await stock(p);
  await as(
    admin,
    "select public.uzta_review_producer($1,'revoked','Isolated test')",
    [application],
  );
  await denied(
    "revoked producer cannot use cancellation to change inventory",
    () => cancel(seller, revoked),
  );
  checked(
    "revoked producer failure leaves order and stock intact",
    (await row(revoked)).status === "Pendiente" &&
      (await stock(p)) === revStock,
  );
  await cancel(buyer, revoked);
  checked(
    "original buyer retains cancellation rights after seller revocation",
    (await row(revoked)).status === "Cancelado",
  );
  await as(admin, "select public.uzta_review_producer($1,'approved','')", [
    application,
  ]);
  const trace = await reserve(38);
  await denied("partial audit trace on pending reservation is rejected", () =>
    db.query("update public.uzta_orders set cancelled_at=now() where id=$1", [
      trace,
    ]),
  );
  const sql = await readFile("supabase/migrations/" + migration, "utf8");
  assert.match(sql, /where id=p_id for update/);
  assert.match(sql, /order by product_id/);
  checked(
    "completion/cancellation lock the order; inventory uses deterministic ordering (static check)",
  );
  await db.exec(
    await readFile(
      "supabase/rollback/disable_reservation_cancellation.sql",
      "utf8",
    ),
  );
  await denied(
    "non-destructive emergency disable blocks cancellation RPC",
    () => cancel(buyer, trace),
  );
  checked(
    "emergency disable keeps cancellation history readable",
    (
      await as(buyer, "select status from public.uzta_orders where id=$1", [
        oldPending,
      ])
    ).rows[0].status === "Cancelado",
  );
  await complete(seller, trace);
  checked(
    "emergency disable leaves collection confirmation available",
    (await row(trace)).status === "Completado",
  );
  console.log(
    `${checks} focused cancellation checks passed. Single-connection PostgreSQL; real multi-session races not executed. Production untouched.`,
  );
} finally {
  await db.close();
}
