import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShareStore } from "./share-store";
import { AppRecovery } from "./app-recovery";
import { producerPublicUrl } from "../lib/public-links";
const ID = "00000000-0000-4000-8000-000000000001";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test("public links are pinned to UZTA and exclude current session and preview query parameters", () => {
  expect(producerPublicUrl(ID)).toBe(
    `https://uzta-nu.vercel.app/productor?tienda=${ID}`,
  );
  expect(() => producerPublicUrl("urki")).toThrow(/demostración/);
  expect(() => producerPublicUrl(`${ID}&token=secret`)).toThrow();
});
test("sharing falls back to a canonical copyable URL when device sharing is unavailable", async () => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
  render(<ShareStore id={ID} name="Mi tienda" demo={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartir tienda" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent("Mi tienda");
  fireEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));
  expect(await screen.findByRole("status")).toHaveTextContent("Enlace copiado");
  expect(copy).toHaveBeenCalledWith(producerPublicUrl(ID));
});
test("clipboard failure never claims the link was copied", async () => {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(Error("denied")) },
  });
  render(<ShareStore id={ID} name="Mi tienda" demo={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartir tienda" }));
  fireEvent.click(await screen.findByRole("button", { name: /Copiar enlace/ }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "No se pudo copiar",
  );
});
test("cancelling the device share sheet sends no further action", async () => {
  const share = vi
    .fn()
    .mockRejectedValue(new DOMException("cancelled", "AbortError"));
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  render(<ShareStore id={ID} name="Mi tienda" demo={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartir tienda" }));
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Compartir tienda" }),
    ).not.toBeDisabled(),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(share).toHaveBeenCalledWith({
    title: "Mi tienda",
    text: "Mi tienda · UZTA",
    url: producerPublicUrl(ID),
  });
});
test("a fictitious store never opens the device share sheet or exposes an invalid public link", async () => {
  const share = vi.fn();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  render(<ShareStore id="urki" name="Tienda de ejemplo" demo />);
  fireEvent.click(screen.getByRole("button", { name: "Compartir tienda" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "tienda ficticia",
  );
  expect(share).not.toHaveBeenCalled();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
test("screen recovery preserves stored data and allows a retry", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.setItem("retained-test", "saved");
  let fail = true;
  function Broken() {
    if (fail) throw Error("private internal detail");
    return <p>Pantalla recuperada</p>;
  }
  render(
    <AppRecovery>
      <Broken />
    </AppRecovery>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudo mostrar");
  expect(screen.queryByText("private internal detail")).not.toBeInTheDocument();
  expect(localStorage.getItem("retained-test")).toBe("saved");
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Reintentar pantalla" }));
  expect(screen.getByText("Pantalla recuperada")).toBeInTheDocument();
  localStorage.removeItem("retained-test");
});
