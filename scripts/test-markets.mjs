// Isolated SQL/RLS only. Synthetic markets/sellers; no production access.
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
const migration = (await readdir("supabase/migrations")).find((f) =>
  f.endsWith("_markets_and_fairs.sql"),
);
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
const ok = (name, value = true) => {
  assert.ok(value, name);
  checks++;
  console.log("PASS " + name);
};
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
const denied = async (name, fn) => {
  await assert.rejects(fn);
  ok(name);
};
const scalar = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
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

  const oldId = id(40);
  await as(
    buyer,
    "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
    [oldId, slot, JSON.stringify([{ product_id: p, quantity: 1 }])],
  );
  const before = (
    await db.query(
      "select to_jsonb(o) data from public.uzta_orders o order by id",
    )
  ).rows;
  const cancelBefore = await scalar(
    "select pg_get_functiondef('uzta_private.cancel_order(uuid)'::regprocedure)",
  );
  await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
  assert.deepEqual(
    (
      await db.query(
        "select to_jsonb(o)-'pickup_slot_id'-'pickup_market' data from public.uzta_orders o order by id",
      )
    ).rows,
    before,
  );
  ok("migration preserves historical reservations");
  assert.equal(
    await scalar(
      "select pg_get_functiondef('uzta_private.cancel_order(uuid)'::regprocedure)",
    ),
    cancelBefore,
  );
  ok("cancellation implementation unchanged byte for byte");
  const date = await scalar("select to_char(current_date+2,'YYYY-MM-DD')");
  const end = await scalar("select to_char(current_date+4,'YYYY-MM-DD')");
  const data = {
    name: "Marché fictif SQL",
    kind: "producers",
    locality: "Isolé",
    address: "Adresse de test",
    region: "Iparralde",
    timezone: "Europe/Paris",
    source_url: "https://example.invalid/test",
    source_key: "test-1",
    source_license: "Isolated fixture only",
    status: "published",
    latitude: 43.49,
    longitude: -1.47,
    categories: ["Verduras"],
  };
  const rules = [
    {
      frequency: "once",
      starts_on: date,
      ends_on: end,
      weekdays: [],
      ordinal: null,
      opens: "08:00",
      closes: "13:00",
    },
  ];
  const save = (actor, mid, values, r) =>
    as(actor, "select public.uzta_save_market($1,$2::jsonb,$3::jsonb) id", [
      mid,
      JSON.stringify(values),
      JSON.stringify(r),
    ]);
  await denied("unapproved users cannot propose markets", () =>
    save(stranger, null, data, rules),
  );
  await denied("invalid source URL cannot poison the public schema", () =>
    save(seller, null, { ...data, source_url: "https://" }, rules),
  );
  await denied("out-of-contract calendar date rejected on server", () =>
    save(admin, null, { ...data, source_key: "invalid-date" }, [
      { ...rules[0], starts_on: "10000-01-01", ends_on: null },
    ]),
  );
  await denied("unsupported second precision rejected on server", () =>
    save(admin, null, { ...data, source_key: "invalid-clock" }, [
      { ...rules[0], opens: "09:00:30" },
    ]),
  );
  const proposed = (await save(seller, null, data, rules)).rows[0].id;
  assert.equal(
    await scalar("select status from public.uzta_markets where id=$1", [
      proposed,
    ]),
    "pending",
  );
  ok("producer proposal cannot self-publish even with forged verified status");
  assert.equal(
    (await as(null, "select id,name from public.uzta_markets")).rows.length,
    0,
  );
  ok("pending proposals invisible to visitors");
  await as(
    seller,
    "update public.uzta_markets set status='published',verified_at=now() where id=$1",
    [proposed],
  );
  assert.equal(
    await scalar("select status from public.uzta_markets where id=$1", [
      proposed,
    ]),
    "pending",
  );
  ok("direct producer update cannot approve market");
  await save(admin, proposed, data, rules);
  assert.equal(
    (await as(null, "select id,name from public.uzta_markets")).rows.length,
    1,
  );
  ok("verified market visible without UZTA participants");
  await denied("no unnecessary creator identity in public API", () =>
    as(null, "select created_by from public.uzta_markets"),
  );
  await denied("origin identifier prevents duplicate markets", () =>
    save(admin, null, data, rules),
  );
  await denied(
    "normalized name/locality prevents duplicate from another origin",
    () => save(admin, null, { ...data, source_key: "test-2" }, rules),
  );
  const partRules = [{ ...rules[0], opens: "09:00", closes: "12:00" }];
  const participate = (actor, producer, active = true, cutoff = 60) =>
    as(
      actor,
      "select public.uzta_save_market_participation($1,$2,$3,true,$4,'artisan',$5::jsonb) id",
      [proposed, producer, active, cutoff, JSON.stringify(partRules)],
    );
  await denied("seller cannot manage another store participation", () =>
    participate(buyer, farm),
  );
  const part = (await participate(seller, farm)).rows[0].id;
  const request2 = (
    await as(
      stranger,
      "select public.uzta_request_producer('Other isolated','Baiona','Verduras','Test') id",
    )
  ).rows[0].id;
  await as(admin, "select public.uzta_review_producer($1,'approved','')", [
    request2,
  ]);
  const farm2 = id(12);
  await as(
    stranger,
    "insert into public.uzta_producers(id,owner_id,name,location,seller_type) values($1,$2,'Other SQL','Baiona','professional')",
    [farm2, stranger],
  );
  await participate(stranger, farm2);
  assert.equal(
    (await as(null, "select id from public.uzta_market_participations")).rows
      .length,
    2,
  );
  ok("multiple independent sellers coexist at one market");
  await as(
    stranger,
    "update public.uzta_market_participations set active=false where id=$1",
    [part],
  );
  assert.equal(
    await scalar(
      "select active from public.uzta_market_participations where id=$1",
      [part],
    ),
    true,
  );
  ok("RLS blocks another seller's changes");
  await denied("participation ownership is immutable", () =>
    as(
      seller,
      "update public.uzta_market_participations set producer_id=$1 where id=$2",
      [farm2, part],
    ),
  );
  const prepare = () =>
    as(buyer, "select public.uzta_prepare_market_pickup($1,$2) id", [
      part,
      date,
    ]);
  const linked = (await prepare()).rows[0].id;
  assert.equal((await prepare()).rows[0].id, linked);
  ok("concrete pickup slot generated once on demand");
  const times = (
    await db.query(
      "select starts_at,ends_at from public.uzta_pickup_slots where id=$1",
      [linked],
    )
  ).rows[0];
  ok(
    "market and seller presence intersect",
    new Date(times.ends_at) - new Date(times.starts_at) === 3 * 3600000,
  );
  await denied("linked pickup slots cannot be forged by seller", () =>
    as(
      seller,
      "update public.uzta_pickup_slots set market_date=current_date where id=$1",
      [linked],
    ),
  );
  const order = id(41),
    stockBefore = await scalar(
      "select stock_units from public.uzta_products where id=$1",
      [p],
    );
  const reserve = () =>
    as(
      buyer,
      "select public.uzta_reserve_market_order($1,$2,$3::jsonb,'market','EUR')",
      [order, linked, JSON.stringify([{ product_id: p, quantity: 2 }])],
    );
  await denied(
    "legacy client cannot silently book a market as a farm pickup",
    () =>
      as(
        buyer,
        "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
        [id(70), linked, JSON.stringify([{ product_id: p, quantity: 1 }])],
      ),
  );
  await reserve();
  await reserve();
  assert.equal(
    await scalar("select stock_units from public.uzta_products where id=$1", [
      p,
    ]),
    stockBefore - 2,
  );
  ok("existing reservation endpoint remains atomic and idempotent");
  assert.equal(
    await scalar(
      "select pickup_market->>'name' from public.uzta_orders where id=$1",
      [order],
    ),
    data.name,
  );
  ok("reservation records market place and schedule");
  await participate(seller, farm, false);
  assert.equal(
    await scalar("select status from public.uzta_orders where id=$1", [order]),
    "Pendiente",
  );
  ok("withdrawal never cancels an existing order automatically");
  await denied(
    "inactive participation blocks a newly requested pickup",
    prepare,
  );
  await denied(
    "old endpoint cannot bypass withdrawn participation using cached slot",
    () =>
      as(
        buyer,
        "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
        [id(42), linked, JSON.stringify([{ product_id: p, quantity: 1 }])],
      ),
  );
  await as(buyer, "select public.uzta_cancel_order($1)", [order]);
  await as(buyer, "select public.uzta_cancel_order($1)", [order]);
  assert.equal(
    await scalar("select stock_units from public.uzta_products where id=$1", [
      p,
    ]),
    stockBefore,
  );
  ok(
    "existing cancellation returns stock exactly once after market withdrawal",
  );
  await participate(seller, farm, true, 10080);
  await denied("configurable cutoff enforced on server", prepare);
  await participate(seller, farm, true, 60);
  await as(
    admin,
    "select public.uzta_save_market_exception($1,null,$2,true,null,null)",
    [proposed, date],
  );
  await denied("cancelled occurrence blocks pickup", prepare);
  await as(
    admin,
    "select public.uzta_save_market_exception($1,null,$2,false,'10:00','11:00')",
    [proposed, date],
  );
  const changed = (await prepare()).rows[0].id;
  ok(
    "changed hours produce only the current valid concrete slot",
    changed !== linked,
  );
  await denied(
    "stale slot with outdated hours rejected at final checkout",
    () =>
      as(
        buyer,
        "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
        [id(43), linked, JSON.stringify([{ product_id: p, quantity: 1 }])],
      ),
  );
  await as(
    seller,
    "select public.uzta_save_market_exception($1,$2,$3,true,null,null)",
    [proposed, part, date],
  );
  await denied("seller's individual day off blocks collection", prepare);
  const monthly = {
    ...rules[0],
    frequency: "monthly",
    starts_on: "2026-01-01",
    ends_on: null,
    weekdays: [0],
    ordinal: 1,
  };
  await save(admin, proposed, data, [monthly]);
  assert.equal(
    Number(
      await scalar(
        "select count(*) from uzta_private.market_day($1,null,'2026-10-04')",
        [proposed],
      ),
    ),
    1,
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) from uzta_private.market_day($1,null,'2026-10-11')",
        [proposed],
      ),
    ),
    0,
  );
  ok("monthly first weekday matches SQL calendar");
  await save(admin, proposed, data, [{ ...monthly, ordinal: -1 }]);
  assert.equal(
    Number(
      await scalar(
        "select count(*) from uzta_private.market_day($1,null,'2026-10-25')",
        [proposed],
      ),
    ),
    1,
  );
  ok("monthly last weekday supported");
  assert.equal(
    await scalar(
      "select uzta_private.valid_market_clock('2026-03-29','02:30','Europe/Paris')",
    ),
    false,
  );
  assert.equal(
    await scalar(
      "select uzta_private.valid_market_clock('2026-10-25','02:30','Europe/Madrid')",
    ),
    false,
  );
  ok("nonexistent and ambiguous DST clocks cannot be booked");
  assert.equal(
    await scalar(
      "select uzta_private.valid_market_clock('2026-07-04','09:00','Europe/Paris')",
    ),
    true,
  );
  ok("ordinary local clocks remain available");
  await as(seller, "select public.uzta_complete_order($1)", [oldId]);
  ok(
    "ordinary collection remains functional",
    (await scalar("select status from public.uzta_orders where id=$1", [
      oldId,
    ])) === "Completado",
  );
  await denied("completed reservation still cannot be cancelled", () =>
    as(buyer, "select public.uzta_cancel_order($1)", [oldId]),
  );
  const catalogue = JSON.parse(
    await readFile("src/data/markets-initial.json", "utf8"),
  );
  const verified = catalogue.filter(
    (entry) => entry.review_status === "verified",
  );
  const countBeforeImport = await scalar(
    "select count(*)::int from public.uzta_markets",
  );
  for (const entry of verified) {
    await as(
      admin,
      "select public.uzta_save_market(null,$1::jsonb,$2::jsonb)",
      [JSON.stringify(entry.data), JSON.stringify(entry.rules)],
    );
  }
  assert.equal(
    await scalar("select count(*)::int from public.uzta_markets"),
    countBeforeImport + verified.length,
  );
  assert.equal(
    await scalar(
      "select count(*)::int from public.uzta_markets where source_key like 'iparralde/%' and status<>'pending'",
    ),
    0,
  );
  ok(
    "entire verified research catalogue imports through existing RPC as proposals only",
  );
  await denied("catalogue source keys cannot be imported twice", () =>
    as(admin, "select public.uzta_save_market(null,$1::jsonb,$2::jsonb)", [
      JSON.stringify(verified[0].data),
      JSON.stringify(verified[0].rules),
    ]),
  );
  console.log(
    `${checks} isolated market SQL/security/reservation checks passed. Production untouched.`,
  );
} finally {
  await db.close();
}
