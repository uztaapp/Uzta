import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "./router";
import { seedStore, STORAGE_KEY } from "./lib/local-model";
import { setLanguage, t, type Language } from "./lib/language";
import type { ExploreEntry } from "./lib/explore";
vi.mock("./components/producer-map", () => ({
  default: ({
    entries,
    onSelect,
  }: {
    entries: ExploreEntry[];
    onSelect: (entry: ExploreEntry) => void;
  }) => (
    <div aria-label="Mapa de prueba">
      {entries
        .filter((e) => e.farm.position)
        .map((e) => (
          <button key={e.farm.id} onClick={() => onSelect(e)}>
            Marcador {e.farm.name}
          </button>
        ))}
    </div>
  ),
}));
beforeEach(() => {
  localStorage.clear();
  setLanguage("es");
});
afterEach(() => {
  cleanup();
  setLanguage("es");
  vi.unstubAllGlobals();
});
async function open() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/explorar"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: t("Explorar"), level: 1 });
  await screen.findByLabelText("Mapa de prueba");
}
test("map selection opens a closable store card; list shares the search", async () => {
  await open();
  fireEvent.click(
    screen.getByRole("button", { name: "Marcador Ferme de l’Urki" }),
  );
  expect(
    screen.getByRole("link", { name: /Ferme de l’Urki.*Ver productos/ }),
  ).toHaveAttribute("href", "/productor?tienda=urki");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar tarjeta" }));
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Buscar productos, productores o localidades",
    }),
    { target: { value: "aromaticas" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "LISTA" }));
  expect(
    screen.getByRole("region", { name: "Lista de productores" }),
  ).toHaveTextContent("Ferme Borda");
  expect(
    screen.queryByRole("link", { name: /Ferme de l’Urki.*Ver productos/ }),
  ).not.toBeInTheDocument();
});
test("seller types filter the same map and list without guessing legacy types", async () => {
  const data = seedStore();
  data.farms[0].sellerType = "professional";
  data.farms[1].sellerType = "private";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Particulares" }));
  expect(
    screen.getByRole("button", { name: "Marcador Les Poules Heureuses" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Marcador Ferme de l’Urki" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "LISTA" }));
  expect(
    screen.getByRole("region", { name: "Lista de productores" }),
  ).toHaveTextContent("Les Poules Heureuses");
  fireEvent.click(screen.getByRole("button", { name: "Agricultores" }));
  expect(
    screen.getByRole("region", { name: "Lista de productores" }),
  ).toHaveTextContent("Ferme de l’Urki");
  expect(
    screen.getByRole("region", { name: "Lista de productores" }),
  ).not.toHaveTextContent("Les Poules Heureuses");
});

test("missing public coordinates show a truthful map notice and preserve list access", async () => {
  const data = seedStore();
  data.farms.forEach((f) => (f.position = null));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open();
  expect(
    screen.getByText(/todavía no tienen coordenadas públicas/),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Marcador/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "LISTA" }));
  expect(
    screen.getByRole("region", { name: "Lista de productores" }),
  ).toHaveTextContent("Ferme de l’Urki");
});
test("location is requested only on click and denied permission leaves filters usable", async () => {
  const getCurrentPosition = vi.fn((_ok, error) => error({ code: 1 }));
  const prior = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  try {
    await open();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Centrar en mi ubicación" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo obtener");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
  } finally {
    if (prior) Object.defineProperty(navigator, "geolocation", prior);
    else Reflect.deleteProperty(navigator, "geolocation");
  }
});

test.each([
  ["fr", "Particuliers"],
  ["en", "Private sellers"],
  ["eu", "Partikularrak"],
])(
  "seller controls use %s translations without translating stored identifiers",
  async (language, label) => {
    setLanguage(language as Language);
    const data = seedStore();
    data.farms[0].sellerType = "private";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    await open();
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(
      screen.getByRole("button", { name: "Marcador Ferme de l’Urki" }),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).farms[0].sellerType,
    ).toBe("private");
  },
);
