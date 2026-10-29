// Genuine multi-session PostgreSQL tests. Only a new loopback cluster with synthetic data.
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const runtime = process.env.UZTA_POSTGRES_TEST_RUNTIME;
assert.ok(
  runtime,
  "Set UZTA_POSTGRES_TEST_RUNTIME to an isolated runtime with embedded-postgres installed",
);
const { default: pg } = await import(
  pathToFileURL(resolve(runtime, "node_modules/pg/lib/index.js"))
);
const { execFileSync } = await import("node:child_process");
const { mkdir, writeFile, unlink } = await import("node:fs/promises");
const native = resolve(
  runtime,
  "node_modules/@embedded-postgres/windows-x64/native/bin",
);
const dataDir = resolve(runtime, "data-" + Date.now());
const password = randomBytes(24).toString("hex");
const pgctl = join(native, "pg_ctl.exe");
let started = false;
const cluster = {
  async initialise() {
    const pw = join(runtime, "temporary-test-password");
    await writeFile(pw, password + "\n");
    try {
      execFileSync(
        join(native, "initdb.exe"),
        [
          "-D",
          dataDir,
          "--auth=scram-sha-256",
          "--username=postgres",
          "--pwfile=" + pw,
          "--locale=C",
          "--encoding=UTF8",
        ],
        { windowsHide: true, stdio: "ignore" },
      );
    } finally {
      await unlink(pw);
    }
  },
  async start() {
    execFileSync(
      pgctl,
      [
        "-D",
        dataDir,
        "-l",
        join(dataDir, "server.log"),
        "-o",
        "-h 127.0.0.1 -p 54339",
        "-w",
        "start",
      ],
      { windowsHide: true, stdio: "ignore" },
    );
    started = true;
  },
  getPgClient() {
    return new pg.Client({
      host: "127.0.0.1",
      port: 54339,
      user: "postgres",
      password,
      database: "postgres",
    });
  },
  async stop() {
    if (started)
      execFileSync(pgctl, ["-D", dataDir, "-m", "fast", "-w", "stop"], {
        windowsHide: true,
        stdio: "ignore",
      });
  },
};
let main;
const connections = [];
async function connect() {
  const c = cluster.getPgClient("postgres", "127.0.0.1");
  await c.connect();
  connections.push(c);
  return c;
}
const db = {
  exec: (sql) => main.query(sql),
  query: (...args) => main.query(...args),
  transaction: async (fn) => {
    await main.query("begin");
    try {
      const r = await fn({
        exec: (s) => main.query(s),
        query: (...a) => main.query(...a),
      });
      await main.query("commit");
      return r;
    } catch (e) {
      await main.query("rollback");
      throw e;
    }
  },
};
const migration = "20261028212455_atomic_reservation_cancellation.sql";
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
function checked(name, actual = true) {
  assert.ok(actual, name);
  checks++;
  console.log("PASS " + name);
}
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
async function reserve(n, quantity = 2) {
  await as(
    buyer,
    "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
    [id(n), slot, JSON.stringify([{ product_id: p, quantity }])],
  );
  return id(n);
}
const stock = async () =>
  Number(
    (
      await main.query(
        "select stock_units from public.uzta_products where id=$1",
        [p],
      )
    ).rows[0].stock_units,
  );
