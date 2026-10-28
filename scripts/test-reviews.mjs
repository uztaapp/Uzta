// Disposable PostgreSQL only: no network or real records.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const seller = id(1),
  buyer = id(2),
  other = id(3),
  farm = id(10),
  order = id(20);
let checks = 0;
async function asUser(user, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    return tx.query(sql, args);
  });
}
const submit = (user, o = order, r = 5, c = "Fresh") =>
  asUser(user, "select public.uzta_submit_review($1,$2,$3)", [o, r, c]);
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create schema uzta_private;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,uzta_private to authenticated;grant usage on schema public to anon,service_role;
 create table public.uzta_producers(id uuid primary key,owner_id uuid not null references auth.users(id));
 create table public.uzta_orders(id uuid primary key,customer_id uuid not null references auth.users(id),producer_id uuid not null references public.uzta_producers(id),status text not null);
 `);
  await db.exec(
    await readFile(
      "supabase/migrations/20261028172648_seller_reviews.sql",
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
  await assert.rejects(() => submit(buyer));
  checks++;
  await db.query(
    "insert into public.uzta_orders values($1,$2,$3,'Pendiente')",
    [order, buyer, farm],
  );
  await assert.rejects(() => submit(buyer));
  checks++;
  await db.query("update public.uzta_orders set status='Cancelado'");
  await assert.rejects(() => submit(buyer));
  checks++;
  await db.query("update public.uzta_orders set status='Completado'");
  await assert.rejects(() => submit(other));
  checks++;
  for (const r of [0, 6, null])
    await assert.rejects(() => submit(buyer, order, r));
  await assert.rejects(() => submit(buyer, order, 5, "x".repeat(301)));
  checks++;
  // Stored as plain text; the React renderer escapes it, never innerHTML.
  await submit(buyer, order, 5, "<script>alert(1)</script>");
  checks++;
  await assert.rejects(() => submit(buyer));
  checks++;
  await assert.rejects(() =>
    asUser(other, "update public.uzta_reviews set rating=1"),
  );
  await assert.rejects(() =>
    asUser(buyer, "update public.uzta_reviews set comment_hidden=true"),
  );
  await assert.rejects(() => asUser(buyer, "delete from public.uzta_reviews"));
  checks++;
  assert.equal(
    (await asUser(other, "select * from public.uzta_reviews")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(buyer, "select * from public.uzta_reviews")).rows.length,
    1,
  );
  checks++;
  await db.query(
    "insert into public.uzta_orders values($1,$2,$3,'Completado')",
    [id(21), seller, farm],
  );
  await assert.rejects(() => submit(seller, id(21)));
  checks++;
  await db.query(
    "insert into public.uzta_orders values($1,$2,$3,'Completado')",
    [id(22), other, farm],
  );
  await submit(other, id(22), 3, "");
  let summary = (
    await asUser(buyer, "select * from public.uzta_review_summaries($1)", [
      [farm],
    ])
  ).rows[0];
  assert.equal(Number(summary.average), 4);
  assert.equal(Number(summary.total), 2);
  checks++;
  await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    const rows = (
      await tx.query("select * from public.uzta_review_comments($1)", [farm])
    ).rows;
    assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), [
      "comment",
      "created_at",
      "id",
      "rating",
    ]);
    await assert.rejects(() => tx.query("select * from public.uzta_reviews"));
  });
  checks++;
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    await tx.query("update public.uzta_reviews set comment_hidden=true");
  });
  assert.equal(
    (
      await asUser(buyer, "select * from public.uzta_review_comments($1)", [
        farm,
      ])
    ).rows.length,
    0,
  );
  summary = (
    await asUser(buyer, "select * from public.uzta_review_summaries($1)", [
      [farm],
    ])
  ).rows[0];
  assert.equal(Number(summary.total), 2);
  checks++;
  // More than 10 comments: bounded latest-comments payload, complete aggregate.
  for (let n = 30; n < 41; n++) {
    await db.query(
      "insert into public.uzta_orders values($1,$2,$3,'Completado')",
      [id(n), buyer, farm],
    );
    await submit(buyer, id(n), 4, "Review " + n);
  }
  assert.equal(
    (
      await asUser(buyer, "select * from public.uzta_review_comments($1)", [
        farm,
      ])
    ).rows.length,
    10,
  );
  checks++;
  await assert.rejects(() =>
    db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query("select public.uzta_submit_review($1,5,'')", [order]);
    }),
  );
  checks++;
  console.log(`${checks} focused review database checks passed.`);
} finally {
  await db.close();
}
