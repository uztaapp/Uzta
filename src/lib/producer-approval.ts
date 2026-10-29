import { z } from "zod";
import config from "../../config/uzta-cloud.public.json";
import { cloudClient } from "./cloud-client";
import type { LocalStore } from "./local-model";
export const accessSchema = z.object({
  approved: z.boolean(),
  admin: z.boolean(),
  status: z.enum(["pending", "approved", "rejected", "revoked"]).nullable(),
});
export function canManageProducer(data: LocalStore, owned: string | null) {
  return config.producerApprovalsReady
    ? data.producerAccess?.approved === true
    : !!owned;
}
export const applicationSchema = z.object({
  activity: z.string().trim().min(1).max(100),
  locality: z.string().trim().min(1).max(200),
  production: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2000),
});
export const requestRow = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  applicant_name: z.string(),
  activity_name: z.string(),
  locality: z.string(),
  production_type: z.string(),
  description: z.string(),
  status: z.enum(["pending", "approved", "rejected", "revoked"]),
  created_at: z.string(),
  reason: z.string(),
  legacy: z.boolean(),
});
export type ProducerRequest = z.infer<typeof requestRow>;
export async function sendProducerRequest(
  value: z.infer<typeof applicationSchema>,
) {
  const v = applicationSchema.parse(value);
  const r = await cloudClient().rpc("uzta_request_producer", {
    p_activity: v.activity,
    p_locality: v.locality,
    p_type: v.production,
    p_description: v.description,
  });
  if (r.error) throw Error("No se pudo enviar la solicitud.");
}
export async function loadProducerRequests() {
  const r = await cloudClient()
    .from("uzta_producer_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (r.error) throw Error("No se pudieron cargar las solicitudes.");
  return z.array(requestRow).parse(r.data);
}
export async function reviewProducerRequest(
  id: string,
  action: "approved" | "rejected" | "revoked",
  reason: string,
) {
  z.uuid().parse(id);
  const r = await cloudClient().rpc("uzta_review_producer", {
    p_id: id,
    p_action: action,
    p_reason: reason.trim().slice(0, 300),
  });
  if (r.error) throw Error("No se pudo actualizar la solicitud.");
}
