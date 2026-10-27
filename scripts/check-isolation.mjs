import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
    x.isDirectory() ? walk(`${dir}/${x.name}`) : [`${dir}/${x.name}`],
  );
}
const files = [...walk("src"), "vite.config.ts", "index.html", "package.json"];
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const s = raw
    .replaceAll("abgysktjctrxfkcejjwu.supabase.co", "AUTHORIZED_UZTA")
    .replaceAll("uzta-nu.vercel.app", "AUTHORIZED_UZTA")
    .replaceAll("${UZTA_PROJECT}.supabase.co", "AUTHORIZED_UZTA");
  assert(
    !/supabase\.co|vercel\.app|lovable\.app|sb_secret_|eyJ[A-Za-z0-9_-]+\./.test(
      s,
    ),
    `Remote reference: ${file}`,
  );
  assert(
    !/fetch\s*\(|XMLHttpRequest/.test(s) &&
      (file === "src/lib/cloud-client.ts" || !/createClient\s*\(/.test(s)),
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
if (existsSync(".git")) {
  const remotes = execFileSync("git", ["remote", "-v"], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const remote of remotes)
    assert(
      /^origin\s+https:\/\/github\.com\/uztaapp\/Uzta\.git\s+\((fetch|push)\)$/.test(remote),
      "Only the independent UZTA GitHub repository is authorized",
    );
}
const config = JSON.parse(
  readFileSync("config/uzta-cloud.public.json", "utf8"),
);
assert.equal(config.projectRef, "abgysktjctrxfkcejjwu");
assert.equal(config.url, "https://abgysktjctrxfkcejjwu.supabase.co");
assert.equal(config.siteUrl, "https://uzta-nu.vercel.app");
assert(config.publishableKey.startsWith("sb_publishable_"));
console.log(
  "PASS: independent UZTA source; only the authorized UZTA cloud project and public key; no foreign account bindings or secret credentials.",
);
