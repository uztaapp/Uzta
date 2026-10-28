import { z } from "zod";
const cents = z.coerce.number().int().safe();
export const saleSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  producer_id: z.string().uuid(),
  completed_at: z.string(),
  gross_cents: cents.nonnegative(),
  currency: z.literal("EUR"),
  rate_bps: z.number().int().min(0).max(10000),
  commission_cents: cents.nonnegative(),
  seller_net_cents: cents.nonnegative(),
  declared_at: z.string().nullable(),
});
export const eventSchema = z.object({
  id: z.string().uuid(),
  sale_id: z.string().uuid(),
  kind: z.enum(["collect", "adjust", "void"]),
  amount_cents: cents,
  reference: z.string(),
  created_at: z.string(),
});
export type Sale = z.infer<typeof saleSchema>;
export type CommissionEvent = z.infer<typeof eventSchema>;
export function saleAmounts(s: Sale, events: CommissionEvent[]) {
  const own = events.filter((e) => e.sale_id === s.id);
  const calculated =
    s.commission_cents +
    own
      .filter((e) => e.kind === "adjust")
      .reduce((n, e) => n + e.amount_cents, 0);
  const collected = own
    .filter((e) => e.kind === "collect")
    .reduce((n, e) => n + e.amount_cents, 0);
  const voided = own.some((e) => e.kind === "void");
  return {
    calculated,
    collected,
    voided,
    pending: voided ? 0 : Math.max(0, calculated - collected),
    net: s.gross_cents - calculated,
  };
}
export function percentageBps(value: string) {
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Invalid percentage");
  const [whole, decimal = ""] = value.trim().replace(",", ".").split(".");
  const n = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (n > 10000) throw Error("Invalid percentage");
  return n;
}
export function moneyCents(value: string) {
  if (!/^-?\d{1,10}([.,]\d{1,2})?$/.test(value.trim()))
    throw Error("Invalid amount");
  const negative = value.trim().startsWith("-");
  const [whole, decimal = ""] = value
    .trim()
    .replace("-", "")
    .replace(",", ".")
    .split(".");
  return (
    (negative ? -1 : 1) * (Number(whole) * 100 + Number(decimal.padEnd(2, "0")))
  );
}
async function client() {
  return (await import("./cloud-client")).cloudClient();
}
export async function commissionAccess() {
  const r = await (await client()).rpc("uzta_commission_access");
  if (r.error || typeof r.data !== "boolean") throw Error("commissions");
  return r.data;
}
export async function commissionSettings(rate?: number) {
  const r = await (
    await client()
  ).rpc("uzta_commission_settings", { p_rate: rate ?? null });
  if (r.error) throw Error("commissions");
  return z
    .object({ rate_bps: z.number().int(), commercial_reviewed: z.boolean() })
    .parse(r.data);
}
// Bounded pages on demand; no polling. Date filters use UTC day bounds on completion date.
export async function commissionPage(
  from: string,
  to: string,
  seller: string,
  page: number,
) {
  const api = await client();
  let q = api
    .from("uzta_sales")
    .select("*")
    .order("completed_at", { ascending: false })
    .order("id");
  if (from) q = q.gte("completed_at", from + "T00:00:00Z");
  if (to)
    q = q.lt(
      "completed_at",
      new Date(new Date(to + "T00:00:00Z").getTime() + 86400000).toISOString(),
    );
  if (seller) q = q.eq("seller_id", z.string().uuid().parse(seller));
  const r = await q.range(page * 50, page * 50 + 49);
  if (r.error) throw Error("commissions");
  const sales = z.array(saleSchema).parse(r.data);
  if (!sales.length) return { sales, events: [] as CommissionEvent[] };
  const events: CommissionEvent[] = [];
  for (let offset = 0; ; offset += 1000) {
    const e = await api
      .from("uzta_commission_events")
      .select("id,sale_id,kind,amount_cents,reference,created_at")
      .in(
        "sale_id",
        sales.map((s) => s.id),
      )
      .order("created_at")
      .order("id")
      .range(offset, offset + 999);
    if (e.error) throw Error("commissions");
    const rows = z.array(eventSchema).parse(e.data);
    events.push(...rows);
    if (rows.length < 1000) break;
  }
  return { sales, events };
}
export async function declareSale(id: string) {
  const r = await (await client()).rpc("uzta_declare_sale", { p_sale: id });
  if (r.error) throw Error("commissions");
}
export async function commissionAction(
  id: string,
  sale: string,
  kind: string,
  amount: number,
  reference: string,
) {
  if (!Number.isSafeInteger(amount)) throw Error("amount");
  const r = await (
    await client()
  ).rpc("uzta_commission_action", {
    p_id: id,
    p_sale: sale,
    p_kind: kind,
    p_amount: amount,
    p_reference: reference,
  });
  if (r.error) throw Error("commissions");
}

const summarySchema = z.object({
  seller_id: z.string().uuid(),
  seller_label: z.string(),
  currency: z.literal("EUR"),
  completed_count: cents.nonnegative(),
  declared_count: cents.nonnegative(),
  gross_cents: cents.nonnegative(),
  calculated_cents: cents.nonnegative(),
  pending_cents: cents.nonnegative(),
  collected_cents: cents.nonnegative(),
});
export type CommissionSummary = z.infer<typeof summarySchema>;
export async function commissionSummary(
  from: string,
  to: string,
  seller: string,
) {
  const r = await (
    await client()
  ).rpc("uzta_commission_summary", {
    p_from: from ? from + "T00:00:00Z" : null,
    p_to: to
      ? new Date(new Date(to + "T00:00:00Z").getTime() + 86400000).toISOString()
      : null,
    p_seller: seller || null,
  });
  if (r.error) throw Error("commissions");
  return z.array(summarySchema).parse(r.data);
}
