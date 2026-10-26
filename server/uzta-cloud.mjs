import config from "../config/uzta-cloud.public.json" with { type: "json" };
import {
  createScopedSupabase,
  LocalApiError,
} from "./supabase-adapter-core.mjs";
export const UZTA_ORIGIN = "https://abgysktjctrxfkcejjwu.supabase.co";
export function createUztaCloud(options = {}) {
  if (
    config.url !== UZTA_ORIGIN ||
    config.projectRef !== "abgysktjctrxfkcejjwu" ||
    (options.url !== undefined && options.url !== UZTA_ORIGIN)
  )
    throw new LocalApiError(
      "Solo se permite el proyecto de Supabase propio de UZTA.",
    );
  return createScopedSupabase({
    ...options,
    url: UZTA_ORIGIN,
    publishableKey: options.publishableKey ?? config.publishableKey,
    allowedOrigin: UZTA_ORIGIN,
    issuerAliases: [],
  });
}
