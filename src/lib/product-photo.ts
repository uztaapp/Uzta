import { z } from "zod";
export const productPhotoSchema = z
  .string()
  .max(670000)
  .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/)
  .nullable()
  .optional();
export function photoDataUrl(blob: Blob): Promise<string> {
  if (blob.type !== "image/webp" || blob.size > 500000 || !blob.size)
    throw Error("No se pudo preparar la fotografía.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = productPhotoSchema.safeParse(reader.result);
      result.success && typeof result.data === "string"
        ? resolve(result.data)
        : reject(Error("La fotografía no es válida."));
    };
    reader.onerror = () => reject(Error("No se pudo leer la fotografía."));
    reader.readAsDataURL(blob);
  });
}
