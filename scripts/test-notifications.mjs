// Focused notification checks only. Disposable PostgreSQL; no cloud connection.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const seller = "00000000-0000-4000-8000-000000000001",
  buyer = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003",
  farm = "00000000-0000-4000-8000-000000000010",
  order = "00000000-0000-4000-8000-000000000020";
let checks = 0;
const pass = () => checks++;
async function asUser(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, args);
  });
}
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema uzta_private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,uzta_private to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.uzta_producers(id uuid primary key,owner_id uuid references auth.users(id));
 create table public.uzta_orders(id uuid primary key,customer_id uuid references auth.users(id),producer_id uuid references public.uzta_producers(id),status text default 'Pendiente');`);
  await db.exec(
    await readFile(
      "supabase/migrations/20261028100442_reservation_notifications.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users values($1),($2),($3)", [
    seller,
    buyer,
    other,
  ]);
  await db.query("insert into public.uzta_producers values($1,$2)", [
    farm,
    seller,
  ]);
  await db.query(
    "insert into public.uzta_orders(id,customer_id,producer_id) values($1,$2,$3)",
    [order, buyer, farm],
  );
  const ownSeller = (
    await asUser(seller, "select * from public.uzta_notifications")
  ).rows;
  const ownBuyer = (
    await asUser(buyer, "select * from public.uzta_notifications")
  ).rows;
  assert.equal(ownSeller.length, 1);
  assert.equal(ownSeller[0].kind, "new_reservation");
  assert.equal(ownBuyer.length, 1);
  assert.equal(ownBuyer[0].kind, "registered");
  pass();
  assert.equal(
    (await asUser(other, "select * from public.uzta_notifications")).rows
      .length,
    0,
  );
  pass();
  await assert.rejects(() =>
    asUser(other, "select public.uzta_read_notification($1)", [ownBuyer[0].id]),
  );
  pass();
  await asUser(buyer, "select public.uzta_read_notification($1)", [
    ownBuyer[0].id,
  ]);
  const readAt = (
    await asUser(buyer, "select read_at from public.uzta_notifications")
  ).rows[0].read_at;
  await asUser(buyer, "select public.uzta_read_notification($1)", [
    ownBuyer[0].id,
  ]);
  assert.equal(
    String(
      (await asUser(buyer, "select read_at from public.uzta_notifications"))
        .rows[0].read_at,
    ),
    String(readAt),
  );
  assert.equal(
    (
      await asUser(
        buyer,
        "select count(*)::int as n from public.uzta_notifications where read_at is null",
      )
    ).rows[0].n,
    0,
  );
  pass();
  await assert.rejects(() =>
    asUser(
      buyer,
      "insert into public.uzta_notifications(recipient_id,order_id,kind,audience) values($1,$2,'completed','buyer')",
      [buyer, order],
    ),
  );
  await assert.rejects(() =>
    asUser(buyer, "update public.uzta_notifications set recipient_id=$1", [
      other,
    ]),
  );
  pass();
  await db.query(
    "update public.uzta_orders set status='Completado' where id=$1",
    [order],
  );
  await db.query(
    "update public.uzta_orders set status='Completado' where id=$1",
    [order],
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.uzta_notifications"))
      .rows[0].n,
    4,
  );
  pass();
  // Synthetic statuses test future compatibility; production order constraints are not changed.
  await db.query(
    "update public.uzta_orders set status='Confirmada' where id=$1",
    [order],
  );
  await db.query(
    "update public.uzta_orders set status='Preparada' where id=$1",
    [order],
  );
  await db.query(
    "update public.uzta_orders set status='Cancelada' where id=$1",
    [order],
  );
  assert.equal(
    (
      await asUser(
        buyer,
        "select count(*)::int as n from public.uzta_notifications where kind in ('confirmed','prepared','cancelled')",
      )
    ).rows[0].n,
    3,
  );
  pass();
  const before = (
    await db.query("select count(*)::int as n from public.uzta_notifications")
  ).rows[0].n;
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.query(
        "insert into public.uzta_orders(id,customer_id,producer_id) values($1,$2,$3)",
        ["00000000-0000-4000-8000-000000000099", buyer, farm],
      );
      throw Error("rollback");
    }),
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.uzta_notifications"))
      .rows[0].n,
    before,
  );
  pass();
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query("select * from public.uzta_notifications");
    }),
  );
  pass();
  console.log(`${checks} focused notification database checks passed.`);
} finally {
  await db.close();
}
