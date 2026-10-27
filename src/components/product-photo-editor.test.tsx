import React, { useState } from "react";
import { test, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { ProductPhotoEditor } from "./product-photo-editor";
import { seedStore, transition, storeSchema } from "../lib/local-model";
import { productPhotoSchema } from "../lib/product-photo";
const optimizer = vi.hoisted(() => vi.fn());
vi.mock("../lib/image-optimize", () => ({ optimizeImage: optimizer }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const PHOTO = "data:image/webp;base64,cGl4ZWxz";
function Editor() {
  const [product, setProduct] = useState(seedStore().products[0]);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <ProductPhotoEditor
        product={product}
        onChange={(photo) => setProduct((p) => ({ ...p, photo }))}
        onPending={setBusy}
      />
      <output>
        {product.photo === null ? "Sin imagen" : (product.photo ?? "Original")}
      </output>
      <button disabled={busy}>Guardar prueba</button>
    </>
  );
}
test("processed selection is previewed and can be removed before saving", async () => {
  optimizer.mockResolvedValue({
    full: new Blob(["pixels"], { type: "image/webp" }),
  });
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Elegir fotografía"), {
    target: { files: [new File(["raw"], "foto.jpg", { type: "image/jpeg" })] },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Guardar prueba" }),
    ).not.toBeDisabled(),
  );
  expect(screen.getByRole("img")).toHaveAttribute("src", PHOTO);
  fireEvent.click(screen.getByRole("button", { name: "Retirar fotografía" }));
  expect(screen.getByRole("status")).toHaveTextContent("Sin imagen");
});
test("processing failure preserves the original and allows saving other fields", async () => {
  optimizer.mockRejectedValueOnce(Error("La foto no es válida."));
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Elegir fotografía"), {
    target: { files: [new File(["bad"], "bad.jpg", { type: "image/jpeg" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("no es válida");
  expect(screen.getByRole("status")).toHaveTextContent("Original");
  expect(
    screen.getByRole("button", { name: "Guardar prueba" }),
  ).not.toBeDisabled();
});
test("closing while processing ignores its late result and releases the form lock", async () => {
  let finish: (v: any) => void = () => {};
  optimizer.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const changed = vi.fn(),
    pending = vi.fn();
  const view = render(
    <ProductPhotoEditor
      product={seedStore().products[0]}
      onChange={changed}
      onPending={pending}
    />,
  );
  fireEvent.change(screen.getByLabelText("Elegir fotografía"), {
    target: { files: [new File(["raw"], "foto.jpg", { type: "image/jpeg" })] },
  });
  view.unmount();
  await act(async () => {
    finish({ full: new Blob(["pixels"], { type: "image/webp" }) });
  });
  expect(changed).not.toHaveBeenCalled();
  expect(pending).toHaveBeenLastCalledWith(false);
});
test("photo persists with product edits and old saves remain compatible", () => {
  const data = seedStore();
  expect(storeSchema.safeParse(data).success).toBe(true);
  const next = transition(data, {
    type: "product",
    value: { ...data.products[0], photo: PHOTO },
  });
  expect(
    storeSchema.parse(JSON.parse(JSON.stringify(next))).products[0].photo,
  ).toBe(PHOTO);
  expect(
    productPhotoSchema.safeParse("https://foreign.example/photo.jpg").success,
  ).toBe(false);
  expect(
    productPhotoSchema.safeParse("data:image/svg+xml;base64,AAAA").success,
  ).toBe(false);
});
