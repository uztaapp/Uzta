import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite(),
  id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const legacy = id(1),
  other = id(2),
  admin = id(3),
  buyer = id(4),
  candidate = id(5),
  farm = id(10),
  foreignFarm = id(11),
  newFarm = id(12),
  product = id(20),
  slot = id(30),
  order = id(40);
const migration = "20261029030000_producer_approval.sql";
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
async function denied(fn) {
  await assert.rejects(fn);
  checks++;
}
async function access(uid) {
  return (await as(uid, "select public.uzta_producer_access() value")).rows[0]
    .value;
}
async function request(uid) {
  return (
    await as(
      uid,
      "select public.uzta_request_producer('Huerta','Localidad','Verduras','Solicitud de prueba aislada') id",
    )
  ).rows[0].id;
}
try {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;grant insert,update,delete on storage.objects to authenticated;`);

  for (const f of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && f !== migration)
    .sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  for (const actor of [legacy, other, admin, buyer, candidate])
    await db.query("insert into auth.users values($1)", [actor]);
  await db.query(
    "insert into uzta_private.commission_admins(user_id) values($1)",
    [admin],
  );
  await as(
    legacy,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Tienda existente','Localidad')",
    [farm, legacy],
  );
  await as(
    other,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Otra tienda existente','Localidad')",
    [foreignFarm, other],
  );
  await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
  assert.equal((await access(legacy)).approved, true);
  assert.equal((await access(other)).approved, true);
  checks++;
  assert.deepEqual(await access(buyer), {
    approved: false,
    admin: false,
    status: null,
  });
  checks++;
  assert.deepEqual(await access(admin), {
    approved: false,
    admin: true,
    status: null,
  });
  checks++;
  await denied(() =>
    as(
      buyer,
      "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Intrusión','Localidad')",
      [newFarm, buyer],
    ),
  );
  await denied(() =>
    as(
      buyer,
      "insert into public.uzta_products(producer_id,name,price_cents,unit,category,stock_units) values($1,'Intrusión',200,'kg','Verduras',5)",
      [farm],
    ),
  );
  await denied(() =>
    as(
      buyer,
      "insert into public.uzta_producer_applications(user_id,applicant_name,activity_name,locality,production_type,description,status) values($1,'Yo','Yo','Yo','Yo','Yo','approved')",
      [buyer],
    ),
  );
  await db.exec("alter table auth.users add column raw_user_meta_data jsonb");
  await db.query("update auth.users set raw_user_meta_data=$1 where id=$2", [
    JSON.stringify({
      role: "admin",
      producer: true,
      seller_type: "professional",
    }),
    buyer,
  ]);
  assert.equal((await access(buyer)).approved, false);
  assert.equal((await access(buyer)).admin, false);
  checks++;
  const application = await request(buyer);
  assert.equal((await access(buyer)).status, "pending");
  assert.equal((await access(buyer)).approved, false);
  checks++;
  await denied(() => request(buyer));
  assert.equal(
    (await as(candidate, "select * from public.uzta_producer_applications"))
      .rows.length,
    0,
  );
  checks++;
  await denied(() =>
    as(null, "select * from public.uzta_producer_applications"),
  );
  await denied(() =>
    as(buyer, "select public.uzta_review_producer($1,'approved','')", [
      application,
    ]),
  );
  await denied(() =>
    as(
      buyer,
      "update public.uzta_producer_applications set status='approved' where id=$1",
      [application],
    ),
  );
  await as(
    admin,
    "select public.uzta_review_producer($1,'approved','Revisada')",
    [application],
  );
  assert.deepEqual(await access(buyer), {
    approved: true,
    admin: false,
    status: "approved",
  });
  checks++;
  await as(
    buyer,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,'Nueva tienda aprobada','Localidad')",
    [newFarm, buyer],
  );
  await as(
    buyer,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Producto',250,'kg','Verduras',5)",
    [product, newFarm],
  );
  checks++;
  assert.equal(
    (
      await as(
        other,
        "update public.uzta_products set stock_units=99 where id=$1 returning id",
        [product],
      )
    ).rows.length,
    0,
  );
  checks++;
  await as(
    buyer,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '2 days',now()+interval '3 days')",
    [slot, newFarm],
  );
  await as(
    legacy,
    "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
    [order, slot, JSON.stringify([{ product_id: product, quantity: 1 }])],
  );
  checks++;
  await denied(() =>
    as(other, "select public.uzta_complete_order($1)", [order]),
  );
  const photo = `${buyer}/${newFarm}/${newFarm}/${id(99)}.webp`;
  await as(
    buyer,
    "insert into storage.objects(bucket_id,name) values('uzta-producer-covers',$1)",
    [photo],
  );
  await as(
    buyer,
    "update public.uzta_producers set cover_path=$1 where id=$2",
    [photo, newFarm],
  );
  assert.equal(
    (await as(null, "select * from storage.objects where name=$1", [photo]))
      .rows.length,
    1,
  );
  checks++;
  await as(
    admin,
    "select public.uzta_review_producer($1,'revoked','Revocación de prueba')",
    [application],
  );
  assert.equal((await access(buyer)).approved, false);
  checks++;
  assert.equal(
    (
      await as(
        buyer,
        "update public.uzta_products set stock_units=9 where id=$1 returning id",
        [product],
      )
    ).rows.length,
    0,
  );
  checks++;
  await denied(() =>
    as(
      buyer,
      "insert into storage.objects(bucket_id,name) values('uzta-producer-covers',$1)",
      [`${buyer}/${newFarm}/${newFarm}/${id(98)}.webp`],
    ),
  );
  await denied(() =>
    as(buyer, "select public.uzta_complete_order($1)", [order]),
  );
  await denied(() =>
    as(
      legacy,
      "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
      [id(41), slot, JSON.stringify([{ product_id: product, quantity: 1 }])],
    ),
  );
  assert.equal(
    (
      await as(null, "select * from public.uzta_products where id=$1", [
        product,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (await as(null, "select * from storage.objects where name=$1", [photo]))
      .rows.length,
    0,
  );
  checks++;
  assert.equal(
    (await as(buyer, "select * from public.uzta_orders where id=$1", [order]))
      .rows.length,
    0,
  );
  assert.equal(
    (
      await as(
        legacy,
        "select total_cents from public.uzta_orders where id=$1",
        [order],
      )
    ).rows[0].total_cents,
    250,
  );
  checks++;
  assert.equal(
    (await db.query("select count(*)::int n from public.uzta_producers"))
      .rows[0].n,
    3,
  );
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [product],
      )
    ).rows[0].stock_units,
    4,
  );
  checks++;
  await denied(() => request(buyer));
  const rejected = await request(candidate);
  await as(
    admin,
    "select public.uzta_review_producer($1,'rejected','No procede')",
    [rejected],
  );
  assert.equal((await access(candidate)).approved, false);
  checks++;
  await request(candidate);
  assert.equal(
    (await as(candidate, "select * from public.uzta_producer_applications"))
      .rows.length,
    2,
  );
  checks++;
  await as(
    admin,
    "select public.uzta_review_producer($1,'approved','Reactivación')",
    [application],
  );
  assert.equal((await access(buyer)).approved, true);
  assert.equal((await access(admin)).approved, false);
  checks++;
  console.log(
    `${checks} isolated approval/RLS checks passed. No production migration applied.`,
  );
} finally {
  await db.close();
}
