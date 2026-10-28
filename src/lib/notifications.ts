import { z } from "zod";

import { t } from "./language";
const row = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  kind: z.enum([
    "new_reservation",
    "registered",
    "confirmed",
    "prepared",
    "cancelled",
    "completed",
  ]),
  audience: z.enum(["buyer", "seller"]),
  created_at: z.string(),
});
export type Notification = z.infer<typeof row>;
export const notificationTitle = (kind: Notification["kind"]) =>
  t(
    {
      new_reservation: "Nueva reserva recibida",
      registered: "Tu reserva se ha registrado",
      confirmed: "Reserva confirmada",
      prepared: "Reserva preparada para recoger",
      cancelled: "Reserva cancelada",
      completed: "Recogida completada",
    }[kind],
  );
export async function loadNotifications(userId: string) {
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient()
    .from("uzta_notifications")
    .select("id,order_id,kind,audience,created_at", { count: "exact" })
    .eq("recipient_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(50);
  if (r.error || typeof r.count !== "number")
    throw Error("No se pudieron cargar las notificaciones.");
  return { rows: z.array(row).parse(r.data), count: r.count };
}
export async function readNotification(id: string) {
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient().rpc("uzta_read_notification", {
    p_id: z.string().uuid().parse(id),
  });
  if (r.error) throw Error("No se pudo marcar la notificación como leída.");
}
