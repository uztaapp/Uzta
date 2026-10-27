import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { productPhotoSchema } from "./product-photo";
export const PHOTO_BUCKET = "uzta-product-photos";
const ORIGIN = "https://abgysktjctrxfkcejjwu.supabase.co";
const uuid = z.uuid();
const pathSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i);
export function photoPath(path: string) {
  pathSchema.parse(path);
  const pieces = path.split("/");
  pieces.forEach((p, i) => uuid.parse(i === 3 ? p.slice(0, -5) : p));
  return path;
}
export function signedPhotoUrl(value: string) {
  const url = new URL(value);
  if (
    url.origin !== ORIGIN ||
    !url.pathname.startsWith(`/storage/v1/object/sign/${PHOTO_BUCKET}/`) ||
    url.username ||
    url.password ||
    url.hash ||
    !url.searchParams.get("token")
  )
    throw Error("La fotografía no pertenece al almacenamiento de UZTA.");
  photoPath(
    decodeURIComponent(
      url.pathname.slice(`/storage/v1/object/sign/${PHOTO_BUCKET}/`.length),
    ),
  );
  return url.href;
}
export async function uploadProductPhoto(
  api: SupabaseClient,
  userId: string,
  farmId: string,
  productId: string,
  dataUrl: string,
) {
  uuid.parse(userId);
  uuid.parse(farmId);
  uuid.parse(productId);
  const source = productPhotoSchema.parse(dataUrl);
  if (!source) throw Error("No se ha seleccionado una fotografía.");
  const bytes = Uint8Array.from(atob(source.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  if (
    bytes.length > 500000 ||
    bytes.length < 12 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  )
    throw Error("La fotografía procesada no es un WebP válido.");
  const path = photoPath(
    `${userId}/${farmId}/${productId}/${crypto.randomUUID()}.webp`,
  );
  const result = await api.storage
    .from(PHOTO_BUCKET)
    .upload(path, new Blob([bytes], { type: "image/webp" }), {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "3600",
    });
  if (result.error)
    throw Error(
      "No se pudo subir la fotografía. El producto todavía no se ha guardado.",
    );
  return path;
}
export async function loadProductPhotos(api: SupabaseClient, paths: string[]) {
  const unique = [...new Set(paths)].filter((path) => {
    try {
      photoPath(path);
      return true;
    } catch {
      return false;
    }
  });
  const result = new Map<string, string>();
  if (!unique.length) return result;
  // Signed links are temporary and never persisted in the database or shared links.
  try {
    const response = await api.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(unique, 900);
    if (response.error) return result;
    for (const row of response.data ?? []) {
      if (
        row.error ||
        !row.path ||
        !row.signedUrl ||
        !unique.includes(row.path)
      )
        continue;
      try {
        result.set(row.path, signedPhotoUrl(row.signedUrl));
      } catch {
        /* Keep a neutral placeholder for an invalid response. */
      }
    }
    return result;
  } catch {
    return result;
  }
}
