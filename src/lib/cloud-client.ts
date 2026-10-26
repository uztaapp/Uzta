import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import config from "../../config/uzta-cloud.public.json";
export const UZTA_PROJECT = "abgysktjctrxfkcejjwu";
export const UZTA_ORIGIN = `https://${UZTA_PROJECT}.supabase.co`;
let instance: SupabaseClient | undefined;
export function cloudClient() {
  if (
    config.url !== UZTA_ORIGIN ||
    config.projectRef !== UZTA_PROJECT ||
    !config.publishableKey.startsWith("sb_publishable_")
  )
    throw Error("La configuración no corresponde al proyecto propio de UZTA.");
  return (instance ??= createClient(UZTA_ORIGIN, config.publishableKey, {
    auth: {
      storageKey: `uzta.auth.${UZTA_PROJECT}.v1`,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }));
}
export function authReturnUrl() {
  const allowed = ["https://uzta-nu.vercel.app", "http://127.0.0.1:5178"];
  if (!allowed.includes(window.location.origin))
    throw Error(
      "Abre UZTA desde su dirección publicada o el entorno local autorizado.",
    );
  return `${window.location.origin}/`;
}
