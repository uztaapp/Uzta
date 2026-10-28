import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const a = id(1),
  b = id(2),
  farm = id(10),
  product = id(20);
let checks = 0;
async function user(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    return tx.query(sql, args);
  });
}
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;
create table public.uzta_producers(id uuid primary key);create table public.uzta_products(id uuid primary key);
create table public.uzta_favorites(user_id uuid references auth.users(id),product_id uuid references public.uzta_products(id),primary key(user_id,product_id));
alter table public.uzta_favorites enable row level security;grant select,insert,delete on public.uzta_favorites to authenticated;
create policy own on public.uzta_favorites to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
  await db.exec(
    await readFile(
      "supabase/migrations/20261028173539_seller_favorites.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users values($1),($2)", [a, b]);
  await db.query("insert into public.uzta_producers values($1)", [farm]);
  await db.query("insert into public.uzta_products values($1)", [product]);
  for (const [table, col, target] of [
    ["uzta_favorites", "product_id", product],
    ["uzta_producer_favorites", "producer_id", farm],
  ]) {
    const insert = `insert into public.${table}(user_id,${col}) values($1,$2)`;
    await user(a, insert, [a, target]);
    assert.equal(
      (await user(a, `select * from public.${table}`)).rows.length,
      1,
    );
    checks++;
    assert.equal(
      (await user(b, `select * from public.${table}`)).rows.length,
      0,
    );
    await assert.rejects(() => user(b, insert, [a, target]));
    checks++;
    await user(b, `delete from public.${table}`);
    assert.equal(
      (await user(a, `select * from public.${table}`)).rows.length,
      1,
    );
    await assert.rejects(() => user(a, insert, [a, target]));
    checks++;
    await user(a, `delete from public.${table}`);
    assert.equal(
      (await user(a, `select * from public.${table}`)).rows.length,
      0,
    );
    checks++;
    await user(a, insert, [a, target]);
  }
  await db.query("delete from public.uzta_products where id=$1", [product]);
  await db.query("delete from public.uzta_producers where id=$1", [farm]);
  assert.equal(
    (await user(a, "select * from public.uzta_favorites")).rows.length,
    0,
  );
  assert.equal(
    (await user(a, "select * from public.uzta_producer_favorites")).rows.length,
    0,
  );
  checks++;
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query("select * from public.uzta_producer_favorites");
    }),
  );
  checks++;
  console.log(`${checks} focused favorites database checks passed.`);
} finally {
  await db.close();
}
