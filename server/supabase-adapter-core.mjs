// Shared UZTA data contract. Explicit origin policies are supplied by scoped wrappers.
import { z } from "zod";
import { randomUUID } from "node:crypto";

const uuid = z.uuid();
const instant = z.iso.datetime({ offset: true });
const productInput = z
  .object({
    id: uuid.optional(),
    producer_id: uuid,
    name: z.string().trim().min(1).max(100),
    price_cents: z.number().int().min(1).max(1000000),
    unit: z.enum(["kg", "docena", "unidad"]),
    category: z.enum([
      "Verduras",
      "Frutas",
      "Huevos",
      "Lácteos",
      "Miel",
      "Otros",
    ]),
    stock_units: z.number().int().min(0).max(100000),
    active: z.boolean(),
  })
  .strict();
const producerInput = z
  .object({
    id: uuid.optional(),
    name: z.string().trim().min(1).max(100),
    location: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    ecological: z.boolean(),
    active: z.boolean(),
  })
  .strict();
const slotInput = z
  .object({
    id: uuid.optional(),
    producer_id: uuid,
    starts_at: instant,
    ends_at: instant,
    active: z.boolean(),
  })
  .strict()
  .refine((s) => Date.parse(s.ends_at) > Date.parse(s.starts_at), {
    message: "La hora final debe ser posterior a la inicial.",
  });
const reserveInput = z
  .object({
    id: uuid,
    slotId: uuid,
    items: z
      .array(
        z
          .object({
            productId: uuid,
            quantity: z.number().int().min(1).max(100000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    message: z.string().max(1000).default(""),
  })
  .strict()
  .refine(
    (s) => new Set(s.items.map((i) => i.productId)).size === s.items.length,
    { message: "Productos repetidos." },
  );
const profileInput = z
  .object({
    display_name: z.string().trim().min(1).max(100),
    location: z.string().max(200),
    language: z.literal("es"),
  })
  .strict();
const profileRow = profileInput.extend({ user_id: uuid }).strip();
const producerRow = producerInput
  .omit({ id: true })
  .extend({ id: uuid, owner_id: uuid })
  .strip();
const productRow = productInput.omit({ id: true }).extend({ id: uuid }).strip();
const slotRow = z.object({
  id: uuid,
  producer_id: uuid,
  starts_at: z.string(),
  ends_at: z.string(),
  active: z.boolean(),
});
const money = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .refine(Number.isSafeInteger);
const lineRow = z.object({
  order_id: uuid,
  product_id: uuid,
  product_name: z.string(),
  unit: z.string(),
  unit_price_cents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  line_cents: money,
});
const orderRow = z.object({
  id: uuid,
  customer_id: uuid,
  producer_id: uuid,
  producer_name: z.string(),
  pickup_starts_at: z.string(),
  pickup_ends_at: z.string(),
  message: z.string(),
  status: z.enum(["Pendiente", "Completado"]),
  total_cents: money,
  created_at: z.string(),
  items: z.array(lineRow),
});

export class LocalApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "LocalApiError";
    this.status = status;
  }
}
function userToken(token, origin, issuerAliases) {
  try {
    if (typeof token !== "string" || token.length > 16000) throw Error();
    const parts = token.split(".");
    if (parts.length !== 3 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)))
      throw Error();
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    const acceptedIssuer = [`${origin}/auth/v1`, ...issuerAliases];
    if (
      !acceptedIssuer.includes(claims.iss) ||
      claims.role !== "authenticated" ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000 ||
      claims.is_anonymous === true
    )
      throw Error();
    uuid.parse(claims.sub);
    return claims.sub;
  } catch {
    throw new LocalApiError(
      "Se necesita una sesión de usuario válida del Supabase de UZTA de UZTA.",
    );
  }
}

