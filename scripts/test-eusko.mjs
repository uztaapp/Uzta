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
  slot = id(11),
  product = id(20);
let checks = 0;
async function user(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, args);
  });
}
const items = JSON.stringify([{ product_id: product, quantity: 1 }]);
const reserve = (n, pref = "EUR", uid = buyer) =>
  user(uid, "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'',$4)", [
    id(n),
    slot,
    items,
    pref,
  ]);
try {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
  );
  await db.exec(
    await readFile("supabase/migrations/20261026171459_uzta_core.sql", "utf8"),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261028182722_sales_commissions.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users values($1),($2),($3),($4)", [
    seller,
    buyer,
    admin,
    other,
  ]);
  await db.query("insert into uzta_private.commission_admins values($1)", [
    admin,
  ]);
  await user(
    seller,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Farm','Town')",
    [farm, seller],
  );
  await user(
    seller,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Product',2050,'kg','Verduras',10)",
    [product, farm],
  );
  await user(
    seller,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour')",
    [slot, farm],
  );
  await user(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,'')", [
    id(30),
    slot,
    items,
  ]);
  await db.exec(
    await readFile(
      "supabase/migrations/20261028183354_eusko_acceptance.sql",
      "utf8",
    ),
  );
  const initial = (
    await db.query("select * from public.uzta_producers where id=$1", [farm])
  ).rows[0];
  assert.equal(initial.eusko_notes, false);
  assert.equal(initial.eusko_digital, false);
  assert.equal(
    (
      await db.query(
        "select payment_preference from public.uzta_orders where id=$1",
        [id(30)],
      )
    ).rows[0].payment_preference,
    null,
  );
  checks++;
  await assert.rejects(() => reserve(31, "EUSKO"));
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [product],
      )
    ).rows[0].stock_units,
    9,
  );
  checks++;
  await reserve(31);
  assert.equal(
    (
      await db.query(
        "select payment_preference from public.uzta_orders where id=$1",
        [id(31)],
      )
    ).rows[0].payment_preference,
    "EUR",
  );
  checks++;
  await user(
    other,
    "update public.uzta_producers set eusko_notes=true where id=$1",
    [farm],
  );
  assert.equal(
    (
      await db.query(
        "select eusko_notes from public.uzta_producers where id=$1",
        [farm],
      )
    ).rows[0].eusko_notes,
    false,
  );
  checks++;
  await user(
    seller,
    "update public.uzta_producers set eusko_notes=true where id=$1",
    [farm],
  );
  await reserve(32, "EUSKO");
  let order = (
    await db.query("select * from public.uzta_orders where id=$1", [id(32)])
  ).rows[0];
  assert.equal(order.payment_preference, "EUSKO");
  assert.equal(order.eusko_notes_accepted, true);
  assert.equal(Number(order.total_cents), 2050);
  checks++;
  await user(
    seller,
    "update public.uzta_producers set eusko_notes=false,eusko_digital=true where id=$1",
    [farm],
  );
  await reserve(33, "EUSKO");
  order = (
    await db.query("select * from public.uzta_orders where id=$1", [id(33)])
  ).rows[0];
  assert.equal(order.eusko_digital_accepted, true);
  assert.equal(order.eusko_notes_accepted, false);
  checks++;
  await reserve(32, "EUR");
  order = (
    await db.query("select * from public.uzta_orders where id=$1", [id(32)])
  ).rows[0];
  assert.equal(order.payment_preference, "EUSKO");
  assert.equal(order.eusko_notes_accepted, true);
  await assert.rejects(() => reserve(32, "EUR", other));
  checks++;
  await assert.rejects(() => reserve(34, "FAKE"));
  await assert.rejects(() =>
    user(buyer, "update public.uzta_orders set payment_preference='EUSKO'"),
  );
  checks++;
  await assert.rejects(() =>
    user(seller, "select public.uzta_eusko_adoption()"),
  );
  const count = (await user(admin, "select public.uzta_eusko_adoption() data"))
    .rows[0].data;
  assert.deepEqual(count, { total: 1, notes: 0, digital: 1 });
  checks++;
  await user(seller, "select public.uzta_complete_order($1)", [id(32)]);
  const sale = (
    await db.query("select * from public.uzta_sales where order_id=$1", [
      id(32),
    ])
  ).rows[0];
  assert.equal(sale.currency, "EUR");
  assert.equal(Number(sale.gross_cents), 2050);
  assert.equal(sale.declared_at, null);
  checks++;
  console.log(`${checks} focused Eusko database checks passed.`);
} finally {
  await db.close();
}
