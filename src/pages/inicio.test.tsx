import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Inicio } from "./inicio";
import { AppContext, type AppContextValue } from "../app-context";
import { emptyCloudData } from "../lib/cloud-data";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
function home(error = "", withProduct = false) {
  const data = emptyCloudData();
  if (withProduct) {
    data.farms = [
      {
        id: "farm",
        name: "Tienda registrada",
        location: "Bayona",
        description: "",
        ecological: false,
        distance: "",
        slots: [],
      },
    ];
    data.products = [
      {
        id: "product",
        farmId: "farm",
        name: "Producto registrado",
        priceCents: 250,
        unit: "kg",
        stock: 9,
        active: true,
        featured: false,
        category: "Verduras",
        crop: [0, 0, 0, 0],
      },
    ];
  }
  render(
    <AppContext.Provider
      value={
        {
          data,
          mode: "cloud",
          busy: false,
          storageError: error,
          run: vi.fn(),
          show: vi.fn(),
        } as unknown as AppContextValue
      }
    >
      <Inicio />
    </AppContext.Provider>,
  );
}
test("home displays active Supabase products even when they are not featured", () => {
  home("", true);
  expect(screen.getByText("Producto registrado")).toBeInTheDocument();
});
test("empty catalogue offers explore and publish actions", () => {
  home();
  expect(
    screen.getByText("Todavía no hay productos publicados."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Publicar productos" }),
  ).toHaveAttribute("href", "/perfil");
});
test("catalogue error is never presented as an empty result", () => {
  home("Connection failed");
  expect(
    screen.queryByText("Todavía no hay productos publicados."),
  ).not.toBeInTheDocument();
});
