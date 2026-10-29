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
  const pidA = (await a.query("select pg_backend_pid() pid")).rows[0].pid;
  const pidB = (await b.query("select pg_backend_pid() pid")).rows[0].pid;
  checked("independent PostgreSQL backend sessions", pidA !== pidB);
  let n = 100;
  for (const [first, second, expected] of [
    ["cancel", "cancel", "Cancelado"],
    ["cancel", "complete", "Cancelado"],
    ["complete", "cancel", "Completado"],
  ]) {
    for (let iteration = 0; iteration < 4; iteration++) {
      await main.query(
        "update public.uzta_products set stock_units=50 where id=$1",
        [p],
      );
      const order = await reserve(n++),
        before = await stock();
      const notificationBefore = Number(
        (
          await main.query(
            "select count(*) n from public.uzta_notifications where order_id=$1",
            [order],
          )
        ).rows[0].n,
      );
      await begin(a, first === "cancel" ? buyer : seller);
      await a.query(
        `select public.uzta_${first === "cancel" ? "cancel" : "complete"}_order($1)`,
        [order],
      );
      await begin(b, second === "cancel" ? buyer : seller);
      let settled = false;
      const pending = b
        .query(
          `select public.uzta_${second === "cancel" ? "cancel" : "complete"}_order($1)`,
          [order],
        )
        .then(
          () => ({ ok: true }),
          (e) => ({ ok: false, error: e.message, code: e.code }),
        )
        .finally(() => {
          settled = true;
        });
      await blocked(pidB);
      assert.equal(settled, false);
      await a.query("commit");
      const result = await pending;
      await b.query(result.ok ? "commit" : "rollback");
      const final = (
        await main.query(
          "select status,cancelled_at,cancelled_by from public.uzta_orders where id=$1",
          [order],
        )
      ).rows[0];
      assert.equal(final.status, expected);
      assert.equal(await stock(), before + (expected === "Cancelado" ? 2 : 0));
      if (first === second) assert.equal(result.ok, true);
      else {
        assert.equal(result.ok, false);
        assert.match(result.error, /cancelled|completed/i);
      }
      const sales = Number(
        (
          await main.query(
            "select count(*) n from public.uzta_sales where order_id=$1",
            [order],
          )
        ).rows[0].n,
      );
      assert.equal(sales, expected === "Completado" ? 1 : 0);
      const notices = Number(
        (
          await main.query(
            "select count(*) n from public.uzta_notifications where order_id=$1",
            [order],
          )
        ).rows[0].n,
      );
      assert.equal(notices, notificationBefore + 2);
      assert.equal(!!final.cancelled_at, expected === "Cancelado");
      checked(
        `real overlap ${first} vs ${second} #${iteration + 1}: one transition, exact stock, no duplicate notices/sales`,
      );
    }
  }
  // A fresh reservation competes with restitution of the same product.
  await main.query(
    "update public.uzta_products set stock_units=2 where id=$1",
    [p],
  );
  const old = await reserve(n++);
  assert.equal(await stock(), 0);
  await begin(a, buyer);
  await a.query("select public.uzta_cancel_order($1)", [old]);
  await begin(b, buyer);
  const newOrder = id(n++);
  const pending = b
    .query(
      "select public.uzta_reserve_order_payment($1,$2,$3::jsonb,'','EUR')",
      [newOrder, slot, JSON.stringify([{ product_id: p, quantity: 1 }])],
    )
    .then(
      () => ({ ok: true }),
      (e) => ({ ok: false, error: e.message }),
    );
  await blocked(pidB);
  await a.query("commit");
  const reserved = await pending;
  assert.equal(reserved.ok, true);
  await b.query("commit");
  assert.equal(await stock(), 1);
  checked(
    "cancellation vs new reservation serializes exact inventory without deadlock",
  );
  // Migration re-entry must be rejected with no partial changes.
  const before = await main.query(
    "select to_jsonb(o) data from public.uzta_orders o order by id",
  );
  await main.query("begin");
  let duplicateRejected = false;
  try {
    await main.query(
      await readFile("supabase/migrations/" + migration, "utf8"),
    );
  } catch {
    duplicateRejected = true;
  } finally {
    await main.query("rollback");
  }
  assert.ok(duplicateRejected);
  assert.deepEqual(
    (
      await main.query(
        "select to_jsonb(o) data from public.uzta_orders o order by id",
      )
    ).rows,
    before.rows,
  );
  checked(
    "duplicate application is rejected atomically with original history intact",
  );
  console.log(
    `${checks} genuine multi-session checks passed; no production connection or real records used.`,
  );
} finally {
  for (const c of connections.reverse()) await c.end().catch(() => {});
  await cluster.stop().catch(() => {});
}
