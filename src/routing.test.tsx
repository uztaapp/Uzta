import React from "react";
import { test, expect, afterEach, beforeEach, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "./router";
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
test("all five direct routes render offline, without any backend request", async () => {
  const network = vi.fn(() => {
    throw new Error("Unexpected network request");
  });
  vi.stubGlobal("fetch", network);
  for (const [path, title] of [
    ["/", "Inicio"],
    ["/productor", "Ferme de l’Urki"],
    ["/cesta", "Cesta de compra"],
    ["/pedidos", "Mis pedidos"],
    ["/perfil", "Mi perfil"],
  ]) {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    await router.load();
    render(<RouterProvider router={router} />);
    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    if (path !== "/productor")
      expect(
        screen
          .getAllByRole("link", {
            name:
              (
                {
                  "Cesta de compra": "Cesta",
                  "Mis pedidos": "Pedidos",
                  "Mi perfil": "Perfil",
                } as Record<string, string>
              )[title] ?? title,
          })
          .some((x) => x.getAttribute("aria-current") === "page"),
      ).toBe(true);
    else
      expect(screen.getByRole("link", { name: "Explorar" })).toHaveAttribute(
        "href",
        "/explorar",
      );
    cleanup();
  }
  expect(network).not.toHaveBeenCalled();
});
test("navigation reaches basket and browser back restores home", async () => {
  const history = createMemoryHistory({ initialEntries: ["/"] });
  const router = createRouter({ routeTree, history });
  await router.load();
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("link", { name: "Cesta" }));
  expect(
    await screen.findByRole("heading", { level: 1, name: "Cesta de compra" }),
  ).toBeInTheDocument();
  history.back();
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { level: 1, name: "Inicio" }),
    ).toBeInTheDocument(),
  );
});

test("basket quantities update the total locally", async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/cesta"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  expect(await screen.findByLabelText("Total de productos")).toHaveTextContent(
    "14,30",
  );
  fireEvent.click(screen.getByRole("button", { name: "Aumentar Tomates" }));
  expect(screen.getByLabelText("Total de productos")).toHaveTextContent(
    "17,10",
  );
  fireEvent.click(screen.getByRole("button", { name: "Eliminar Tomates" }));
  expect(screen.getByLabelText("Total de productos")).toHaveTextContent("8,70");
});
