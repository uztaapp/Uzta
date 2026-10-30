import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ProducerDashboard } from "./producer-dashboard";
import { AppContext, type AppContextValue } from "../app-context";
import { emptyMarkets } from "../lib/markets";
import { setLanguage, t } from "../lib/language";
import { producerActivityLabels } from "../lib/producer-activity-labels";
import { seedStore } from "../lib/local-model";
const marketState = vi.hoisted(() => ({
  data: null as ReturnType<typeof emptyMarkets> | null,
  error: "",
  loading: false,
}));
vi.mock("./market-data", () => ({
  useMarkets: () => ({
    ...marketState,
    data: marketState.data ?? emptyMarkets(),
    reload: vi.fn(),
  }),
}));
vi.mock("./notification-bell", () => ({
  NotificationBell: () => <button aria-label="Notificaciones" />,
}));
vi.mock("./market-manager", () => ({
  MarketManager: () => <p>Existing market manager</p>,
}));
vi.mock("../pages/gestion", () => ({
  Gestion: ({ section, create }: any) => (
    <p>
      {section}:{String(create)}
    </p>
  ),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...props }: any) => (
    <a
      href={to + (search ? "?" + new URLSearchParams(search).toString() : "")}
      {...props}
    >
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  marketState.data = null;
  marketState.error = "";
  marketState.loading = false;
  setLanguage("es");
});
function mount(
  owner: string | null,
  empty = false,
  update = (_data: ReturnType<typeof seedStore>) => {},
  section = "panel",
) {
  const data = seedStore();
  data.producerAccess = {
    approved: !!owner,
    admin: false,
    status: owner ? "approved" : null,
  };
  if (empty) {
    data.products = [];
    data.orders = [];
  }
  update(data);
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
      <ProducerDashboard section={section} />
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
    screen.getByText("Todo al día. No tienes tareas pendientes."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Productos activos/ }),
  ).toHaveTextContent("0");
});
test("seller actions retain existing destinations", () => {
  mount("urki");
  expect(
    screen.getAllByRole("link", { name: /Añadir producto/ })[0],
  ).toHaveAttribute("href", "/perfil?apartado=nuevo");
  expect(screen.getByText("Productos activos")).toBeInTheDocument();
});

test("real activity counters are scoped to the managed farm and exclude example orders", () => {
  mount("urki", true, (data) => {
    const base = seedStore();
    data.products = [
      { ...base.products[0], farmId: "urki", stock: 0 },
      { ...base.products[0], id: "other", farmId: "another", active: true },
    ];
    const order = { ...base.orders[0], farmId: "urki", example: false };
    data.orders = [
      { ...order, id: "pending", status: "Pendiente" },
      { ...order, id: "completed", status: "Completado" },
      { ...order, id: "cancelled", status: "Cancelado" },
      { ...order, id: "example", status: "Completado", example: true },
      { ...order, id: "other-order", farmId: "another", status: "Pendiente" },
    ];
  });
  expect(
    screen.getByRole("link", { name: /Productos activos/ }),
  ).toHaveTextContent("1");
  expect(
    screen.getByRole("link", { name: /Reservas pendientes/ }),
  ).toHaveTextContent("1");
  expect(
    screen.getByRole("link", { name: /Entregas realizadas/ }),
  ).toHaveTextContent("1");
  expect(
    screen.getByRole("link", { name: /Producto agotado/ }),
  ).toHaveAttribute("href", "/perfil?apartado=productos");
  expect(
    screen.getByRole("link", { name: /Reponer producto/ }),
  ).toHaveAttribute("href", "/perfil?apartado=productos");
});

test("market loading/error never becomes an invented zero", () => {
  marketState.error = "No se pudieron cargar los mercados. Inténtalo de nuevo.";
  mount("urki", true);
  expect(
    screen.getByRole("link", { name: /Próximos mercados confirmados/ }),
  ).toHaveTextContent("—");
  expect(screen.getByRole("alert")).toHaveTextContent(marketState.error);
});

test("all tasks remain accessible through Show all", () => {
  mount("urki", true, (data) => {
    const order = seedStore().orders[0];
    data.orders = Array.from({ length: 7 }, (_, i) => ({
      ...order,
      id: "task" + i,
      farmId: "urki",
      example: false,
      status: "Pendiente",
    }));
  });
  expect(
    screen.getAllByRole("link", {
      name: /Gestionar reserva|Confirmar entrega/,
    }),
  ).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "Ver todas" }));
  expect(
    screen.getAllByRole("link", {
      name: /Gestionar reserva|Confirmar entrega/,
    }),
  ).toHaveLength(7);
});

test("existing product creation form is reused outside activity home", () => {
  mount("urki", false, () => {}, "nuevo");
  expect(screen.getByText("productos:true")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Mi actividad" })).toBeNull();
});

test("activity labels available in all four existing languages", () => {
  for (const lang of ["es", "fr", "en", "eu"] as const) {
    setLanguage(lang);
    for (const key of Object.keys(producerActivityLabels)) {
      expect(t(key).length).toBeGreaterThan(0);
      if (lang !== "es") expect(t(key)).not.toBe(key);
    }
  }
});
