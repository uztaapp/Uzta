import React from "react";
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  act,
} from "@testing-library/react";
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "../router";
import { selectBuyerLocality } from "../lib/buyer-location";
vi.mock("./notification-bell", () => ({
  NotificationBell: () => <button aria-label="Notificaciones">Avisos</button>,
}));
beforeEach(() => {
  localStorage.clear();
  selectBuyerLocality("");
});
afterEach(cleanup);
async function open(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
test("one persistent logo; bell only at home; seller actions occupy the shared row", async () => {
  const router = await open("/");
  const logo = screen.getByRole("img", { name: "UZTA" });
  expect(
    screen.getByRole("button", { name: "Notificaciones" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Abrir cesta" })).toBeNull();
  await act(async () => {
    await router.navigate({ to: "/productor", search: { tienda: "urki" } });
  });
  expect(screen.getByRole("img", { name: "UZTA" })).toBe(logo);
  expect(logo).toHaveAttribute("width", "128");
  expect(screen.queryByRole("button", { name: "Notificaciones" })).toBeNull();
  expect(
    screen.getAllByRole("link", { name: "Volver al inicio" }),
  ).toHaveLength(1);
  expect(
    screen
      .getByRole("button", { name: "Compartir tienda" })
      .closest(".app-header-actions"),
  ).not.toBeNull();
  expect(
    screen
      .getByRole("button", { name: /Guardar en favoritos: Ferme/ })
      .closest(".app-header-actions"),
  ).not.toBeNull();
});
test("profile settings stay functional in the header and nested back links return to their parent", async () => {
  const router = await open("/perfil?apartado=cuenta");
  const settings = screen.getByRole("button", {
    name: "Editar perfil",
  });
  expect(settings.closest(".app-header-actions")).not.toBeNull();
  fireEvent.click(settings);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
  await act(async () => {
    await router.navigate({ to: "/perfil", search: { apartado: "favoritos" } });
  });
  expect(
    screen.getByRole("link", { name: "Volver al perfil" }),
  ).toHaveAttribute("href", "/perfil?apartado=cuenta");
  expect(screen.queryByRole("button", { name: "Notificaciones" })).toBeNull();
});
test("all thirteen pictured categories filter and toggle without removing Others from publishing", async () => {
  await open("/");
  const carousel = screen.getByLabelText("Categorías");
  const buttons = within(carousel).getAllByRole("button");
  expect(buttons).toHaveLength(13);
  for (const name of [
    "Pan",
    "Carne",
    "Aves",
    "Aceite",
    "Vino",
    "Conservas",
    "Plantas",
    "Flores",
  ]) {
    const button = within(carousel).getByRole("button", { name });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Tomates" })).toBeNull();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("heading", { name: "Tomates" }),
    ).toBeInTheDocument();
  }
  expect(within(carousel).queryByRole("button", { name: "Otros" })).toBeNull();
});
test("Explore retains its map header and no shared logo or notification controls", async () => {
  await open("/explorar");
  await screen.findByRole("heading", { name: "Explorar" });
  expect(document.querySelector(".app-header")).toBeNull();
  expect(screen.queryByRole("img", { name: "UZTA" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Notificaciones" })).toBeNull();
});