export function createScopedSupabase({
  url,
  allowedOrigin,
  issuerAliases = [],
  connectionError = "No se puede contactar la base de datos de UZTA. Inténtalo de nuevo más tarde.",
  publishableKey,
  accessToken,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof url !== "string" || url !== allowedOrigin)
    throw new LocalApiError("Origen no autorizado para UZTA.");
  if (
    typeof publishableKey !== "string" ||
    !/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(publishableKey)
  )
    throw new LocalApiError(
      "Usa únicamente la clave publicable del proyecto de UZTA. No se admiten claves secretas o de servicio.",
    );
  if (typeof fetchImpl !== "function")
    throw new LocalApiError("No hay un transporte HTTP disponible.");
  if (accessToken !== undefined) userToken(accessToken, url, issuerAliases);
  const user = () => userToken(accessToken, url, issuerAliases);
  async function request(
    path,
    { method = "GET", query, body, authenticated = false, prefer } = {},
  ) {
    if (authenticated) user();
    const endpoint = new URL(path, url);
    if (
      endpoint.origin !== allowedOrigin ||
      !/^\/(?:rest|auth)\/v1\//.test(endpoint.pathname)
    )
      throw new LocalApiError("Ruta local no permitida.");
    for (const [key, value] of Object.entries(query ?? {}))
      endpoint.searchParams.set(key, String(value));
    const headers = { apikey: publishableKey, Accept: "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers.Prefer = prefer;
    let response;
    try {
      response = await fetchImpl(endpoint.href, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new LocalApiError(connectionError);
    }
    if (response.status >= 300 && response.status < 400)
      throw new LocalApiError(
        "Se ha bloqueado una redirección de Supabase de UZTA.",
        response.status,
      );
    if (!response.ok) {
      const message =
        response.status === 401
          ? "La sesión local ha caducado o no es válida."
          : response.status === 403
            ? "El usuario local no tiene permiso para esta operación."
            : response.status === 409
              ? "Los datos han cambiado. Revisa el stock o la reserva antes de repetir."
              : "Supabase de UZTA ha rechazado la operación. No se ha confirmado ningún cambio.";
      throw new LocalApiError(message, response.status);
    }
    if (response.status === 204) return null;
    try {
      const text = await response.text();
      return text.trim() ? JSON.parse(text) : null;
    } catch {
      throw new LocalApiError(
        "Supabase de UZTA devolvió una respuesta no válida.",
      );
    }
  }
  async function rows(path, schema, options) {
    const value = await request(path, options);
    try {
      return z.array(schema).parse(value);
    } catch {
      throw new LocalApiError(
        "La respuesta local no coincide con el modelo de UZTA.",
      );
    }
  }
  async function save(table, input, schema, extra = {}) {
    user();
    const record = { ...input, id: input.id ?? randomUUID(), ...extra };
    const result = await rows(`/rest/v1/${table}`, schema, {
      method: "POST",
      query: { on_conflict: "id" },
      body: record,
      authenticated: true,
      prefer: "resolution=merge-duplicates,return=representation",
    });
    if (result.length !== 1)
      throw new LocalApiError("No se pudo confirmar el guardado local.");
    return result[0];
  }
  return Object.freeze({
    async verifySession() {
      const id = user();
      const result = await request("/auth/v1/user", { authenticated: true });
      if (result?.id !== id || result?.is_anonymous === true)
        throw new LocalApiError(
          "La identidad local no coincide con la sesión.",
        );
      return { id };
    },
    async catalog() {
      const [producers, products, slots] = await Promise.all([
        rows("/rest/v1/uzta_producers", producerRow, {
          query: { select: "*", active: "eq.true", order: "name.asc" },
        }),
        rows("/rest/v1/uzta_products", productRow, {
          query: { select: "*", active: "eq.true", order: "name.asc" },
        }),
        rows("/rest/v1/uzta_pickup_slots", slotRow, {
          query: {
            select: "*",
            active: "eq.true",
            starts_at: `gt.${new Date().toISOString()}`,
            order: "starts_at.asc",
          },
        }),
      ]);
      const activeIds = new Set(producers.map((p) => p.id));
      return {
        producers,
        products: products.filter((p) => activeIds.has(p.producer_id)),
        slots: slots.filter((s) => activeIds.has(s.producer_id)),
      };
    },
    async profile() {
      return (
        (
          await rows("/rest/v1/uzta_profiles", profileRow, {
            authenticated: true,
            query: { select: "*", user_id: `eq.${user()}` },
          })
        )[0] ?? null
      );
    },
    async saveProfile(value) {
      const body = { ...profileInput.parse(value), user_id: user() };
      const result = await rows("/rest/v1/uzta_profiles", profileRow, {
        method: "POST",
        authenticated: true,
        body,
        query: { on_conflict: "user_id" },
        prefer: "resolution=merge-duplicates,return=representation",
      });
      if (result.length !== 1)
        throw new LocalApiError("No se pudo confirmar el perfil local.");
      return result[0];
    },
    async saveProducer(value) {
      return save("uzta_producers", producerInput.parse(value), producerRow, {
        owner_id: user(),
      });
    },
    async saveProduct(value) {
      return save("uzta_products", productInput.parse(value), productRow);
    },
    async savePickupSlot(value) {
      return save("uzta_pickup_slots", slotInput.parse(value), slotRow);
    },
    async orders() {
      return rows("/rest/v1/uzta_orders", orderRow, {
        authenticated: true,
        query: {
          select: "*,items:uzta_order_items(*)",
          order: "created_at.desc",
        },
      });
    },
    async reserve(value) {
      const input = reserveInput.parse(value);
      const result = await request("/rest/v1/rpc/uzta_reserve_order", {
        method: "POST",
        authenticated: true,
        body: {
          p_id: input.id,
          p_slot: input.slotId,
          p_items: input.items.map((i) => ({
            product_id: i.productId,
            quantity: i.quantity,
          })),
          p_message: input.message,
        },
      });
      if (result !== input.id)
        throw new LocalApiError(
          "No se pudo confirmar el identificador de la reserva local.",
        );
      return result;
    },
    async complete(orderId) {
      await request("/rest/v1/rpc/uzta_complete_order", {
        method: "POST",
        authenticated: true,
        body: { p_id: uuid.parse(orderId) },
      });
    },
    async favorites() {
      return rows(
        "/rest/v1/uzta_favorites",
        z.object({ user_id: uuid, product_id: uuid }),
        {
          authenticated: true,
          query: { select: "*", user_id: `eq.${user()}` },
        },
      );
    },
    async setFavorite(productId, enabled) {
      uuid.parse(productId);
      if (typeof enabled !== "boolean")
        throw new LocalApiError("Estado de favorito no válido.");
      const id = user();
      return request(
        "/rest/v1/uzta_favorites",
        enabled
          ? {
              method: "POST",
              authenticated: true,
              body: { user_id: id, product_id: productId },
              prefer: "resolution=ignore-duplicates",
              query: { on_conflict: "user_id,product_id" },
            }
          : {
              method: "DELETE",
              authenticated: true,
              query: { user_id: `eq.${id}`, product_id: `eq.${productId}` },
            },
      );
    },
  });
}
