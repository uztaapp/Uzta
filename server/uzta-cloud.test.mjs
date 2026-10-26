import test from "node:test";
import assert from "node:assert/strict";
import { createUztaCloud, UZTA_ORIGIN } from "./uzta-cloud.mjs";
test("UZTA cloud adapter cannot target another project or local instance", () => {
  for (const url of [
    "https://example.com",
    "http://127.0.0.1:55431",
    "https://other.supabase.co",
  ])
    assert.throws(() => createUztaCloud({ url }), /propio de UZTA/);
});
test("a local token cannot be sent to the UZTA cloud project", () => {
  const claims = {
    sub: "00000000-0000-4000-8000-000000000001",
    iss: "http://127.0.0.1:55431/auth/v1",
    role: "authenticated",
    exp: Date.now() / 1000 + 3600,
  };
  const accessToken = [
    "e30",
    Buffer.from(JSON.stringify(claims)).toString("base64url"),
    "fixture",
  ].join(".");
  assert.throws(() => createUztaCloud({ accessToken }), /sesión/);
});
test("public catalogue requests use only the authorized UZTA origin without bearer secrets", async () => {
  const calls = [];
  const api = createUztaCloud({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return Response.json([]);
    },
  });
  assert.deepEqual(await api.catalog(), {
    producers: [],
    products: [],
    slots: [],
  });
  assert.equal(calls.length, 3);
  assert.ok(
    calls.every(
      (c) =>
        new URL(c.url).origin === UZTA_ORIGIN &&
        c.init.redirect === "error" &&
        !c.init.headers.Authorization,
    ),
  );
});
