import test from "node:test";
import assert from "node:assert/strict";
import { createLocalSupabase, LOCAL_ORIGIN } from "./local-supabase.mjs";
import {
  dockerEndpointIsLocal,
  inspectDocker,
} from "../scripts/preflight-core.mjs";
const userId = "00000000-0000-4000-8000-000000000001",
  itemId = "00000000-0000-4000-8000-000000000002",
  slotId = "00000000-0000-4000-8000-000000000003",
  orderId = "00000000-0000-4000-8000-000000000004";
// Unsigned fixtures are used only with an injected transport, never with Auth.
function token(overrides = {}) {
  return [
    "e30",
    Buffer.from(
      JSON.stringify({
        sub: userId,
        iss: `${LOCAL_ORIGIN}/auth/v1`,
        role: "authenticated",
        exp: Date.now() / 1000 + 3600,
        ...overrides,
      }),
    ).toString("base64url"),
    "fixture",
  ].join(".");
}
function fixture(responder) {
  const calls = [];
  const api = createLocalSupabase({
    publishableKey: "sb_publishable_uzta_test_only",
    accessToken: token(),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return responder(url, init);
    },
  });
  return { api, calls };
}
test("external origins, other ports and alternate host syntax are rejected before transport", () => {
  for (const url of [
    "https://example.com",
    "http://localhost:55431",
    "http://127.0.0.1:54321",
    "http://127.0.0.1:55431/",
    "http://user:pass@127.0.0.1:55431",
    "http://127.0.0.1:55431.evil.test",
  ])
    assert.throws(
      () =>
        createLocalSupabase({
          url,
          publishableKey: "sb_publishable_uzta_test_only",
        }),
      /Solo se permite/,
    );
});
test("privileged keys and cloud, service, anonymous or expired user tokens are rejected", () => {
  for (const key of ["sb_secret_test_only", "service_role", "invalid"])
    assert.throws(
      () => createLocalSupabase({ publishableKey: key }),
      /publicable/,
    );
  for (const claims of [
    { iss: "https://example.com/auth/v1" },
    { role: "service_role" },
    { is_anonymous: true },
    { exp: 1 },
  ])
    assert.throws(
      () =>
        createLocalSupabase({
          publishableKey: "sb_publishable_uzta_test_only",
          accessToken: token(claims),
        }),
      /sesión/,
    );
});
test("private operations cannot send a request without a local user session", async () => {
  let requests = 0;
  const api = createLocalSupabase({
    publishableKey: "sb_publishable_uzta_test_only",
    fetchImpl: () => {
      requests++;
      throw Error();
    },
  });
  await assert.rejects(() => api.orders(), /sesión/);
  assert.equal(requests, 0);
});
test("identity is checked through Auth rather than treating decoded claims as authentication", async () => {
  const { api, calls } = fixture(() => Response.json({ id: userId }));
  assert.deepEqual(await api.verifySession(), { id: userId });
  assert.equal(new URL(calls[0].url).pathname, "/auth/v1/user");
  const mismatch = fixture(() => Response.json({ id: itemId }));
  await assert.rejects(() => mismatch.api.verifySession(), /identidad/);
});
test("reservation accepts quantities and identifiers but refuses supplied prices and duplicate items", async () => {
  const { api, calls } = fixture(() => Response.json(orderId));
  const input = {
    id: orderId,
    slotId,
    items: [{ productId: itemId, quantity: 2 }],
    message: "Mensaje local",
  };
  assert.equal(await api.reserve(input), orderId);
  const { url, init } = calls[0];
  assert.equal(new URL(url).origin, LOCAL_ORIGIN);
  assert.equal(init.redirect, "error");
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(init.body), {
    p_id: orderId,
    p_slot: slotId,
    p_items: [{ product_id: itemId, quantity: 2 }],
    p_message: "Mensaje local",
  });
  assert.notEqual(init.headers.Authorization, `Bearer ${init.headers.apikey}`);
  await assert.rejects(() =>
    api.reserve({
      ...input,
      items: [{ productId: itemId, quantity: 2, price: 1 }],
    }),
  );
  await assert.rejects(() =>
    api.reserve({ ...input, items: [...input.items, ...input.items] }),
  );
  assert.equal(calls.length, 1);
});
test("redirects are blocked and server error bodies are not exposed", async () => {
  const redirect = fixture(
    () =>
      new Response("", {
        status: 302,
        headers: { Location: "https://example.com" },
      }),
  );
  await assert.rejects(() => redirect.api.orders(), /redirección/);
  const denied = fixture(() =>
    Response.json({ message: "sensitive-server-fixture" }, { status: 403 }),
  );
  await assert.rejects(
    () => denied.api.orders(),
    (error) => error.status === 403 && !error.message.includes("sensitive"),
  );
});
test("ambiguous write acknowledgements are rejected and are never retried automatically", async () => {
  const { api, calls } = fixture(() => Response.json(itemId));
  await assert.rejects(
    () =>
      api.reserve({
        id: orderId,
        slotId,
        items: [{ productId: itemId, quantity: 1 }],
      }),
    /identificador/,
  );
  assert.equal(calls.length, 1);
});
test("minimal favorite responses work and deletions are scoped to the caller", async () => {
  const { api, calls } = fixture(() => new Response("", { status: 201 }));
  await api.setFavorite(itemId, true);
  await api.setFavorite(itemId, false);
  const deletion = new URL(calls[1].url);
  assert.equal(deletion.searchParams.get("user_id"), `eq.${userId}`);
  assert.equal(deletion.searchParams.get("product_id"), `eq.${itemId}`);
  assert.equal(calls[1].init.method, "DELETE");
});
test("malformed data and transport errors produce bounded local messages", async () => {
  const malformed = fixture(() => Response.json([{ unexpected: "fixture" }]));
  await assert.rejects(() => malformed.api.profile(), /modelo/);
  const down = fixture(() => {
    throw Error("private-transport-fixture");
  });
  await assert.rejects(
    () => down.api.orders(),
    (error) =>
      /Docker/.test(error.message) &&
      !error.message.includes("private-transport"),
  );
});
test("Docker rejects remote engines before making daemon calls", () => {
  assert.equal(
    dockerEndpointIsLocal("npipe:////./pipe/dockerDesktopLinuxEngine"),
    true,
  );
  assert.equal(dockerEndpointIsLocal("unix:///var/run/docker.sock"), true);
  assert.equal(dockerEndpointIsLocal("tcp://127.0.0.1:2375"), false);
  let calls = 0;
  assert.match(
    inspectDocker({
      env: { DOCKER_HOST: "ssh://example.com" },
      run: () => {
        calls++;
      },
    }),
    /externo/,
  );
  assert.equal(calls, 0);
  assert.match(
    inspectDocker({
      env: {},
      run: (args) => {
        calls++;
        assert.deepEqual(args, [
          "context",
          "inspect",
          "--format",
          "{{.Endpoints.docker.Host}}",
        ]);
        return { status: 0, stdout: "ssh://example.com" };
      },
    }),
    /no apunta/,
  );
  assert.equal(calls, 1);
});
test("Docker distinguishes missing software, stopped daemon and unsafe network bindings", () => {
  assert.match(
    inspectDocker({ env: {}, run: () => ({ error: { code: "ENOENT" } }) }),
    /no está instalado/,
  );
  const endpoint = {
    status: 0,
    stdout: "npipe:////./pipe/dockerDesktopLinuxEngine",
  };
  assert.match(
    inspectDocker({
      env: {},
      run: (args) => (args[0] === "context" ? endpoint : { status: 1 }),
    }),
    /no responde/,
  );
  assert.match(
    inspectDocker({
      env: {},
      run: (args) =>
        args[0] === "context"
          ? endpoint
          : args[0] === "info"
            ? { status: 0 }
            : { status: 0, stdout: JSON.stringify([{ Options: {} }]) },
    }),
    /no limita/,
  );
});

