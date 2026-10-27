import { z } from "zod";
import { productPhotoSchema } from "./product-photo";
import { photoPath as checkedPhotoPath, signedPhotoUrl } from "./cloud-photos";

export const STORAGE_KEY = "uzta.local.v1";
export const categories = [
  "Verduras",
  "Frutas",
  "Huevos",
  "Lácteos",
  "Miel",
  "Otros",
] as const;
const crop = z.array(z.number().finite()).length(4);
const slotSchema = z.object({
  id: z.string(),
  date: z.string().date(),
  start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
});
export const farmSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(100),
  distance: z.string(),
  description: z.string().max(2000),
  ecological: z.boolean(),
  slots: z.array(slotSchema),
  position: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
});
export const productSchema = z.object({
  photo: productPhotoSchema,
  photoPath: z
    .string()
    .refine((value) => {
      try {
        checkedPhotoPath(value);
        return true;
      } catch {
        return false;
      }
    })
    .nullable()
    .optional(),
  photoUrl: z
    .string()
    .refine((value) => {
      try {
        signedPhotoUrl(value);
        return true;
      } catch {
        return false;
      }
    })
    .optional(),
  id: z.string(),
  farmId: z.string(),
  name: z.string().trim().min(1).max(100),
  priceCents: z.number().int().min(1).max(1000000),
  unit: z.enum(["kg", "docena", "unidad"]),
  stock: z.number().int().min(0).max(100000),
  category: z.enum(categories),
  crop,
  featured: z.boolean(),
  active: z.boolean(),
});
const lineSchema = z.object({
  productId: z.string(),
  name: z.string(),
  priceCents: z.number().int().positive(),
  unit: z.string(),
  quantity: z.number().int().positive(),
  crop,
});
const orderSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  farmId: z.string(),
  farmName: z.string(),
  createdAt: z.string(),
  pickup: slotSchema,
  message: z.string().max(1000),
  status: z.enum(["Pendiente", "Completado"]),
  lines: z.array(lineSchema).min(1),
  example: z.boolean(),
});
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre.").max(100),
  email: z.string().email("Escribe un correo válido.").max(200),
  location: z.string().trim().min(1, "Escribe una ubicación.").max(200),
  language: z.literal("Español"),
});
export const storeSchema = z
  .object({
    version: z.literal(1),
    revision: z.number().int().nonnegative(),
    profile: profileSchema,
    sessionActive: z.boolean(),
    farms: z.array(farmSchema).min(1),
    products: z.array(productSchema),
    quantities: z.record(z.string(), z.number().int().min(0).max(100000)),
    favorites: z.array(z.string()),
    orders: z.array(orderSchema),
    message: z.string().max(1000),
  })
  .superRefine((s, ctx) => {
    const farmIds = new Set(s.farms.map((f) => f.id));
    const productIds = new Set(s.products.map((p) => p.id));
    if (
      farmIds.size !== s.farms.length ||
      productIds.size !== s.products.length ||
      new Set(s.orders.map((o) => o.id)).size !== s.orders.length
    )
      ctx.addIssue({ code: "custom", message: "Identificadores duplicados." });
    if (
      s.products.some((p) => !farmIds.has(p.farmId)) ||
      s.orders.some((o) => !farmIds.has(o.farmId)) ||
      Object.keys(s.quantities).some((id) => !productIds.has(id)) ||
      s.favorites.some((id) => !productIds.has(id))
    )
      ctx.addIssue({ code: "custom", message: "Referencia local no válida." });
    const basket = s.products.filter((p) => (s.quantities[p.id] ?? 0) > 0);
    if (new Set(basket.map((p) => p.farmId)).size > 1)
      ctx.addIssue({
        code: "custom",
        message: "La cesta debe pertenecer a un productor.",
      });
  });
