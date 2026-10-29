import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProducerDashboard } from "./producer-dashboard";
import { AppContext, type AppContextValue } from "../app-context";
import { seedStore } from "../lib/local-model";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
function mount(owner: string | null, empty = false) {
  const data = seedStore();
  if (empty) {
    data.products = [];
    data.orders = [];
  }
  render(
    <AppContext.Provider
      value={
        {
          data,
          managedFarmId: owner,
          mode: "cloud",
          busy: false,
        } as unknown as AppContextValue
      }
    >
      <ProducerDashboard />
    </AppContext.Provider>,
  );
}
test("buyers cannot see producer tools", () => {
  mount(null);
  expect(screen.queryByText("Gestión rápida")).toBeNull();
});
test("empty stores show honest empty states", () => {
  mount("urki", true);
  expect(
    screen.getByText("Todavía no tienes productos publicados."),
  ).toBeInTheDocument();
  expect(screen.getByText("No hay pedidos todavía")).toBeInTheDocument();
});
test("seller actions retain existing destinations", () => {
  mount("urki");
  expect(
    screen.getAllByRole("link", { name: /Añadir producto/ })[0],
  ).toHaveAttribute("href", "/perfil");
  expect(screen.getByText("Productos activos")).toBeInTheDocument();
});