test("catalog accepts database metadata and excludes records outside the active producers", async () => {
  const producer = {
    id: slotId,
    owner_id: userId,
    name: "Tienda local",
    location: "Bayona",
    description: "Ejemplo",
    ecological: false,
    active: true,
    created_at: "2026-10-26T12:00:00Z",
  };
  const product = {
    id: itemId,
    producer_id: slotId,
    name: "Tomates",
    price_cents: 280,
    unit: "kg",
    category: "Verduras",
    stock_units: 3,
    active: true,
    created_at: producer.created_at,
  };
  const { api, calls } = fixture((url) =>
    Response.json(
      new URL(url).pathname.endsWith("uzta_producers")
        ? [producer]
        : new URL(url).pathname.endsWith("uzta_products")
          ? [product, { ...product, id: orderId, producer_id: userId }]
          : [],
    ),
  );
  const result = await api.catalog();
  assert.equal(result.producers.length, 1);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].id, itemId);
  assert.equal(calls.length, 3);
});
test("profile saves use the session identity and accept server-generated timestamps", async () => {
  const input = {
    display_name: "Perfil local",
    location: "Bayona",
    language: "es",
  };
  const { api, calls } = fixture(() =>
    Response.json([
      { ...input, user_id: userId, created_at: "2026-10-26T12:00:00Z" },
    ]),
  );
  assert.equal((await api.saveProfile(input)).user_id, userId);
  assert.equal(JSON.parse(calls[0].init.body).user_id, userId);
  await assert.rejects(() => api.saveProfile({ ...input, user_id: itemId }));
  assert.equal(calls.length, 1);
});