export type LocalStore = z.infer<typeof storeSchema>;
export type Product = z.infer<typeof productSchema>;
export type Farm = z.infer<typeof farmSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Slot = z.infer<typeof slotSchema>;
export const euro = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const lineTotal = (lines: Order["lines"]) =>
  lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function futureSlot(slot: Slot, now = new Date()) {
  const current = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return `${slot.date} ${slot.start}` > current;
}
export function seedStore(): LocalStore {
  const farms: Farm[] = [
    {
      id: "urki",
      name: "Ferme de l’Urki",
      location: "Ustaritz",
      distance: "3 km",
      description:
        "Hortalizas de temporada, cultivadas de forma natural en nuestro caserío familiar. Venta directa en la explotación.",
      ecological: true,
      slots: [],
    },
    {
      id: "poules",
      name: "Les Poules Heureuses",
      location: "",
      distance: "5 km",
      description: "",
      ecological: false,
      slots: [],
    },
    {
      id: "borda",
      name: "Ferme Borda",
      location: "",
      distance: "4 km",
      description: "",
      ecological: false,
      slots: [],
    },
    {
      id: "itxassou",
      name: "La Chèvrerie d’Itxassou",
      location: "Itxassou",
      distance: "",
      description: "",
      ecological: false,
      slots: [],
    },
  ];
  // Locations not supplied in the mockup are kept explicitly unspecified.
  farms[1].location = "Ubicación pendiente";
  farms[2].location = "Ubicación pendiente";
  farms[1].location = "Bassussarry";
  farms[1].description =
    "Granja ficticia de huevos camperos. Recogida directa con reserva previa en esta demostración.";
  farms[2].location = "Villefranque";
  farms[2].description =
    "Huerta ficticia de verduras de temporada, recién recogidas para la venta directa.";
  farms[3].distance = "12 km";
  farms[3].description =
    "Quesería ficticia con quesos de cabra y productos lácteos artesanos de demostración.";
  farms.push({
    id: "lorea",
    name: "Huerta Lorea",
    location: "Espelette",
    distance: "9 km",
    description:
      "Productor ficticio de fruta de temporada y miel. Todos los anuncios son ejemplos de diseño.",
    ecological: false,
    slots: [],
  });
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 3);
  farms.forEach((farm) => {
    farm.slots = [
      {
        id: `demo-${farm.id}`,
        date: localDate(nextDay),
        start: "10:00",
        end: "12:00",
      },
    ];
  });
  // Fictitious approximate map points for the independent showcase only.
  farms.forEach((farm, index) => {
    farm.position = [
      { lat: 43.45, lng: -1.46 },
      { lat: 43.47, lng: -1.51 },
      { lat: 43.44, lng: -1.45 },
      { lat: 43.33, lng: -1.41 },
      { lat: 43.34, lng: -1.44 },
    ][index];
  });
  const products: Product[] = [
    {
      id: "tomates",
      farmId: "urki",
      name: "Tomates",
      priceCents: 280,
      unit: "kg",
      stock: 20,
      category: "Verduras",
      crop: [25, 328, 111, 75],
      featured: true,
      active: true,
    },
    {
      id: "zanahorias",
      farmId: "urki",
      name: "Zanahorias",
      priceCents: 220,
      unit: "kg",
      stock: 15,
      category: "Verduras",
      crop: [186, 327, 113, 100],
      featured: true,
      active: true,
    },
    {
      id: "huevos",
      farmId: "urki",
      name: "Huevos camperos",
      priceCents: 350,
      unit: "docena",
      stock: 12,
      category: "Huevos",
      crop: [25, 513, 110, 100],
      featured: false,
      active: true,
    },
    {
      id: "lechuga",
      farmId: "urki",
      name: "Lechuga",
      priceCents: 150,
      unit: "unidad",
      stock: 30,
      category: "Verduras",
      crop: [186, 513, 111, 100],
      featured: false,
      active: true,
    },
    {
      id: "huevos-poules",
      farmId: "poules",
      name: "Huevos camperos",
      priceCents: 350,
      unit: "docena",
      stock: 12,
      category: "Huevos",
      crop: [25, 513, 110, 100],
      featured: true,
      active: true,
    },
    {
      id: "lechuga-borda",
      farmId: "borda",
      name: "Lechuga",
      priceCents: 150,
      unit: "unidad",
      stock: 30,
      category: "Verduras",
      crop: [186, 513, 111, 100],
      featured: true,
      active: true,
    },
  ];
  products.push(
    {
      id: "patatas",
      farmId: "urki",
      name: "Patatas de temporada",
      priceCents: 180,
      unit: "kg",
      stock: 25,
      category: "Verduras",
      crop: [382, 849, 62, 38],
      featured: true,
      active: true,
    },
    {
      id: "queso-cabra",
      farmId: "itxassou",
      name: "Queso de cabra",
      priceCents: 625,
      unit: "unidad",
      stock: 16,
      category: "Lácteos",
      crop: [1057, 703, 35, 36],
      featured: true,
      active: true,
    },
    {
      id: "manzanas",
      farmId: "lorea",
      name: "Manzanas de temporada",
      priceCents: 290,
      unit: "kg",
      stock: 24,
      category: "Frutas",
      crop: [0, 0, 0, 0],
      featured: true,
      active: true,
    },
    {
      id: "miel",
      farmId: "lorea",
      name: "Miel de flores · 500 g",
      priceCents: 750,
      unit: "unidad",
      stock: 18,
      category: "Miel",
      crop: [0, 0, 0, 0],
      featured: true,
      active: true,
    },
    {
      id: "hierbas",
      farmId: "borda",
      name: "Hierbas aromáticas",
      priceCents: 180,
      unit: "unidad",
      stock: 20,
      category: "Otros",
      crop: [0, 0, 0, 0],
      featured: true,
      active: true,
    },
    {
      id: "zanahorias-borda",
      farmId: "borda",
      name: "Zanahorias de huerta",
      priceCents: 240,
      unit: "kg",
      stock: 18,
      category: "Verduras",
      crop: [186, 327, 113, 100],
      featured: true,
      active: true,
    },
  );
  const snapshot = (id: string, quantity: number) => {
    const p = products.find((p) => p.id === id)!;
    return {
      productId: id,
      name: p.name,
      priceCents: p.priceCents,
      unit: p.unit,
      quantity,
      crop: p.crop,
    };
  };
  const example: Order = {
    id: "ejemplo-urki",
    farmId: "urki",
    farmName: farms[0].name,
    createdAt: "2026-10-26T12:00:00+01:00",
    pickup: {
      id: "historico",
      date: "2026-10-27",
      start: "17:00",
      end: "18:00",
    },
    message: "",
    status: "Pendiente",
    lines: [
      snapshot("tomates", 2),
      snapshot("zanahorias", 1),
      snapshot("huevos", 1),
      snapshot("lechuga", 2),
    ],
    example: true,
  };
  return {
    version: 1,
    revision: 0,
    profile: {
      name: "Ana García",
      email: "ana@example.test",
      location: "Bayona",
      language: "Español",
    },
    sessionActive: true,
    farms,
    products,
    quantities: { tomates: 2, zanahorias: 1, huevos: 1, lechuga: 2 },
    favorites: [],
    orders: [
      example,
      {
        ...example,
        id: "ejemplo-poules",
        farmId: "poules",
        farmName: farms[1].name,
        status: "Completado",
        pickup: { ...example.pickup, date: "2026-10-24" },
        lines: [snapshot("huevos-poules", 2)],
      },
      {
        ...example,
        id: "ejemplo-borda",
        farmId: "borda",
        farmName: farms[2].name,
        status: "Completado",
        pickup: { ...example.pickup, date: "2026-10-23" },
        lines: [snapshot("lechuga-borda", 3), snapshot("zanahorias-borda", 2)],
      },
      {
        ...example,
        id: "ejemplo-itxassou",
        farmId: "itxassou",
        farmName: farms[3].name,
        status: "Completado",
        pickup: { ...example.pickup, date: "2026-10-17" },
        lines: [snapshot("queso-cabra", 2)],
      },
    ],
    message: "",
  };
}
export type Command =
  | { type: "quantity"; id: string; delta: number }
  | { type: "remove"; id: string }
  | { type: "favorite"; id: string }
  | { type: "message"; value: string }
  | { type: "profile"; value: LocalStore["profile"] }
  | { type: "session"; active: boolean }
  | { type: "farm"; value: Farm }
  | { type: "product"; value: Product }
  | { type: "reserve"; slotId: string; id: string; now: string }
  | { type: "complete"; id: string };
