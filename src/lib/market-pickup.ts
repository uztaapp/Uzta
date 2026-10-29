import { z } from "zod";
export const marketPickupSchema = z.object({
  timezone: z.enum(["Europe/Madrid", "Europe/Paris"]).optional(),
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  locality: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  date: z.string().date(),
});
export type MarketPickup = z.infer<typeof marketPickupSchema>;
