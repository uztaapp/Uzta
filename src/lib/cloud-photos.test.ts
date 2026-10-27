import { test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  uploadProductPhoto,
  loadProductPhotos,
  photoPath,
  signedPhotoUrl,
  PHOTO_BUCKET,
} from "./cloud-photos";
const USER = "00000000-0000-4000-8000-000000000001",
  FARM = "00000000-0000-4000-8000-000000000010",
  PRODUCT = "00000000-0000-4000-8000-000000000020",
  FILE = "00000000-0000-4000-8000-000000000030";
const PATH = `${USER}/${FARM}/${PRODUCT}/${FILE}.webp`;
const URL = `https://abgysktjctrxfkcejjwu.supabase.co/storage/v1/object/sign/${PHOTO_BUCKET}/${PATH}?token=fixture-signature`;
const PHOTO = `data:image/webp;base64,${btoa("RIFFxxxxWEBPtest-pixels")}`;
function storage() {
  const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
  const sign = vi
    .fn()
    .mockResolvedValue({
      data: [{ path: PATH, signedUrl: URL, error: null }],
      error: null,
    });
  const from = vi.fn(() => ({ upload, createSignedUrls: sign }));
  return {
    api: { storage: { from } } as unknown as SupabaseClient,
    upload,
    sign,
    from,
  };
}
test("uploads only fresh immutable WebP objects under the verified user, producer and product", async () => {
  const f = storage();
  const path = await uploadProductPhoto(f.api, USER, FARM, PRODUCT, PHOTO);
  expect(path).toMatch(
    new RegExp(`^${USER}/${FARM}/${PRODUCT}/[a-f0-9-]+\\.webp$`),
  );
  expect(f.from).toHaveBeenCalledWith(PHOTO_BUCKET);
  expect(f.upload.mock.calls[0][1].type).toBe("image/webp");
  expect(f.upload.mock.calls[0][2]).toMatchObject({
    contentType: "image/webp",
    upsert: false,
  });
});
test("unsupported content is rejected before contacting Storage", async () => {
  const f = storage();
  await expect(
    uploadProductPhoto(
      f.api,
      USER,
      FARM,
      PRODUCT,
      "data:image/webp;base64,cGl4ZWxz",
    ),
  ).rejects.toThrow(/WebP/);
  await expect(
    uploadProductPhoto(f.api, USER, FARM, PRODUCT, "https://foreign.example/x"),
  ).rejects.toThrow();
  expect(f.from).not.toHaveBeenCalled();
});
test("failed uploads report failure and never return a path that appears saved", async () => {
  const f = storage();
  f.upload.mockResolvedValueOnce({ error: { message: "offline" }, data: null });
  await expect(
    uploadProductPhoto(f.api, USER, FARM, PRODUCT, PHOTO),
  ).rejects.toThrow(/no se ha guardado/);
});
test("signed URLs are bounded to the UZTA private photo bucket", () => {
  expect(signedPhotoUrl(URL)).toBe(URL);
  expect(() =>
    signedPhotoUrl(
      URL.replace("abgysktjctrxfkcejjwu.supabase.co", "foreign.example"),
    ),
  ).toThrow();
  expect(() =>
    signedPhotoUrl(URL.replace("?token=fixture-signature", "")),
  ).toThrow();
  expect(() => photoPath(`${USER}/../../x.webp`)).toThrow();
});
test("signing deduplicates references, uses a short lifetime and ignores foreign results", async () => {
  const f = storage();
  const result = await loadProductPhotos(f.api, [PATH, PATH, "invalid"]);
  expect(f.sign).toHaveBeenCalledWith([PATH], 900);
  expect(result.get(PATH)).toBe(URL);
  f.sign.mockResolvedValueOnce({
    data: [
      {
        path: PATH,
        signedUrl: URL.replace(
          "abgysktjctrxfkcejjwu.supabase.co",
          "foreign.example",
        ),
      },
    ],
    error: null,
  });
  expect((await loadProductPhotos(f.api, [PATH])).size).toBe(0);
});
test("an unavailable photo service degrades to placeholders without failing the catalogue", async () => {
  const f = storage();
  f.sign.mockRejectedValueOnce(Error("offline"));
  expect((await loadProductPhotos(f.api, [PATH])).size).toBe(0);
  await loadProductPhotos(f.api, []);
  expect(f.sign).toHaveBeenCalledTimes(1);
});
