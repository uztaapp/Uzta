import React from "react";
import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "./router";
import { STORAGE_KEY, seedStore, type LocalStore } from "./lib/local-model";
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function open(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

test("a removed product photo stays removed in order thumbnails", async () => {
  const data = seedStore();
  data.products.find((p) => p.id === "tomates")!.photo = null;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open("/pedidos");
  expect(
    screen.getByRole("img", { name: "Sin foto: Tomates" }),
  ).toBeInTheDocument();
});
test("nearby catalogue excludes other areas without storing the search coordinates", async () => {
  await open("/");
  fireEvent.click(screen.getByRole("button", { name: "Bayona" }));
  fireEvent.change(screen.getByLabelText("Latitud"), {
    target: { value: "43.45" },
  });
  fireEvent.change(screen.getByLabelText("Longitud"), {
    target: { value: "-1.46" },
  });
  fireEvent.change(screen.getByLabelText("Radio de búsqueda"), {
    target: { value: "1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar zona" }));
  expect(screen.getByRole("heading", { name: "Tomates" })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Lechuga" }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Quitar filtro de zona" }),
  );
  expect(screen.getByRole("heading", { name: "Lechuga" })).toBeInTheDocument();
});
test("profile help explains the existing buyer and producer flows without promising payments", async () => {
  await open("/perfil");
  fireEvent.click(screen.getByRole("button", { name: /Ayuda y soporte/ }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveTextContent("Cómo usar UZTA");
  expect(dialog).toHaveTextContent("Comprar al productor");
  expect(dialog).toHaveTextContent("Gestionar tu tienda");
  expect(dialog).toHaveTextContent("todavía no tramita pagos");
});

test("search and all-products expose published products that are not featured", async () => {
  const data = seedStore();
  data.products.find((p) => p.id === "hierbas")!.featured = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open("/");
  expect(
    screen.queryByRole("heading", { name: "Hierbas aromáticas" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Buscar productos"), {
    target: { value: "AROMATICAS" },
  });
  expect(
    screen.getByRole("heading", { name: "Hierbas aromáticas" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Buscar productos"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Ver todos/ }));
  expect(
    screen.getByRole("heading", { name: "Hierbas aromáticas" }),
  ).toBeInTheDocument();
});

test("an unavailable basket item must be removed or reduced before checkout", async () => {
  const data = seedStore();
  data.products[0].stock = 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open("/cesta");
  expect(
    screen.getByRole("button", { name: "Confirmar reserva" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reducir Tomates" }));
  expect(
    screen.getByRole("button", { name: "Confirmar reserva" }),
  ).not.toBeDisabled();
});
test("producer product edits affect the catalogue and survive navigation", async () => {
  await open("/perfil?apartado=productos");
  fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
  fireEvent.change(screen.getByLabelText("Precio (€)"), {
    target: { value: "3.10" },
  });
  fireEvent.change(screen.getByLabelText("Existencias"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar producto" }));
  expect(
    JSON.parse(localStorage.getItem(STORAGE_KEY)!).products[0].priceCents,
  ).toBe(310);
  cleanup();
  await open("/productor");
  expect(
    screen.getByRole("button", { name: "Añadir Tomates a la cesta" }),
  ).toBeDisabled();
});
test("pickup configuration appears in checkout without inventing availability", async () => {
  await open("/perfil?apartado=horarios");
  fireEvent.change(screen.getByLabelText("Fecha", { exact: true }), {
    target: { value: "2040-01-02" },
  });
  fireEvent.change(screen.getByLabelText("Desde", { exact: true }), {
    target: { value: "17:00" },
  });
  fireEvent.change(screen.getByLabelText("Hasta", { exact: true }), {
    target: { value: "18:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Añadir franja" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Franja de recogida añadida",
  );
  cleanup();
  await open("/cesta");
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  expect(
    screen.getByRole("option", { name: "2040-01-02 · 17:00 – 18:00" }),
  ).toBeInTheDocument();
});
test("a reservation survives a reload and can be marked collected in the producer view", async () => {
  const data = seedStore();
  data.farms[0].slots = [
    { id: "pickup", date: "2040-01-02", start: "17:00", end: "18:00" },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open("/cesta");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Recogeré la cesta por la tarde." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  fireEvent.change(screen.getByLabelText("Fecha y hora de recogida"), {
    target: { value: "pickup" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar reserva local" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Mis pedidos" }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("dialog")).toHaveTextContent("14,30");
  expect(screen.getByRole("dialog")).toHaveTextContent("Recogeré la cesta");
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as LocalStore;
  expect(saved.orders.filter((o) => !o.example)).toHaveLength(1);
  expect(saved.products[0].stock).toBe(18);
  cleanup();
  await open(`/pedidos?vista=productor&pedido=${saved.orders[0].id}`);
  fireEvent.click(
    await screen.findByRole("button", { name: "Marcar recogido" }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent("Completado");
});
test("profile edits and favorites persist independently of navigation", async () => {
  await open("/perfil");
  fireEvent.click(screen.getByRole("button", { name: "Editar perfil" }));
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Perfil de prueba" },
  });
  fireEvent.change(screen.getByLabelText("Ubicación"), {
    target: { value: "Ustaritz" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Guardar perfil" }));
  expect(
    await screen.findByRole("heading", { name: "Perfil de prueba" }),
  ).toBeInTheDocument();
  cleanup();
  await open("/");
  expect(screen.getByText("Ustaritz")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar Tomates en favoritos" }),
  );
  cleanup();
  await open("/");
  expect(
    screen.getByRole("button", { name: "Quitar Tomates en favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("failed local storage writes do not show a successful reservation or decrement stock", async () => {
  const data = seedStore();
  data.farms[0].slots = [
    { id: "pickup", date: "2040-01-02", start: "17:00", end: "18:00" },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  await open("/cesta");
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  fireEvent.change(screen.getByLabelText("Fecha y hora de recogida"), {
    target: { value: "pickup" },
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("Almacenamiento local lleno");
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Guardar reserva local" }),
  );
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "Almacenamiento local lleno",
  );
  expect(screen.getByLabelText("Cantidad de Tomates")).toHaveTextContent("2");
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).products[0].stock).toBe(
    20,
  );
});
