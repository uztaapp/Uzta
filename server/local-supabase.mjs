import {
  createScopedSupabase,
  LocalApiError,
} from "./supabase-adapter-core.mjs";
export { LocalApiError };
export const LOCAL_ORIGIN = "http://127.0.0.1:55431";
export function assertLocalOrigin(value) {
  if (value !== LOCAL_ORIGIN)
    throw new LocalApiError(
      "Solo se permite Supabase local de UZTA en 127.0.0.1:55431.",
    );
  return value;
}
export function createLocalSupabase(options = {}) {
  const url = options.url ?? LOCAL_ORIGIN;
  assertLocalOrigin(url);
  return createScopedSupabase({
    ...options,
    url,
    allowedOrigin: LOCAL_ORIGIN,
    issuerAliases: ["http://localhost:55431/auth/v1"],
    connectionError:
      "No se puede contactar Supabase local. Comprueba que Docker y la pila de UZTA estén en marcha.",
  });
}
