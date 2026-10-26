// Explicitly authorized UZTA project only. No account credentials or database password.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createUztaCloud } from "../server/uzta-cloud.mjs";
const config = JSON.parse(
  readFileSync("config/uzta-cloud.public.json", "utf8"),
);
assert.equal(config.url, "https://abgysktjctrxfkcejjwu.supabase.co");
assert.ok(/^sb_publishable_/.test(config.publishableKey));
const headers = { apikey: config.publishableKey };
const publicRead = await fetch(
  `${config.url}/rest/v1/uzta_producers?select=id&limit=1`,
  { headers, redirect: "error", signal: AbortSignal.timeout(12000) },
);
assert.equal(
  publicRead.status,
  200,
  "Public catalogue endpoint must be available",
);
assert.ok(Array.isArray(await publicRead.json()));
console.log("PASS: UZTA public catalogue API responds correctly.");
const catalogue = await createUztaCloud().catalog();
assert.ok(
  Array.isArray(catalogue.producers) &&
    Array.isArray(catalogue.products) &&
    Array.isArray(catalogue.slots),
);
console.log("PASS: authorized UZTA adapter reads the real catalogue contract.");
const privateRead = await fetch(
  `${config.url}/rest/v1/uzta_profiles?select=user_id&limit=1`,
  { headers, redirect: "error", signal: AbortSignal.timeout(12000) },
);
assert.ok(
  [401, 403].includes(privateRead.status),
  "Anonymous profile access must be denied",
);
console.log("PASS: anonymous profile access denied.");
const protectedWrite = await fetch(
  `${config.url}/rest/v1/rpc/uzta_reserve_order`,
  {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_id: null,
      p_slot: null,
      p_items: [],
      p_message: "",
    }),
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  },
);
assert.ok(
  [401, 403].includes(protectedWrite.status),
  "Anonymous reservation execution must be denied",
);
console.log(
  "PASS: anonymous reservation execution denied. No user or business data created.",
);
