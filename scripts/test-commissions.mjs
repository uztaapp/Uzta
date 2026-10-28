import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seller = id(1),
  buyer = id(2),
  admin = id(3),
  other = id(4),
  farm = id(10),
  product = id(20),
  slot = id(11);
let checks = 0;
async function user(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, args);
  });
}
async function reserve(n) {
  await user(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,'')", [
    id(n),
    slot,
    JSON.stringify([{ product_id: product, quantity: 1 }]),
  ]);
}
async function complete(n) {
  await user(seller, "select public.uzta_complete_order($1)", [id(n)]);
  return (
    await user(seller, "select * from public.uzta_sales where order_id=$1", [
      id(n),
    ])
  ).rows[0];
}
const settings = (uid, rate) =>
  user(uid, "select public.uzta_commission_settings($1)", [rate]);
const action = (uid, event, sale, kind, amount, ref = "") =>
  user(uid, "select public.uzta_commission_action($1,$2,$3,$4,$5)", [
    id(event),
    sale,
    kind,
    amount,
    ref,
  ]);
try {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
  );
  await db.exec(
    await readFile("supabase/migrations/20261026171459_uzta_core.sql", "utf8"),
  );
  await db.query("insert into auth.users values($1),($2),($3),($4)", [
    seller,
    buyer,
    admin,
    other,
  ]);
  await user(
    seller,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Farm','Town')",
    [farm, seller],
  );
  await user(
    seller,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Fresh',2000,'kg','Verduras',50)",
    [product, farm],
  );
  await user(
    seller,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour')",
    [slot, farm],
  );
  await reserve(30);
  await user(seller, "select public.uzta_complete_order($1)", [id(30)]);
  await db.exec(
    await readFile(
      "supabase/migrations/20261028182722_sales_commissions.sql",
      "utf8",
    ),
  );
  assert.equal(
    (await db.query("select count(*)::int n from public.uzta_sales")).rows[0].n,
    0,
  );
  await complete(30);
  assert.equal(
    (await db.query("select count(*)::int n from public.uzta_sales")).rows[0].n,
    0,
  );
  checks++;
  await db.query("insert into uzta_private.commission_admins values($1)", [
    admin,
  ]);
  await reserve(31);
  const zero = await complete(31);
  assert.equal(Number(zero.commission_cents), 0);
  assert.equal(Number(zero.seller_net_cents), 2000);
  assert.equal(zero.currency, "EUR");
  assert.equal(zero.declared_at, null);
  checks++;
  await assert.rejects(() => settings(seller, 500));
  await assert.rejects(() => settings(admin, 500));
  checks++;
  await db.exec(
    "update uzta_private.commission_config set commercial_reviewed=true",
  );
  await settings(admin, 500);
  await reserve(32);
  const five = await complete(32);
  assert.equal(Number(five.commission_cents), 100);
  assert.equal(Number(five.seller_net_cents), 1900);
  checks++;
  await settings(admin, 1000);
  await complete(32);
  assert.equal(
    Number(
      (
        await db.query(
          "select commission_cents from public.uzta_sales where id=$1",
          [five.id],
        )
      ).rows[0].commission_cents,
    ),
    100,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.uzta_sales where order_id=$1",
        [id(32)],
      )
    ).rows[0].n,
    1,
  );
  checks++;
  assert.equal(
    (await user(other, "select * from public.uzta_sales")).rows.length,
    0,
  );
  assert.equal(
    (await user(admin, "select * from public.uzta_sales")).rows.length,
    2,
  );
  await assert.rejects(() =>
    user(seller, "update public.uzta_sales set commission_cents=0"),
  );
  await assert.rejects(() =>
    user(seller, "insert into uzta_private.commission_admins values($1)", [
      seller,
    ]),
  );
  checks++;
  await assert.rejects(() => action(seller, 100, five.id, "collect", 100));
  await action(admin, 100, five.id, "collect", 50, "Bank receipt");
  await action(admin, 100, five.id, "collect", 50, "Bank receipt");
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.uzta_commission_events where kind='collect'",
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(() => action(admin, 100, five.id, "collect", 51));
  await assert.rejects(() => action(admin, 101, five.id, "collect", 51));
  checks++;
  await action(admin, 102, five.id, "adjust", 20, "Correction");
  await assert.rejects(() =>
    action(admin, 103, five.id, "adjust", -100, "Invalid"),
  );
  await assert.rejects(() => action(admin, 103, five.id, "adjust", 1, ""));
  checks++;
  await user(seller, "select public.uzta_declare_sale($1)", [five.id]);
  await assert.rejects(() =>
    user(other, "select public.uzta_declare_sale($1)", [five.id]),
  );
  checks++;
  let summary = (
    await user(seller, "select * from public.uzta_commission_summary()")
  ).rows[0];
  assert.equal(Number(summary.calculated_cents), 120);
  assert.equal(Number(summary.pending_cents), 70);
  assert.equal(Number(summary.collected_cents), 50);
  assert.equal(Number(summary.declared_count), 1);
  checks++;
  await action(admin, 104, five.id, "void", 0, "Correction void");
  await assert.rejects(() => action(admin, 105, five.id, "collect", 1));
  summary = (
    await user(seller, "select * from public.uzta_commission_summary()")
  ).rows[0];
  assert.equal(Number(summary.pending_cents), 0);
  assert.equal(Number(summary.collected_cents), 50);
  checks++;
  // Synthetic future cancelled state only in this disposable fixture.
  await db.exec(
    "alter table public.uzta_orders drop constraint uzta_orders_status_check",
  );
  await reserve(33);
  await db.query(
    "update public.uzta_orders set status='Cancelado' where id=$1",
    [id(33)],
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.uzta_sales where order_id=$1",
        [id(33)],
      )
    ).rows[0].n,
    0,
  );
  checks++;
  await reserve(34);
  const cancel = await complete(34);
  await db.query(
    "update public.uzta_orders set status='Cancelado' where id=$1",
    [id(34)],
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.uzta_commission_events where sale_id=$1 and kind='void'",
        [cancel.id],
      )
    ).rows[0].n,
    1,
  );
  checks++;
  await settings(admin, 500);
  await user(
    seller,
    "update public.uzta_products set price_cents=10 where id=$1",
    [product],
  );
  await reserve(35);
  const round = await complete(35);
  assert.equal(Number(round.commission_cents), 1);
  checks++;
  assert.equal(
    (await user(other, "select * from public.uzta_commission_summary()")).rows
      .length,
    0,
  );
  assert.equal(
    (
      await user(
        admin,
        "select * from public.uzta_commission_summary(now()+interval '1 day',null,null)",
      )
    ).rows.length,
    0,
  );
  checks++;
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query("select * from public.uzta_sales");
    }),
  );
  checks++;
  console.log(`${checks} focused commission database checks passed.`);
} finally {
  await db.close();
}
