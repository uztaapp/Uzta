// Client-side photo optimizer: re-encodes through a canvas, which drops all EXIF/GPS metadata.
export const MAX_SIDE = 1280;
export const MAX_SHORT_SIDE = 720;
export const THUMB_SIDE = 720;
export const QUALITY = 0.8;
export const MAX_PHOTO_BYTES = 500_000;

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Applies EXIF orientation to the pixels so the photo stays upright.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error("No se pudo leer esta foto. Prueba con una JPG o PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function encode(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
  card = false,
): Promise<Blob> {
  const w = source.width,
    h = source.height;
  // Cards already crop to landscape. Crop before resizing so portrait photos
  // do not waste their thumbnail pixels outside the visible card.
  const cropWidth = card ? Math.min(w, h * 1.5) : w;
  const cropHeight = card ? Math.min(h, w / 1.5) : h;
  const scale = Math.min(
    1,
    maxSide / Math.max(cropWidth, cropHeight),
    MAX_SHORT_SIDE / Math.min(cropWidth, cropHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la foto.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    source,
    (w - cropWidth) / 2,
    (h - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo procesar la foto.")),
      "image/webp",
      quality,
    );
  });
}

export async function optimizeImage(
  file: Blob,
): Promise<{ full: Blob; thumb: Blob }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elige una fotografía JPG, PNG o WebP.");
  if (!file.size) throw new Error("La fotografía está vacía.");
  if (file.size > 40_000_000) throw new Error("La foto es demasiado grande.");
  const src = await decode(file);
  try {
    const full = await encodeLimited(src, MAX_SIDE, QUALITY);
    const thumb = await encodeLimited(src, THUMB_SIDE, 0.85, true);
    return { full, thumb };
  } finally {
    if ("close" in src) src.close();
  }
}

/** Preserve dimensions first, then reduce pixels if quality alone cannot meet the cap. */
async function encodeLimited(
  src: ImageBitmap | HTMLImageElement,
  side: number,
  quality: number,
  card = false,
) {
  let result = await encode(src, side, quality, card);
  for (const q of [0.72, 0.64]) {
    if (result.size <= MAX_PHOTO_BYTES) return result;
    result = await encode(src, side, q, card);
  }
  while (result.size > MAX_PHOTO_BYTES && side > 320) {
    side = Math.max(320, Math.floor(side * 0.8));
    result = await encode(src, side, 0.64, card);
  }
  if (result.size > MAX_PHOTO_BYTES)
    throw new Error("No se pudo procesar la foto.");
  return result;
}

export const thumbPath = (path: string) =>
  path.replace(/\.[a-z0-9]+$/i, "") + ".thumb.webp";