export function transition(previous: LocalStore, command: Command): LocalStore {
  const s = structuredClone(previous);
  if (
    ["farm", "product", "complete"].includes(command.type) &&
    !s.sessionActive
  )
    throw Error("Abre el perfil local para gestionar tu tienda.");
  if (command.type === "quantity") {
    const p = s.products.find((p) => p.id === command.id);
    if (!p || !p.active) throw Error("El producto no está disponible.");
    const other = s.products.find(
      (p) =>
        (s.quantities[p.id] ?? 0) > 0 &&
        p.farmId !== s.products.find((p) => p.id === command.id)?.farmId,
    );
    if (other && command.delta > 0)
      throw Error(
        "La cesta contiene productos de otro productor. Confirma esa reserva o vacía la cesta antes de cambiar de tienda.",
      );
    const quantity = Math.max(0, (s.quantities[p.id] ?? 0) + command.delta);
    if (quantity > p.stock) throw Error("No hay suficiente stock disponible.");
    s.quantities[p.id] = quantity;
  } else if (command.type === "remove") delete s.quantities[command.id];
  else if (command.type === "favorite") {
    if (!s.products.some((p) => p.id === command.id))
      throw Error("Producto desconocido.");
    s.favorites = s.favorites.includes(command.id)
      ? s.favorites.filter((id) => id !== command.id)
      : [...s.favorites, command.id];
  } else if (command.type === "message") s.message = command.value;
  else if (command.type === "profile")
    s.profile = profileSchema.parse(command.value);
  else if (command.type === "session") s.sessionActive = command.active;
  else if (command.type === "farm") {
    const farm = farmSchema.parse(command.value);
    const previousFarm = s.farms.find((f) => f.id === farm.id);
    if (!previousFarm || farm.id !== "urki")
      throw Error("Esta tienda no pertenece al perfil local.");
    if (new Set(farm.slots.map((slot) => slot.id)).size !== farm.slots.length)
      throw Error("Las franjas no pueden tener identificadores repetidos.");
    for (const slot of farm.slots) {
      const unchanged = previousFarm.slots.some(
        (old) =>
          old.id === slot.id &&
          old.date === slot.date &&
          old.start === slot.start &&
          old.end === slot.end,
      );
      if (slot.start >= slot.end || (!unchanged && !futureSlot(slot)))
        throw Error(
          "Los horarios nuevos deben ser futuros y la hora final posterior a la inicial.",
        );
      if (
        farm.slots.some(
          (other) =>
            other.id !== slot.id &&
            other.date === slot.date &&
            other.start < slot.end &&
            other.end > slot.start,
        )
      )
        throw Error("Las franjas de un día no se pueden solapar.");
    }
    s.farms = s.farms.map((f) => (f.id === farm.id ? farm : f));
  } else if (command.type === "product") {
    const p = productSchema.parse(command.value);
    if (p.farmId !== "urki")
      throw Error("Esta tienda no pertenece al perfil local.");
    const index = s.products.findIndex((x) => x.id === p.id);
    if (index >= 0 && s.products[index].farmId !== p.farmId)
      throw Error("No se puede trasladar un producto a otro productor.");
    if (index >= 0) s.products[index] = p;
    else s.products.push(p);
  } else if (command.type === "reserve") {
    if (!s.sessionActive)
      throw Error("Abre tu perfil local antes de reservar.");
    if (s.orders.some((o) => o.id === command.id)) return previous;
    const items = s.products.filter((p) => (s.quantities[p.id] ?? 0) > 0);
    if (!items.length) throw Error("La cesta está vacía.");
    const farm = s.farms.find((f) => f.id === items[0].farmId)!;
    if (items.some((p) => p.farmId !== farm.id))
      throw Error("La cesta debe contener productos de un mismo productor.");
    const slot = farm.slots.find((slot) => slot.id === command.slotId);
    if (!slot || !futureSlot(slot, new Date(command.now)))
      throw Error(
        "Selecciona una fecha y hora futura de las ofrecidas por el productor.",
      );
    const lines = items.map((p) => {
      const quantity = s.quantities[p.id];
      if (!p.active || quantity > p.stock)
        throw Error(`Revisa la disponibilidad de ${p.name}.`);
      return {
        productId: p.id,
        name: p.name,
        priceCents: p.priceCents,
        unit: p.unit,
        quantity,
        crop: p.crop,
      };
    });
    for (const line of lines)
      s.products.find((p) => p.id === line.productId)!.stock -= line.quantity;
    s.orders.unshift({
      id: command.id,
      farmId: farm.id,
      farmName: farm.name,
      createdAt: command.now,
      pickup: slot,
      message: s.message,
      status: "Pendiente",
      lines,
      example: false,
    });
    s.quantities = {};
    s.message = "";
  } else if (command.type === "complete") {
    const order = s.orders.find((o) => o.id === command.id);
    if (!order) throw Error("Pedido desconocido.");
    if (order.farmId !== "urki")
      throw Error("Esta reserva no pertenece a tu tienda local.");
    if (order.example) throw Error("El pedido ilustrativo no se modifica.");
    order.status = "Completado";
  }
  s.revision++;
  return storeSchema.parse(s);
}
export function readStore(
  storage: Pick<Storage, "getItem">,
  key = STORAGE_KEY,
): {
  value: LocalStore;
  error: string;
} {
  try {
    const raw = storage.getItem(key);
    return {
      value: raw ? storeSchema.parse(JSON.parse(raw)) : seedStore(),
      error: "",
    };
  } catch {
    return {
      value: seedStore(),
      error:
        "No se han podido leer los datos locales. Se muestran ejemplos y se bloquea el guardado para conservar los datos anteriores.",
    };
  }
}