async function begin(c, actor) {
  await c.query("begin");
  await c.query(
    "set local statement_timeout='8s';set local lock_timeout='5s';set local role authenticated",
  );
  await c.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]);
}
async function blocked(pid) {
  const until = Date.now() + 3500;
  while (Date.now() < until) {
    const r = await main.query(
      "select wait_event_type from pg_stat_activity where pid=$1",
      [pid],
    );
    if (r.rows[0]?.wait_event_type === "Lock") return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("Second real session never blocked on the first transaction");
}
try {
  await cluster.initialise();
  await cluster.start();
  main = await connect();
  console.log(
    "PostgreSQL " +
      (await main.query("show server_version")).rows[0].server_version +
      "; separate loopback sessions",
  );
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

  await main.query(await readFile("supabase/migrations/" + migration, "utf8"));
  const a = await connect(),
    b = await connect();
  const pidB = (await b.query("select pg_backend_pid() pid")).rows[0].pid;
  const date = (
    await main.query("select to_char(current_date+2,'YYYY-MM-DD') d")
  ).rows[0].d;
  const rules = [
    {
      frequency: "once",
      starts_on: date,
      ends_on: date,
      weekdays: [],
      ordinal: null,
      opens: "09:00",
      closes: "13:00",
    },
  ];
  const values = {
    name: "Isolated concurrent market",
    kind: "producers",
    locality: "Fixture",
    address: "Synthetic address",
    region: "Iparralde",
    source_url: "https://example.invalid",
    source_license: "test",
    status: "published",
    timezone: "Europe/Paris",
    categories: [],
  };
  const market = (
    await as(
      admin,
      "select public.uzta_save_market(null,$1::jsonb,$2::jsonb) id",
      [JSON.stringify(values), JSON.stringify(rules)],
    )
  ).rows[0].id;
  const partArgs = [market, farm, true, JSON.stringify(rules)];
  const part = (
    await as(
      seller,
      "select public.uzta_save_market_participation($1,$2,$3,true,60,'farm',$4::jsonb) id",
      partArgs,
    )
  ).rows[0].id;
  await begin(a, buyer);
  const first = (
    await a.query("select public.uzta_prepare_market_pickup($1,$2) id", [
      part,
      date,
    ])
  ).rows[0].id;
  await begin(b, buyer);
  const second = b.query("select public.uzta_prepare_market_pickup($1,$2) id", [
    part,
    date,
  ]);
  await blocked(pidB);
  await a.query("commit");
  assert.equal((await second).rows[0].id, first);
  await b.query("commit");
  assert.equal(
    Number(
      (
        await main.query(
          "select count(*) n from public.uzta_pickup_slots where market_participation_id=$1",
          [part],
        )
      ).rows[0].n,
    ),
    1,
  );
  checked(
    "two genuine simultaneous preparations create exactly one concrete pickup slot",
  );
  const reserveSql =
    "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'market race','EUR')";
  const args = (n) => [
    id(n),
    first,
    JSON.stringify([{ product_id: p, quantity: 2 }]),
  ];
  const before = await stock();
  // Preparation of an existing slot must not update/lock it against checkout's shared lock.
  await begin(a, buyer);
  await a.query("select public.uzta_prepare_market_pickup($1,$2)", [
    part,
    date,
  ]);
  await begin(b, buyer);
  await b.query(reserveSql, args(200));
  await b.query("commit");
  await a.query("commit");
  assert.equal(await stock(), before - 2);
  checked(
    "existing preparation and reservation overlap without lock inversion",
  );
  // Withdrawal waits for a valid checkout rather than corrupting it.
  await begin(a, buyer);
  await a.query(reserveSql, args(201));
  await begin(b, seller);
  const withdrawn = b.query(
    "select public.uzta_save_market_participation($1,$2,false,true,60,'farm',$3::jsonb)",
    [market, farm, JSON.stringify(rules)],
  );
  await blocked(pidB);
  await a.query("commit");
  await withdrawn;
  await b.query("commit");
  assert.equal(await stock(), before - 4);
  assert.equal(
    (
      await main.query("select status from public.uzta_orders where id=$1", [
        id(201),
      ])
    ).rows[0].status,
    "Pendiente",
  );
  checked(
    "checkout vs seller withdrawal serializes and preserves an existing reservation",
  );
  await assert.rejects(
    as(buyer, "select public.uzta_prepare_market_pickup($1,$2)", [part, date]),
  );
  checked("withdrawn attendance prevents the next pickup");
  await as(buyer, "select public.uzta_cancel_order($1)", [id(201)]);
  assert.equal(await stock(), before - 2);
  checked(
    "the unchanged cancellation RPC restores exactly the market order quantity",
  );
  await as(
    seller,
    "select public.uzta_save_market_participation($1,$2,true,true,60,'farm',$3::jsonb)",
    [market, farm, JSON.stringify(rules)],
  );
  await begin(a, admin);
  await a.query(
    "select public.uzta_save_market_exception($1,null,$2,true,null,null)",
    [market, date],
  );
  await begin(b, buyer);
  const unavailable = b.query(reserveSql, args(202)).then(
    () => ({ ok: true }),
    (e) => ({ ok: false, error: e.message }),
  );
  await blocked(pidB);
  await a.query("commit");
  const result = await unavailable;
  assert.equal(result.ok, false);
  assert.match(result.error, /Market pickup/);
  await b.query("rollback");
  assert.equal(await stock(), before - 2);
  checked(
    "market cancellation vs checkout yields controlled rejection and unchanged stock",
  );
  await as(
    admin,
    "select public.uzta_save_market_exception($1,null,$2,false,null,null)",
    [market, date],
  );
  const request = (
    await as(
      stranger,
      "select public.uzta_request_producer('Concurrent second','Fixture','Verduras','test') id",
    )
  ).rows[0].id;
  await as(admin, "select public.uzta_review_producer($1,'approved','')", [
    request,
  ]);
  const farm2 = id(12);
  await as(
    stranger,
    "insert into public.uzta_producers(id,owner_id,name,location,seller_type) values($1,$2,'Second fixture','Fixture','professional')",
    [farm2, stranger],
  );
  await begin(a, seller);
  await a.query(
    "select public.uzta_save_market_participation($1,$2,true,true,60,'farm',$3::jsonb)",
    [market, farm, JSON.stringify(rules)],
  );
  await begin(b, stranger);
  const joined = b.query(
    "select public.uzta_save_market_participation($1,$2,true,true,60,'artisan',$3::jsonb)",
    [market, farm2, JSON.stringify(rules)],
  );
  await blocked(pidB);
  await a.query("commit");
  await joined;
  await b.query("commit");
  assert.equal(
    Number(
      (
        await main.query(
          "select count(*) n from public.uzta_market_participations where market_id=$1 and active",
          [market],
        )
      ).rows[0].n,
    ),
    2,
  );
  checked(
    "two genuine seller sessions save independent attendance at the same market",
  );
  await main.query(
    await readFile("supabase/rollback/disable_markets.sql", "utf8"),
  );
  await assert.rejects(
    as(buyer, "select public.uzta_prepare_market_pickup($1,$2)", [part, date]),
  );
  await assert.rejects(as(buyer, reserveSql, args(203)));
  checked("recovery disables both preparation and cached-slot checkout");
  await as(buyer, "select public.uzta_cancel_order($1)", [id(200)]);
  assert.equal(await stock(), before);
  checked("recovery preserves ordinary cancellation and exact inventory");
  console.log(
    `${checks} genuine multi-session market checks passed. No production connections or personal data.`,
  );
} finally {
  for (const c of connections.reverse()) await c.end().catch(() => {});
  await cluster.stop().catch(() => {});
}
