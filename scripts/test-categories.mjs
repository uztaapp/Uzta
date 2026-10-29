import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
try {
  await db.exec(
    "create table public.uzta_products(id integer primary key, name text not null,category text constraint uzta_products_category_check check(category in ('Verduras','Frutas','Huevos','Lácteos','Miel','Otros'))); insert into public.uzta_products values(1,'Producto existente','Huevos');",
  );
  const before = (
    await db.query(
      "select row_to_json(p) value from public.uzta_products p where id=1",
    )
  ).rows;
  const file = (await readdir("supabase/migrations")).find((f) =>
    f.endsWith("_expand_food_categories.sql"),
  );
  await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  assert.deepEqual(
    (
      await db.query(
        "select row_to_json(p) value from public.uzta_products p where id=1",
      )
    ).rows,
    before,
  );
  const added = [
    "Pan",
    "Carne",
    "Aves",
    "Aceite",
    "Vino",
    "Conservas",
    "Plantas",
    "Flores",
  ];
  for (const [i, c] of added.entries())
    await db.query("insert into public.uzta_products values($1,'Aislado',$2)", [
      i + 2,
      c,
    ]);
  await assert.rejects(
    db.query(
      "insert into public.uzta_products values(99,'No admitido','Inventada')",
    ),
  );
  const rollback = await readFile("supabase/rollback/" + file, "utf8");
  await assert.rejects(db.exec(rollback));
  await db.exec("rollback;");
  assert.equal(
    (await db.query("select count(*) n from public.uzta_products")).rows[0].n,
    9,
  );
  await db.exec("delete from public.uzta_products where id>1;"); // Disposable in-memory fixtures only.
  await db.exec(rollback);
  await assert.rejects(
    db.query("insert into public.uzta_products values(2,'No admitido','Pan')"),
  );
  assert.deepEqual(
    (
      await db.query(
        "select row_to_json(p) value from public.uzta_products p where id=1",
      )
    ).rows,
    before,
  );
  console.log(
    "13 category migration/rollback checks passed. Production untouched.",
  );
} finally {
  await db.close();
}
