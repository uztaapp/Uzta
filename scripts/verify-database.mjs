// Disposable in-memory PostgreSQL only. No connection string, Docker or network.
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
const owner = "00000000-0000-4000-8000-000000000001";
const buyer = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const farm = "00000000-0000-4000-8000-000000000010";
const product = "00000000-0000-4000-8000-000000000020";
const hidden = "00000000-0000-4000-8000-000000000021";
const slot = "00000000-0000-4000-8000-000000000030";
const order = "00000000-0000-4000-8000-000000000040";
async function asUser(user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    return tx.query(sql, params);
  });
}
async function asAnon(sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return tx.query(sql, params);
  });
}
async function denied(action, label) {
  await assert.rejects(action);
  checks++;
  console.log(`PASS ${label}`);
}
function pass(label) {
  checks++;
  console.log(`PASS ${label}`);
}
try {
  // Minimal Supabase auth/role fixture. Only this test process receives these roles.
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  // Storage API metadata fixture; no files, HTTP service or Supabase daemon.
  await db.exec(`create schema storage;
   create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,unique(bucket_id,name));
   alter table storage.objects enable row level security;
   grant usage on schema storage to anon,authenticated;
   grant select on storage.objects to anon,authenticated;
   grant insert,update,delete on storage.objects to authenticated;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  pass("all independent migrations execute on empty PostgreSQL");
  await db.query("insert into auth.users(id) values ($1),($2),($3)", [
    owner,
    buyer,
    stranger,
  ]);
  await asUser(
    owner,
    "insert into public.uzta_profiles(user_id,display_name) values($1,$2)",
    [owner, "Productor local"],
  );
  await asUser(
    owner,
    "insert into public.uzta_producers(id,owner_id,name,location) values($1,$2,$3,$4)",
    [farm, owner, "Tienda de prueba", "Bayona"],
  );
  await asUser(
    owner,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units) values($1,$2,'Tomates',280,'kg','Verduras',3)",
    [product, farm],
  );
  await asUser(
    owner,
    "insert into public.uzta_products(id,producer_id,name,price_cents,unit,category,stock_units,active) values($1,$2,'Oculto',100,'kg','Verduras',1,false)",
    [hidden, farm],
  );
  await asUser(
    owner,
    "insert into public.uzta_pickup_slots(id,producer_id,starts_at,ends_at) values($1,$2,now()+interval '1 day',now()+interval '1 day 1 hour')",
    [slot, farm],
  );
  assert.equal(
    (await asAnon("select * from public.uzta_products")).rows.length,
    1,
  );
  pass("anonymous catalogue hides unpublished products");
  assert.equal(
    (await asUser(stranger, "select * from public.uzta_profiles")).rows.length,
    0,
  );
  pass("profiles are private to their owner");
  const tamper = await asUser(
    buyer,
    "update public.uzta_products set stock_units=100 where id=$1 returning id",
    [product],
  );
  assert.equal(tamper.rows.length, 0);
  pass("buyers cannot modify producer stock");
  assert.equal(
    (
      await asUser(
        buyer,
        "update public.uzta_profiles set user_id=$1 where user_id=$2 returning user_id",
        [buyer, owner],
      )
    ).rows.length,
    0,
  );
  pass("cross-user profile reassignment cannot affect another profile");
  const items = JSON.stringify([{ product_id: product, quantity: 2 }]);
  await asUser(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,$4)", [
    order,
    slot,
    items,
    "Mensaje de prueba",
  ]);
  let stored = (
    await asUser(buyer, "select * from public.uzta_orders where id=$1", [order])
  ).rows[0];
  assert.equal(Number(stored.total_cents), 560);
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [product],
      )
    ).rows[0].stock_units,
    1,
  );
  pass("reservation snapshots server prices and consumes stock atomically");
  await asUser(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,$4)", [
    order,
    slot,
    items,
    "Repetición",
  ]);
  assert.equal(
    (await db.query("select count(*)::int as n from public.uzta_orders"))
      .rows[0].n,
    1,
  );
  pass("repeated request does not double-reserve");
  await denied(
    () =>
      asUser(stranger, "select public.uzta_reserve_order($1,$2,$3::jsonb,$4)", [
        order,
        slot,
        items,
        "",
      ]),
    "another user cannot reuse a reservation identifier",
  );
  await denied(
    () =>
      asUser(
        buyer,
        "select public.uzta_reserve_order(gen_random_uuid(),$1,$2::jsonb,$3)",
        [slot, items, ""],
      ),
    "insufficient stock rejects the entire reservation",
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.uzta_orders"))
      .rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [product],
      )
    ).rows[0].stock_units,
    1,
  );
  pass("failed reservation rolls back order and stock changes");
  const partial = JSON.stringify([
    { product_id: product, quantity: 1 },
    { product_id: hidden, quantity: 1 },
  ]);
  await denied(
    () =>
      asUser(
        buyer,
        "select public.uzta_reserve_order(gen_random_uuid(),$1,$2::jsonb,$3)",
        [slot, partial, ""],
      ),
    "a failing second product rolls back the whole basket",
  );
  assert.equal(
    (
      await db.query(
        "select stock_units from public.uzta_products where id=$1",
        [product],
      )
    ).rows[0].stock_units,
    1,
  );
  pass("earlier inventory writes roll back after later item failure");
  await denied(
    () =>
      asAnon(
        `select public.uzta_reserve_order('${order}','${slot}','[]'::jsonb,'')`,
      ),
    "anonymous reservation RPC execution is denied",
  );
  assert.equal(
    (await asUser(stranger, "select * from public.uzta_orders")).rows.length,
    0,
  );
  assert.equal(
    (await asUser(stranger, "select * from public.uzta_order_items")).rows
      .length,
    0,
  );
  pass("unrelated users cannot read orders or lines");
  await denied(
    () => asAnon("select * from public.uzta_orders"),
    "anonymous order access is denied",
  );
  await denied(
    () =>
      asUser(
        buyer,
        "update public.uzta_orders set status='Completado' where id=$1",
        [order],
      ),
    "direct order status tampering is denied",
  );
  await denied(
    () => asUser(buyer, "select public.uzta_complete_order($1)", [order]),
    "customer cannot mark producer collection",
  );
  await asUser(owner, "select public.uzta_complete_order($1)", [order]);
  stored = (
    await asUser(buyer, "select * from public.uzta_orders where id=$1", [order])
  ).rows[0];
  assert.equal(stored.status, "Completado");
  pass("only the producer can complete collection");
  await asUser(
    owner,
    "update public.uzta_products set price_cents=990 where id=$1",
    [product],
  );
  assert.equal(
    (
      await asUser(
        buyer,
        "select unit_price_cents from public.uzta_order_items where order_id=$1",
        [order],
      )
    ).rows[0].unit_price_cents,
    280,
  );
  pass("price changes preserve past order snapshots");
  const photo1 = `${owner}/${farm}/${product}/${order}.webp`;
  const photo2 = `${owner}/${farm}/${hidden}/${order}.webp`;
  assert.equal(
    (
      await db.query(
        "select public from storage.buckets where id='uzta-product-photos'",
      )
    ).rows[0].public,
    false,
  );
  pass("product photo bucket is private");
  await denied(
    () =>
      asUser(
        buyer,
        "insert into storage.objects(bucket_id,name) values('uzta-product-photos',$1)",
        [photo1],
      ),
    "another account cannot upload under the producer namespace",
  );
  await asUser(
    owner,
    "insert into storage.objects(bucket_id,name) values('uzta-product-photos',$1),('uzta-product-photos',$2)",
    [photo1, photo2],
  );
  assert.equal((await asAnon("select * from storage.objects")).rows.length, 0);
  pass("unlinked uploaded photos remain private");
  await asUser(
    owner,
    "update public.uzta_products set photo_path=$1 where id=$2",
    [photo1, product],
  );
  assert.equal((await asAnon("select * from storage.objects")).rows.length, 1);
  pass("only a published product photo becomes readable for signing");
  await asUser(
    owner,
    "update public.uzta_products set photo_path=$1 where id=$2",
    [photo2, hidden],
  );
  assert.equal((await asAnon("select * from storage.objects")).rows.length, 1);
  assert.equal(
    (await asUser(owner, "select * from storage.objects")).rows.length,
    2,
  );
  pass("hidden product photos remain owner-only");
  await denied(
    () =>
      asUser(
        owner,
        "update public.uzta_products set photo_path=$1 where id=$2",
        [photo2, product],
      ),
    "a photo cannot be attached to a different product",
  );
  await denied(
    () =>
      asUser(
        owner,
        "update public.uzta_products set photo_path=$1 where id=$2",
        [`${owner}/${farm}/${product}/${slot}.webp`, product],
      ),
    "a missing file cannot be attached to a product",
  );
  assert.equal(
    (
      await asUser(
        owner,
        "delete from storage.objects where name=$1 returning id",
        [photo1],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await asUser(
        owner,
        "update storage.objects set name=$1 where name=$2 returning id",
        [`${owner}/${farm}/${product}/${slot}.webp`, photo1],
      )
    ).rows.length,
    0,
  );
  pass(
    "existing photo objects cannot be deleted or overwritten through the app",
  );
  await asUser(
    owner,
    "update public.uzta_products set active=false where id=$1",
    [product],
  );
  assert.equal((await asAnon("select * from storage.objects")).rows.length, 0);
  pass("withdrawing a product prevents new anonymous access to its photo");
  await asUser(
    owner,
    "update public.uzta_producers set public_latitude=43.456789,public_longitude=-1.456789 where id=$1",
    [farm],
  );
  const point = (
    await asAnon(
      "select public_latitude,public_longitude from public.uzta_producers",
    )
  ).rows[0];
  assert.equal(Number(point.public_latitude), 43.456789);
  assert.equal(Number(point.public_longitude), -1.456789);
  pass("public producer coordinates are stored with six decimal places");
  await asUser(
    owner,
    "update public.uzta_producers set seller_type='private' where id=$1",
    [farm],
  );
  const privatePoint = (
    await asAnon(
      "select public_latitude,public_longitude from public.uzta_producers",
    )
  ).rows[0];
  assert.equal(Number(privatePoint.public_latitude), 43.46);
  assert.equal(Number(privatePoint.public_longitude), -1.46);
  await asUser(
    owner,
    "update public.uzta_producers set public_latitude=43.456123,public_longitude=-1.456123 where id=$1",
    [farm],
  );
  assert.equal(
    Number(
      (await asAnon("select public_latitude from public.uzta_producers"))
        .rows[0].public_latitude,
    ),
    43.46,
  );
  pass(
    "private seller conversion and direct coordinate writes never expose precise home points",
  );
  assert.equal(
    (
      await asUser(
        stranger,
        "update public.uzta_producers set seller_type='professional' where id=$1 returning id",
        [farm],
      )
    ).rows.length,
    0,
  );
  pass("another account cannot reclassify a seller");
  await asUser(
    owner,
    "update public.uzta_products set active=true, description='Cosecha del día' where id=$1",
    [product],
  );
  assert.equal(
    (
      await asAnon("select description from public.uzta_products where id=$1", [
        product,
      ])
    ).rows[0].description,
    "Cosecha del día",
  );
  pass("product descriptions use the existing product and ownership policies");
  await asUser(
    owner,
    "update public.uzta_products set stock_units=2 where id=$1",
    [product],
  );
  await asUser(buyer, "select public.uzta_reserve_order($1,$2,$3::jsonb,$4)", [
    "00000000-0000-4000-8000-000000000099",
    slot,
    JSON.stringify([{ product_id: product, quantity: 1 }]),
    "Private seller reservation",
  ]);
  assert.equal(
    Number(
      (
        await db.query(
          "select stock_units from public.uzta_products where id=$1",
          [product],
        )
      ).rows[0].stock_units,
    ),
    1,
  );
  pass("private sellers use the same atomic stock and reservation flow");

  await denied(
    () =>
      asUser(
        owner,
        "update public.uzta_producers set seller_type='admin' where id=$1",
        [farm],
      ),
    "seller type cannot become an administrator role",
  );
  await asUser(
    owner,
    "update public.uzta_producers set seller_type='professional' where id=$1",
    [farm],
  );

  await denied(
    () =>
      asUser(
        owner,
        "update public.uzta_producers set public_latitude=100 where id=$1",
        [farm],
      ),
    "out-of-range producer coordinates are rejected",
  );
  await denied(
    () =>
      asUser(
        owner,
        "update public.uzta_producers set public_latitude=null where id=$1",
        [farm],
      ),
    "half-empty public coordinates are rejected",
  );
  const rls = await db.query(
    "select relname,relrowsecurity from pg_class where relname like 'uzta_%' and relkind='r'",
  );
  assert.equal(rls.rows.length, 9);
  assert.ok(rls.rows.every((r) => r.relrowsecurity));
  pass("RLS enabled on all nine application tables");
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'uzta_%' and p.prosecdef",
      )
    ).rows[0].n,
    0,
  );
  pass(
    "no privileged definer implementation is placed in the exposed public schema",
  );

  const rollback = await readFile(
    new URL(
      "../supabase/rollback/seller_types_and_product_details.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await assert.rejects(() => db.exec(rollback));
  await db.exec("rollback");
  pass("schema rollback refuses to discard populated seller fields");
  await db.exec(
    "update public.uzta_producers set seller_type=null; update public.uzta_products set description='';",
  );
  await db.exec(rollback);
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from information_schema.columns where table_schema='public' and column_name='seller_type'",
      )
    ).rows[0].n,
    0,
  );
  pass("schema rollback succeeds when the added fields are empty");
  console.log(
    `${checks} database checks passed. PostgreSQL memory only; Supabase stack remains untested.`,
  );
} finally {
  await db.close();
}
