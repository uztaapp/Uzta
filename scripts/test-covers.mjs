import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  other = id(2),
  farm = id(10),
  otherFarm = id(11);
const path = `${owner}/${farm}/${farm}/${id(20)}.webp`,
  replacement = `${owner}/${farm}/${farm}/${id(21)}.webp`;
let checks = 0;
async function as(uid, sql, args = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role " + (uid ? "authenticated" : "anon"));
    if (uid)
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
        uid,
      ]);
    return tx.query(sql, args);
  });
}
const objectSql =
  "insert into storage.objects(bucket_id,name) values('uzta-producer-covers',$1)";
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;grant insert,update,delete on storage.objects to authenticated;`);
  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  await db.query("insert into auth.users values($1),($2)", [owner, other]);
  await as(
    owner,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Tienda aislada','Localidad')",
    [farm, owner],
  );
  await as(
    other,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Otra tienda','Localidad')",
    [otherFarm, other],
  );
  await as(owner, objectSql, [path]);
  checks++;
  assert.equal(
    (await as(null, "select * from storage.objects")).rows.length,
    0,
  );
  checks++;
  await as(
    owner,
    "update public.uzta_producers set cover_path=$1 where id=$2",
    [path, farm],
  );
  assert.equal(
    (
      await as(
        null,
        "select cover_path from public.uzta_producers where id=$1",
        [farm],
      )
    ).rows[0].cover_path,
    path,
  );
  checks++;
  assert.equal(
    (await as(null, "select name from storage.objects")).rows[0].name,
    path,
  );
  checks++;
  await assert.rejects(() => as(other, objectSql, [replacement]));
  checks++;
  await assert.rejects(() =>
    as(other, "update public.uzta_producers set cover_path=$1 where id=$2", [
      path,
      otherFarm,
    ]),
  );
  checks++;
  await assert.rejects(() =>
    as(owner, "update public.uzta_producers set cover_path=$1 where id=$2", [
      replacement,
      farm,
    ]),
  );
  assert.equal(
    (
      await as(
        null,
        "select cover_path from public.uzta_producers where id=$1",
        [farm],
      )
    ).rows[0].cover_path,
    path,
  );
  checks++;
  await as(owner, objectSql, [replacement]);
  await as(
    owner,
    "update public.uzta_producers set cover_path=$1 where id=$2",
    [replacement, farm],
  );
  assert.deepEqual(
    (await as(null, "select name from storage.objects")).rows.map(
      (r) => r.name,
    ),
    [replacement],
  );
  checks++;
  await assert.rejects(async () =>
    db.exec(await readFile("supabase/rollback-producer-covers.sql", "utf8")),
  );
  checks++;
  await db.exec("rollback");
  await as(
    owner,
    "update public.uzta_producers set cover_path=null where id=$1",
    [farm],
  );
  assert.equal(
    (await as(null, "select * from storage.objects")).rows.length,
    0,
  );
  checks++;
  assert.equal(
    (await as(owner, "select * from storage.objects")).rows.length,
    2,
  );
  checks++;
  assert.equal(
    (await db.query("select count(*)::int n from public.uzta_orders")).rows[0]
      .n,
    0,
  );
  checks++;
  console.log(
    `${checks} isolated cover/RLS checks passed; no real Supabase changes.`,
  );
} finally {
  await db.close();
}
