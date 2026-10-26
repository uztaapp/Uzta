import { readFileSync, readdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? walk(`${dir}/${x.name}`) : [`${dir}/${x.name}`],
  );
}
const files = [...walk("src"), "vite.config.ts", "index.html", "package.json"];
for (const file of files) {
  const s = readFileSync(file, "utf8");
  assert(
    !/supabase\.co|vercel\.app|lovable\.app|sb_secret_|eyJ[A-Za-z0-9_-]+\./.test(
      s,
    ),
    `Remote reference: ${file}`,
  );
  assert(
    !/fetch\s*\(|XMLHttpRequest|createClient\s*\(/.test(s),
    `Network client: ${file}`,
  );
}
assert(
  !Object.keys(JSON.parse(readFileSync("package.json")).scripts).some((s) =>
    /deploy|push|reset/.test(s),
  ),
);
for (const path of [
  "reference",
  ".vercel",
  ".netlify",
  ".lovable",
  "supabase/.temp/project-ref",
])
  assert(!existsSync(path), `Unexpected project link: ${path}`);
assert(
  /project_id = "uzta-local"/.test(
    readFileSync("supabase/config.toml", "utf8"),
  ),
);
if (existsSync(".git/config"))
  assert(
    !/\[remote /.test(readFileSync(".git/config", "utf8")),
    "Git remote must remain disconnected",
  );
console.log(
  "PASS: independent UZTA source, own local configuration, no cloud links, credentials, network client or deployment scripts.",
);
