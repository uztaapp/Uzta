import React, { useState } from "react";
import { test, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { FavoriteButton, MyFavorites } from "./favorites";
import { AppContext, type AppContextValue } from "../app-context";
import { seedStore, transition } from "../lib/local-model";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...rest }: any) => (
    <a href={to + "?" + new URLSearchParams(search)} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("./access", () => ({ Access: () => <p>Acceso existente</p> }));
afterEach(cleanup);
function Harness({ guest = false }: { guest?: boolean }) {
  const [data, setData] = useState(() => ({
    ...seedStore(),
    sessionActive: !guest,
  }));
  return (
    <AppContext.Provider
      value={
        {
          data,
          mode: "demo",
          busy: false,
          run: async (command) => {
            setData((previous) => transition(previous, command));
            return true;
          },
        } as AppContextValue
      }
    >
      <FavoriteButton id="tomates" name="Tomates" />
      <FavoriteButton id="tomates" name="Ficha" />
      <FavoriteButton target="seller" id="urki" name="Urki" />
      <MyFavorites />
    </AppContext.Provider>
  );
}
test("product hearts synchronize and can remove from profile", async () => {
  render(<Harness />);
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar en favoritos: Tomates" }),
  );
  expect(
    screen.getByRole("button", { name: "Quitar de favoritos: Ficha" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("link", { name: "Tomates" })).toBeInTheDocument();
  fireEvent.click(
    screen
      .getAllByRole("button", { name: "Quitar de favoritos: Tomates" })
      .at(-1)!,
  );
  expect(
    screen.getByRole("button", { name: "Guardar en favoritos: Ficha" }),
  ).toHaveAttribute("aria-pressed", "false");
});
test("sellers share profile list and removal", () => {
  render(<Harness />);
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar en favoritos: Urki" }),
  );
  fireEvent.click(
    screen.getByRole("tab", { name: "Productores y particulares" }),
  );
  expect(screen.getByRole("link")).toBeInTheDocument();
  fireEvent.click(
    screen.getAllByRole("button", { name: /Quitar de favoritos/ }).at(-1)!,
  );
  expect(screen.getByText("Todavía no tienes favoritos.")).toBeInTheDocument();
});
test("guest keeps current page and receives existing login form", () => {
  render(<Harness guest />);
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar en favoritos: Tomates" }),
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByText("Acceso existente")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Guardar en favoritos: Ficha" }),
  ).toHaveAttribute("aria-pressed", "false");
});
