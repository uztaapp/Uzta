import { z } from "zod";
export const pendingCheckoutKey = (userId: string) =>
  `uzta.cloud.checkout.v1.${userId}`;
export const pendingSchema = z.object({
  id: z.string().uuid(),
  fingerprint: z.string(),
});
export function pendingReservationId(userId: string): string | null {
  const raw = localStorage.getItem(pendingCheckoutKey(userId));
  return raw ? pendingSchema.parse(JSON.parse(raw)).id : null;
}
