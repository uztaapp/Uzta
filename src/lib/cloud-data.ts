import { accessSchema } from "./producer-approval";
import { paymentAllowed } from "./eusko";
import { canReserve } from "./availability";
import { z } from "zod";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { cloudClient } from "./cloud-client";
import { sellerPosition } from "./sellers";
import cloudConfig from "../../config/uzta-cloud.public.json";
import {
  COVER_BUCKET,
  loadProductPhotos,
  uploadProductPhoto,
  photoPath,
} from "./cloud-photos";
import {
  categories,
  seedStore,
  futureSlot,
  farmSchema,
  productSchema,
  type LocalStore,
  type Command,
  type Farm,
  type Slot,
} from "./local-model";

const uuid = z.uuid();
const cartSchema = z.object({
  quantities: z.record(uuid, z.number().int().min(0).max(100000)),
  message: z.string().max(1000),
});
export const cartKey = (userId: string | null) =>
  `uzta.cloud.cart.v1.${userId ?? "guest"}`;
export { pendingCheckoutKey } from "./checkout-receipt";
import { pendingCheckoutKey, pendingSchema } from "./checkout-receipt";
function cartFingerprint(data: LocalStore, slot: Slot | undefined) {
  return JSON.stringify({
    items: Object.entries(data.quantities)
      .filter(([, q]) => q > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
    message: data.message,
    pickup: slot ? { date: slot.date, start: slot.start, end: slot.end } : null,
  });
}
function savedOrderFingerprint(order: LocalStore["orders"][number]) {
  return JSON.stringify({
    items: order.lines
      .map((l) => [l.productId, l.quantity] as [string, number])
      .sort(([a], [b]) => a.localeCompare(b)),
    message: order.message,
    pickup: {
      date: order.pickup.date,
      start: order.pickup.start,
      end: order.pickup.end,
    },
  });
}
export function readCloudCart(userId: string | null) {
  const raw = localStorage.getItem(cartKey(userId));
  return raw
    ? cartSchema.parse(JSON.parse(raw))
    : { quantities: {}, message: "" };
}
export function writeCloudCart(
  userId: string | null,
  value: ReturnType<typeof readCloudCart>,
) {
  localStorage.setItem(
    cartKey(userId),
    JSON.stringify(cartSchema.parse(value)),
  );
}
// A verified sign-in keeps the visitor selection when no saved account basket exists.
export function adoptGuestCart(userId: string) {
  uuid.parse(userId);
  const own = readCloudCart(userId);
  if (
    Object.values(own.quantities).some((q) => q > 0) ||
    own.message ||
    localStorage.getItem(pendingCheckoutKey(userId))
  )
    return false;
  let guest: ReturnType<typeof readCloudCart>;
  try {
    guest = readCloudCart(null);
  } catch {
    return false;
  } // Preserve unreadable visitor data without blocking sign-in.
  if (!Object.values(guest.quantities).some((q) => q > 0)) return false;
  writeCloudCart(userId, guest);
  localStorage.removeItem(cartKey(null));
  return true;
}
export function emptyCloudData(): LocalStore {
  return {
    ...seedStore(),
    profile: { name: "", email: "", location: "", language: "Español" },
    sessionActive: false,
    farms: [],
    products: [],
    quantities: {},
    favorites: [],
    sellerFavorites: [],
    orders: [],
    message: "",
  };
}
export function madridParts(instant: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function madridToUtc(date: string, time: string) {
  z.iso.date().parse(date);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("Hora no válida.");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  let utc = target;
  for (let i = 0; i < 3; i++) {
    const p = madridParts(new Date(utc).toISOString());
    const [py, pm, pd] = p.date.split("-").map(Number);
    const [ph, pmin] = p.time.split(":").map(Number);
    utc += target - Date.UTC(py, pm - 1, pd, ph, pmin);
  }
  const p = madridParts(new Date(utc).toISOString());
  const same = (t: number) => {
    const q = madridParts(new Date(t).toISOString());
    return q.date === date && q.time === time;
  };
  if (
    p.date !== date ||
    p.time !== time ||
    same(utc - 3600000) ||
    same(utc + 3600000)
  )
    throw Error(
      "Esta hora coincide con un cambio de horario. Elige otra franja.",
    );
  return new Date(utc).toISOString();
}
export function cloudMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  if (code === "23505")
    return "Este registro ya existe. Actualiza la pantalla antes de repetir.";
  if (code === "42501")
    return "Tu cuenta no tiene permiso para realizar esta operación.";
  if (code === "P0001")
    return "No se ha confirmado la operación. Revisa el stock, el productor y la franja de recogida.";
  if (error instanceof Error && !("code" in error)) return error.message;
  return "No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.";
}
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
const producerRow = z.object({
  avatar_path: z.string().nullable().optional(),
  cover_path: z.string().nullable().optional(),
  eusko_notes: z.boolean().optional(),
  eusko_digital: z.boolean().optional(),
  seller_type: z.enum(["professional", "private"]).nullable().optional(),
  public_latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  public_longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  id: uuid,
  owner_id: uuid,
  name: z.string(),
  location: z.string(),
  description: z.string(),
  ecological: z.boolean(),
  active: z.boolean(),
});
const productRow = z.object({
  description: z.string().optional(),
  id: uuid,
  producer_id: uuid,
  name: z.string(),
  price_cents: z.number().int().positive(),
  unit: z.enum(["kg", "docena", "unidad"]),
  category: z.enum(categories),
  stock_units: z.number().int().nonnegative(),
  availability: z.enum(["available", "upcoming", "sold_out"]).optional(),
  expected_available_on: z.string().date().nullable().optional(),
  active: z.boolean(),
  featured: z.boolean().optional(),
  photo_path: z.string().nullable().optional(),
});
const slotRow = z.object({
  id: uuid,
  producer_id: uuid,
  starts_at: z.string(),
  ends_at: z.string(),
  active: z.boolean(),
});
export async function loadCloudData(
  user: User | null,
  api: SupabaseClient = cloudClient(),
) {
  const [farmResponse, productResponse, slotResponse] = await Promise.all([
    api.from("uzta_producers").select("*").order("created_at"),
    api.from("uzta_products").select("*"),
    api.from("uzta_pickup_slots").select("*").order("starts_at"),
  ]);
  const farms = z.array(producerRow).parse(check(farmResponse));
  const products = z.array(productRow).parse(check(productResponse));
  const slots = z.array(slotRow).parse(check(slotResponse));
  const data = emptyCloudData();
  if (user && cloudConfig.producerApprovalsReady)
    data.producerAccess = accessSchema.parse(
      check(await api.rpc("uzta_producer_access")),
    );
  let profile: { display_name: string; location: string } | null = null;
  let orders: any[] = [];
  let favorites: { product_id: string }[] = [];
  if (user) {
    const profileRead = check(
      await api
        .from("uzta_profiles")
        .select("display_name,location")
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    profile = profileRead;
    if (!profile) {
      const name =
        [
          user.user_metadata?.display_name,
          user.user_metadata?.full_name,
          user.user_metadata?.name,
        ]
          .find(
            (value): value is string =>
              typeof value === "string" && !!value.trim(),
          )
          ?.trim()
          .slice(0, 100) ?? "";
      check(
        await api.from("uzta_profiles").upsert(
          {
            user_id: user.id,
            display_name: name || "Mi cuenta",
            location: "",
            language: "es",
          },
          { onConflict: "user_id", ignoreDuplicates: true },
        ),
      );
      profile = check(
        await api
          .from("uzta_profiles")
          .select("display_name,location")
          .eq("user_id", user.id)
          .single(),
      );
    }
    const [o, f, sf] = await Promise.all([
      api
        .from("uzta_orders")
        .select("*,items:uzta_order_items(*)")
        .order("created_at", { ascending: false }),
      api.from("uzta_favorites").select("product_id").eq("user_id", user.id),
      cloudConfig.sellerFavoritesReady
        ? api
            .from("uzta_producer_favorites")
            .select("producer_id")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    orders = check(o) ?? [];
    favorites = check(f) ?? [];
    data.sellerFavorites = z
      .array(z.object({ producer_id: uuid }))
      .parse(check(sf) ?? [])
      .map((f) => f.producer_id);
  }
  data.profile = {
    name: profile?.display_name ?? "",
    email: user?.email ?? "",
    location: profile?.location ?? "",
    language: "Español",
  };
  data.sessionActive = !!user;
  const coverUrls = cloudConfig.producerCoversReady
    ? await loadProductPhotos(
        api,
        farms.map((f) => f.cover_path ?? "").filter(Boolean),
        COVER_BUCKET,
      )
    : new Map<string, string>();
  const avatarUrls = cloudConfig.producerAvatarsReady
    ? await loadProductPhotos(
        api,
        farms.map((f) => f.avatar_path ?? "").filter(Boolean),
        COVER_BUCKET,
      )
    : new Map<string, string>();
  data.farms = farms.map((f) => ({
    ...(cloudConfig.producerAvatarsReady
      ? {
          avatarPath: f.avatar_path ?? null,
          avatarUrl: f.avatar_path ? avatarUrls.get(f.avatar_path) : undefined,
        }
      : {}),
    ...(cloudConfig.producerCoversReady
      ? {
          coverPath: f.cover_path ?? null,
          coverUrl: f.cover_path ? coverUrls.get(f.cover_path) : undefined,
        }
      : {}),
    catalogVisible:
      !cloudConfig.knownExampleProducerIds.includes(f.id) ||
      products.some(
        (p) =>
          p.producer_id === f.id &&
          p.active &&
          !cloudConfig.knownExampleProductIds.includes(p.id),
      ),
    sellerType: f.seller_type,
    euskoNotes: f.eusko_notes ?? false,
    euskoDigital: f.eusko_digital ?? false,
    position:
      f.public_latitude != null && f.public_longitude != null
        ? sellerPosition(
            { lat: f.public_latitude, lng: f.public_longitude },
            f.seller_type,
          )
        : undefined,
    id: f.id,
    name: f.name,
    location: f.location,
    description: f.description,
    ecological: f.ecological,
    distance: "",
    slots: slots
      .filter((s) => s.producer_id === f.id && s.active)
      .map((s) => ({
        id: s.id,
        date: madridParts(s.starts_at).date,
        start: madridParts(s.starts_at).time,
        end: madridParts(s.ends_at).time,
      })),
  }));
  const photoUrls = await loadProductPhotos(
    api,
    products.flatMap((p) => (p.photo_path ? [p.photo_path] : [])),
  );
  data.products = products.map((p) => ({
    catalogVisible: !cloudConfig.knownExampleProductIds.includes(p.id),
    description: p.description,
    photoPath: p.photo_path,
    photoUrl: p.photo_path ? photoUrls.get(p.photo_path) : undefined,
    id: p.id,
    farmId: p.producer_id,
    name: p.name,
    priceCents: p.price_cents,
    unit: p.unit,
    stock: p.stock_units,
    availability: p.availability,
    expectedAvailableOn: p.expected_available_on,
    category: p.category,
    crop: [0, 0, 0, 0],
    featured: p.featured ?? true,
    active: p.active && !!farms.find((f) => f.id === p.producer_id)?.active,
  }));
  data.favorites = favorites.map((f) => f.product_id);
  data.orders = orders.map((o) => ({
    id: o.id,
    farmId: o.producer_id,
    customerId: o.customer_id,
    farmName: o.producer_name,
    createdAt: o.created_at,
    pickup: {
      id: o.id,
      date: madridParts(o.pickup_starts_at).date,
      start: madridParts(o.pickup_starts_at).time,
      end: madridParts(o.pickup_ends_at).time,
    },
    message: o.message,
    paymentPreference: o.payment_preference ?? null,
    euskoNotesAccepted: o.eusko_notes_accepted ?? false,
    euskoDigitalAccepted: o.eusko_digital_accepted ?? false,
    status: o.status,
    example: false,
    lines: o.items.map((l: any) => ({
      productId: l.product_id,
      name: l.product_name,
      priceCents: l.unit_price_cents,
      unit: l.unit,
      quantity: l.quantity,
      crop: [0, 0, 0, 0],
    })),
  }));
  const cart = readCloudCart(user?.id ?? null);
  data.quantities = cart.quantities;
  data.message = cart.message;
  if (user) {
    const pendingRaw = localStorage.getItem(pendingCheckoutKey(user.id));
    if (pendingRaw) {
      const pending = pendingSchema.parse(JSON.parse(pendingRaw));
      const order = data.orders.find((o) => o.id === pending.id);
      if (order) {
        const cartSlot = { ...order.pickup, id: "" };
        const matches =
          savedOrderFingerprint(order) === cartFingerprint(data, cartSlot);
        if (matches) {
          data.quantities = {};
          data.message = "";
          try {
            writeCloudCart(user.id, { quantities: {}, message: "" });
            localStorage.removeItem(pendingCheckoutKey(user.id));
          } catch {
            /* Keep the receipt marker so a reload cannot duplicate this order. */
          }
        } else {
          try {
            localStorage.removeItem(pendingCheckoutKey(user.id));
          } catch {
            /* Preserve the existing receipt marker rather than create a second order. */
          }
        }
      }
    }
  }
  for (const [id, quantity] of Object.entries(data.quantities)) {
    if (quantity > 0 && !data.products.some((p) => p.id === id))
      data.products.push({
        id,
        farmId: "unavailable",
        name: "Producto no disponible",
        priceCents: 0,
        unit: "unidad",
        stock: 0,
        category: "Otros",
        crop: [0, 0, 0, 0],
        featured: false,
        active: false,
      });
  }
  return {
    data,
    managedFarmId:
      cloudConfig.producerApprovalsReady && !data.producerAccess?.approved
        ? null
        : (farms.find((f) => f.owner_id === user?.id)?.id ?? null),
  };
}
export function cartTransition(data: LocalStore, command: Command) {
  const cart = { quantities: { ...data.quantities }, message: data.message };
  if (command.type === "message") cart.message = command.value;
  else if (command.type === "remove") delete cart.quantities[command.id];
  else if (command.type === "quantity") {
    const p = data.products.find((p) => p.id === command.id);
    if (!p || (!canReserve(p) && command.delta > 0))
      throw Error("El producto ya no está disponible.");
    if (
      command.delta > 0 &&
      data.products.some(
        (other) =>
          (cart.quantities[other.id] ?? 0) > 0 && other.farmId !== p.farmId,
      )
    )
      throw Error(
        "La cesta pertenece a otro productor. Termina o vacía la cesta antes de cambiar.",
      );
    const q = Math.max(0, (cart.quantities[p.id] ?? 0) + command.delta);
    if (command.delta > 0 && q > p.stock)
      throw Error("No hay suficiente stock disponible.");
    cart.quantities[p.id] = q;
  } else throw Error("Operación de cesta desconocida.");
  return cartSchema.parse(cart);
}
export async function persistCloudCommand(
  data: LocalStore,
  command: Command,
  user: User | null,
  managedFarmId: string | null,
  api: SupabaseClient = cloudClient(),
) {
  if (
    cloudConfig.producerApprovalsReady &&
    ["farm", "product", "complete"].includes(command.type) &&
    !data.producerAccess?.approved
  )
    throw Error("Necesitas la aprobación de productor.");
  if (!user) throw Error("Inicia sesión en UZTA para continuar.");
  if (command.type === "favorite" || command.type === "sellerFavorite") {
    uuid.parse(command.id);
    const seller = command.type === "sellerFavorite";
    if (seller && !cloudConfig.sellerFavoritesReady)
      throw Error("Favoritos de vendedores pendientes de activación.");
    const table = seller ? "uzta_producer_favorites" : "uzta_favorites";
    const column = seller ? "producer_id" : "product_id";
    if ((seller ? data.sellerFavorites : data.favorites).includes(command.id))
      check(
        await api
          .from(table)
          .delete()
          .eq("user_id", user.id)
          .eq(column, command.id),
      );
    else
      check(
        await api
          .from(table)
          .upsert(
            { user_id: user.id, [column]: command.id },
            { onConflict: `user_id,${column}`, ignoreDuplicates: true },
          ),
      );
  } else if (command.type === "profile") {
    if (command.value.email !== user.email)
      throw Error(
        "El correo pertenece a tu cuenta. Edita aquí solo tu nombre y ubicación.",
      );
    check(
      await api.from("uzta_profiles").upsert(
        {
          user_id: user.id,
          display_name: command.value.name.trim(),
          location: command.value.location.trim(),
          language: "es",
        },
        { onConflict: "user_id" },
      ),
    );
  } else if (command.type === "product") {
    if (command.value.farmId !== managedFarmId)
      throw Error("Este producto no pertenece a tu tienda.");
    const p = productSchema.parse(command.value);
    if (
      (p.availability === "available" && p.stock === 0) ||
      (p.availability === "sold_out" && p.stock > 0)
    )
      throw Error("Revisa la disponibilidad y las existencias.");
    if (
      !cloudConfig.availabilityReady &&
      (p.availability === "upcoming" || p.expectedAvailableOn)
    )
      throw Error("Disponibilidad de temporada pendiente de activación.");
    if (!cloudConfig.sellerTypesReady && p.description)
      throw Error(
        "Descripciones de producto pendientes de activar en Supabase.",
      );
    uuid.parse(p.id);
    uuid.parse(p.farmId);
    const previousPhoto = data.products.find(
      (item) => item.id === p.id,
    )?.photoPath;
    if (p.photoPath !== previousPhoto && p.photoPath !== undefined)
      throw Error(
        "No puedes cambiar directamente la referencia de una fotografía.",
      );
    let path = previousPhoto;
    if (p.photo === null) path = null;
    else if (p.photo)
      path = await uploadProductPhoto(api, user.id, p.farmId, p.id, p.photo);
    if (path) {
      photoPath(path);
      if (!path.startsWith(`${user.id}/${p.farmId}/${p.id}/`))
        throw Error("Esta fotografía no pertenece al producto.");
    }
    check(
      await api.from("uzta_products").upsert(
        {
          id: p.id,
          producer_id: p.farmId,
          name: p.name.trim(),
          ...(cloudConfig.sellerTypesReady
            ? { description: p.description ?? "" }
            : {}),
          price_cents: p.priceCents,
          unit: p.unit,
          category: p.category,
          stock_units: p.stock,
          ...(cloudConfig.availabilityReady
            ? {
                availability:
                  p.availability ?? (p.stock > 0 ? "available" : "sold_out"),
                expected_available_on:
                  p.availability === "upcoming"
                    ? (p.expectedAvailableOn ?? null)
                    : null,
              }
            : {}),
          active: p.active,
          featured: p.featured,
          ...(path !== undefined ? { photo_path: path } : {}),
        },
        { onConflict: "id" },
      ),
    );
  } else if (command.type === "farm") {
    const f = farmSchema.parse(command.value);
    uuid.parse(f.id);
    if (managedFarmId && f.id !== managedFarmId)
      throw Error("Esta tienda no pertenece a tu cuenta.");
    if (!f.name.trim() || !f.location.trim())
      throw Error("Completa el nombre y la ubicación de tu tienda.");
    const previous = data.farms.find((x) => x.id === f.id);
    if (
      !cloudConfig.sellerTypesReady &&
      f.sellerType &&
      f.sellerType !== previous?.sellerType
    )
      throw Error("Tipos de vendedor pendientes de activar en Supabase.");
    if (new Set(f.slots.map((s) => s.id)).size !== f.slots.length)
      throw Error("Hay franjas de recogida duplicadas.");
    const added = f.slots.filter(
      (s) => !previous?.slots.some((old) => old.id === s.id),
    );
    // Validate every new slot before sending any store or schedule changes.
    const newSlots = added.map((slot) => {
      uuid.parse(slot.id);
      if (!futureSlot(slot) || slot.start >= slot.end)
        throw Error("Selecciona una franja futura válida.");
      if (
        f.slots.some(
          (other) =>
            other.id !== slot.id &&
            other.date === slot.date &&
            other.start < slot.end &&
            other.end > slot.start,
        )
      )
        throw Error("Las franjas no se pueden solapar.");
      return {
        id: slot.id,
        producer_id: f.id,
        starts_at: madridToUtc(slot.date, slot.start),
        ends_at: madridToUtc(slot.date, slot.end),
        active: true,
      };
    });
    let coverPathValue: string | null | undefined;
    if (f.cover !== undefined) {
      if (!cloudConfig.producerCoversReady)
        throw Error("Portadas pendientes de activar en Supabase.");
      coverPathValue =
        f.cover === null
          ? null
          : await uploadProductPhoto(
              api,
              user.id,
              f.id,
              f.id,
              f.cover,
              COVER_BUCKET,
            );
    }
    let avatarPathValue: string | null | undefined;
    if (f.avatar !== undefined) {
      if (!cloudConfig.producerAvatarsReady)
        throw Error("Fotografía de productor no activada.");
      avatarPathValue =
        f.avatar === null
          ? null
          : await uploadProductPhoto(
              api,
              user.id,
              f.id,
              f.id,
              f.avatar,
              COVER_BUCKET,
            );
    }
    const changed =
      avatarPathValue !== undefined ||
      coverPathValue !== undefined ||
      !previous ||
      (cloudConfig.euskoReady &&
        (previous.euskoNotes !== f.euskoNotes ||
          previous.euskoDigital !== f.euskoDigital)) ||
      JSON.stringify(previous.position) !== JSON.stringify(f.position) ||
      ["name", "location", "description", "ecological", "sellerType"].some(
        (k) => (previous as any)[k] !== (f as any)[k],
      );
    if (changed)
      check(
        await api.from("uzta_producers").upsert(
          {
            id: f.id,
            owner_id: user.id,
            ...(avatarPathValue !== undefined
              ? { avatar_path: avatarPathValue }
              : {}),
            ...(coverPathValue !== undefined
              ? { cover_path: coverPathValue }
              : {}),
            name: f.name.trim(),
            ...(cloudConfig.sellerTypesReady
              ? { seller_type: f.sellerType ?? null }
              : {}),
            location: f.location.trim(),
            description: f.description,
            ecological: f.ecological,
            ...(f.position !== undefined
              ? {
                  public_latitude:
                    sellerPosition(f.position, f.sellerType)?.lat ?? null,
                  public_longitude:
                    sellerPosition(f.position, f.sellerType)?.lng ?? null,
                }
              : {}),
            ...(cloudConfig.euskoReady
              ? {
                  eusko_notes: f.euskoNotes ?? false,
                  eusko_digital: f.euskoDigital ?? false,
                }
              : {}),
            active: true,
          },
          { onConflict: "id" },
        ),
      );
    if (newSlots.length)
      check(await api.from("uzta_pickup_slots").insert(newSlots));
    const removed =
      previous?.slots.filter((s) => !f.slots.some((now) => now.id === s.id)) ??
      [];
    for (const slot of removed)
      check(
        await api
          .from("uzta_pickup_slots")
          .update({ active: false })
          .eq("id", slot.id)
          .eq("producer_id", f.id),
      );
  } else if (command.type === "reserve") {
    uuid.parse(command.id);
    uuid.parse(command.slotId);
    const items = data.products.filter((p) => (data.quantities[p.id] ?? 0) > 0);
    if (!items.length) throw Error("La cesta está vacía.");
    if (items.some((p) => !canReserve(p) || data.quantities[p.id] > p.stock))
      throw Error("Revisa la disponibilidad de los productos de la cesta.");
    if (new Set(items.map((p) => p.farmId)).size !== 1)
      throw Error("La cesta debe pertenecer a un productor.");
    const seller = data.farms.find((f) => f.id === items[0].farmId);
    if (
      command.paymentPreference === "EUSKO" &&
      (!cloudConfig.euskoReady || !paymentAllowed(seller, "EUSKO"))
    )
      throw Error("Eusko no aceptado por este vendedor.");
    const raw = localStorage.getItem(pendingCheckoutKey(user.id));
    const previous = raw ? pendingSchema.parse(JSON.parse(raw)) : null;
    const slot = data.farms
      .find((f) => f.id === items[0].farmId)
      ?.slots.find((s) => s.id === command.slotId);
    const pending = previous ?? {
      id: command.id,
      fingerprint: cartFingerprint(data, slot),
    };
    localStorage.setItem(pendingCheckoutKey(user.id), JSON.stringify(pending));
    const response = await api.rpc(
      cloudConfig.euskoReady
        ? "uzta_reserve_order_payment"
        : "uzta_reserve_order",
      {
        p_id: pending.id,
        p_slot: command.slotId,
        p_items: items.map((p) => ({
          product_id: p.id,
          quantity: data.quantities[p.id],
        })),
        p_message: data.message,
        ...(cloudConfig.euskoReady
          ? { p_preference: command.paymentPreference ?? "EUR" }
          : {}),
      },
    );
    if (response.error) {
      const code = String(response.error.code ?? "");
      if (["P0001", "42501", "23503", "22023", "22P02"].includes(code))
        localStorage.removeItem(pendingCheckoutKey(user.id));
      throw response.error;
    }
    if (response.data !== pending.id)
      throw Error(
        "No se pudo confirmar la reserva. Actualiza tus pedidos antes de repetir.",
      );
  } else if (command.type === "cancel") {
    if (!cloudConfig.cancellationsReady)
      throw Error("Cancelaciones pendientes de activación.");
    uuid.parse(command.id);
    check(await api.rpc("uzta_cancel_order", { p_id: command.id }));
  } else if (command.type === "complete") {
    const order = data.orders.find((o) => o.id === command.id);
    if (!order || order.farmId !== managedFarmId)
      throw Error("Esta reserva no pertenece a tu tienda.");
    check(await api.rpc("uzta_complete_order", { p_id: command.id }));
  } else throw Error("Operación no disponible para esta cuenta.");
}
