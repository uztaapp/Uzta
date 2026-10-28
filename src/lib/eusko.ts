import { z } from "zod";
export type EuskoMethods = { euskoNotes?: boolean; euskoDigital?: boolean };
export type PaymentPreference = "EUR" | "EUSKO";
export const acceptsEusko = (farm: EuskoMethods | undefined | null) =>
  !!(farm?.euskoNotes || farm?.euskoDigital);
export const paymentAllowed = (
  farm: EuskoMethods | undefined | null,
  preference: PaymentPreference,
) => preference === "EUR" || acceptsEusko(farm);
export async function euskoAdoption() {
  const { cloudClient } = await import("./cloud-client");
  const r = await cloudClient().rpc("uzta_eusko_adoption");
  if (r.error) throw Error("eusko");
  return z
    .object({
      total: z.coerce.number().int().nonnegative(),
      notes: z.coerce.number().int().nonnegative(),
      digital: z.coerce.number().int().nonnegative(),
    })
    .parse(r.data);
}
