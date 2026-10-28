import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seller = id(1),
  buyer = id(2),
  other = id(3),
  farm = id(10),
  slot = id(11),
  fresh = id(20),
  upcoming = id(21);
let checks = 0;
async function user(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, args);
  });
}
const reserve = (order, product, quantity = 1) =>
  user(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,'')", [
    id(order),
    slot,
    JSON.stringify([{ product_id: product, quantity }]),
  ]);
try {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;`,
  );
  await db.exec(
    await readFile("supabase/migrations/20261026171459_uzta_core.sql", "utf8"),
  );
  // Existing zero-stock products migrate without becoming reservable.
  await db.query("insert into auth.users values($1),($2),($3)", [
    seller,
    buyer,
    other,
  ]);
  await user(
    seller,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Farm','Town')",
    [farm, seller],
  );
  await user(
    seller,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Existing',200,'kg','Verduras',0)",
    [id(22), farm],
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261028174001_product_availability.sql",
      "utf8",
    ),
  );
  assert.equal(
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [id(22)],
      )
    ).rows[0].availability,
    "sold_out",
  );
  checks++;
  await user(
    seller,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units,availability) values($1,$2,'Fresh',200,'kg','Verduras',3,'available')",
    [fresh, farm],
  );
  checks++;
  await user(
    seller,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units,availability,expected_available_on) values($1,$2,'Season',300,'kg','Verduras',5,'upcoming','2040-07-15')",
    [upcoming, farm],
  );
  checks++;
  await user(
    seller,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour')",
    [slot, farm],
  );
  await assert.rejects(() => reserve(30, upcoming));
  assert.equal(
    (await db.query("select count(*)::int n from public.uzta_orders")).rows[0]
      .n,
    0,
  );
  checks++;
  await reserve(31, fresh);
  const snapshot = (
    await db.query("select * from public.uzta_order_items where order_id=$1", [
      id(31),
    ])
  ).rows[0];
  checks++;
  await user(
    seller,
    "update public.uzta_products set availability='upcoming',expected_available_on='2040-08-01' where id=$1",
    [fresh],
  );
  await assert.rejects(() => reserve(32, fresh));
  await reserve(31, fresh);
  assert.deepEqual(
    (
      await db.query(
        "select * from public.uzta_order_items where order_id=$1",
        [id(31)],
      )
    ).rows[0],
    snapshot,
  );
  checks++;
  await user(seller, "select public.uzta_complete_order($1)", [id(31)]);
  await user(
    seller,
    "update public.uzta_products set availability='available',expected_available_on=null where id=$1",
    [fresh],
  );
  await reserve(33, fresh, 2);
  assert.equal(
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [fresh],
      )
    ).rows[0].availability,
    "sold_out",
  );
  await assert.rejects(() => reserve(34, fresh));
  checks++;
  await user(
    seller,
    "update public.uzta_products set availability='available',stock_units=0 where id=$1",
    [fresh],
  );
  assert.equal(
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [fresh],
      )
    ).rows[0].availability,
    "sold_out",
  );
  checks++;
  await assert.rejects(() =>
    user(
      seller,
      "update public.uzta_products set availability='invalid' where id=$1",
      [fresh],
    ),
  );
  await assert.rejects(() =>
    user(seller, "update public.uzta_products set stock_units=-1 where id=$1", [
      fresh,
    ]),
  );
  checks++;
  await user(
    other,
    "update public.uzta_products set availability='upcoming' where id=$1",
    [fresh],
  );
  assert.equal(
    (
      await db.query(
        "select availability from public.uzta_products where id=$1",
        [fresh],
      )
    ).rows[0].availability,
    "sold_out",
  );
  checks++;
  assert.equal(
    (
      await db.query("select status from public.uzta_orders where id=$1", [
        id(31),
      ])
    ).rows[0].status,
    "Completado",
  );
  assert.deepEqual(
    (
      await db.query(
        "select * from public.uzta_order_items where order_id=$1",
        [id(31)],
      )
    ).rows[0],
    snapshot,
  );
  checks++;
  console.log(`${checks} focused availability database checks passed.`);
} finally {
  await db.close();
}
