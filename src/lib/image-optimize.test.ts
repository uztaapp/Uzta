import { test, expect, vi, afterEach } from "vitest";
import { optimizeImage, MAX_PHOTO_BYTES } from "./image-optimize";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
test("rejects unsupported or empty images before decoding", async () => {
  const decode = vi.fn();
  vi.stubGlobal("createImageBitmap", decode);
  await expect(
    optimizeImage(new Blob(["<svg/>"], { type: "image/svg+xml" })),
  ).rejects.toThrow(/JPG/);
  await expect(
    optimizeImage(new Blob([], { type: "image/jpeg" })),
  ).rejects.toThrow(/vacía/);
  expect(decode).not.toHaveBeenCalled();
});
test("re-encodes pixels into full and thumbnail WebP images and releases decoded memory", async () => {
  const close = vi.fn();
  const draw = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  } as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
    type,
  ) {
    expect(type).toBe("image/webp");
    expect(this.width).toBeLessThanOrEqual(1280);
    expect(this.height).toBeLessThanOrEqual(720);
    callback(new Blob(["pixels"], { type: "image/webp" }));
  });
  const result = await optimizeImage(
    new Blob(["original EXIF GPS"], { type: "image/jpeg" }),
  );
  expect(result.full.type).toBe("image/webp");
  expect(result.thumb.type).toBe("image/webp");
  expect(result.full.size).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
  expect(draw).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(1);
});
test("failed encoding releases decoded memory and does not return an original photo", async () => {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 100, height: 100, close }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  await expect(
    optimizeImage(new Blob(["photo"], { type: "image/png" })),
  ).rejects.toThrow(/procesar/);
  expect(close).toHaveBeenCalledTimes(1);
});
