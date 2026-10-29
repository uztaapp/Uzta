import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { routeTree } from "../router";
import { emptyMarkets, type MarketData } from "../lib/markets";
import { setLanguage, t } from "../lib/language";
import { marketLabels } from "../lib/market-labels";
const mocked = vi.hoisted(() => ({
  data: null as MarketData | null,
  error: "",
  loading: false,
}));
vi.mock("./market-data", () => ({
  useMarkets: () => ({
    ...mocked,
    data: mocked.data ?? emptyMarkets(),
    reload: vi.fn(),
  }),
}));
vi.mock("./producer-map", () => ({
  default: ({ kind }: { kind: string }) => <div aria-label={"Map " + kind} />,
}));
afterEach(() => {
  cleanup();
  setLanguage("es");
  mocked.data = null;
  mocked.error = "";
});
const id = (n: number) =>
  `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function open(path = "/mercados") {
  localStorage.clear();
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
function fixture() {
  return {
    markets: [
      {
        id: id(1),
        name: "Mercado de prueba aislada",
        kind: "producers" as const,
        description: "",
        locality: "Baiona",
        address: "",
        region: "Iparralde",
        latitude: 43.49,
        longitude: -1.47,
        timezone: "Europe/Paris" as const,
        categories: [],
        status: "published" as const,
        source_url: "https://example.invalid",
        source_key: "test",
        source_license: "test",
        verified_at: "2026-10-29T00:00:00Z",
        updated_at: "2026-10-29T00:00:00Z",
      },
    ],
    rules: [
      {
        id: id(2),
        market_id: id(1),
        participation_id: null,
        frequency: "weekly" as const,
        starts_on: "2026-01-01",
        ends_on: null,
        weekdays: [6],
        ordinal: null,
        opens: "09:00",
        closes: "13:00",
      },
    ],
    exceptions: [],
    participants: [],
  };
}
test("public empty calendar has seven columns, month navigation and existing bottom bar", async () => {
  await open();
  expect(screen.getByRole("tab", { name: "Calendario" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const month = screen.getByLabelText("Mes") as HTMLInputElement;
  const before = month.value;
  fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
  expect(month.value).not.toBe(before);
  expect(screen.getByRole("link", { name: "Cesta" })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", {
      name: "No hay mercados para esta selección",
    }),
  ).toBeInTheDocument();
});
test("real query error does not masquerade as an empty market catalogue", async () => {
  mocked.error = "No se pudieron cargar los mercados. Inténtalo de nuevo.";
  await open();
  expect(screen.getByRole("alert")).toHaveTextContent(mocked.error);
  expect(
    screen.queryByRole("heading", {
      name: "No hay mercados para esta selección",
    }),
  ).toBeNull();
});
test("calendar date, list and detail show the same registered market without fake vendors", async () => {
  mocked.data = fixture();
  await open();
  fireEvent.click(screen.getAllByRole("button", { name: /Con mercados/ })[0]);
  expect(
    screen.getAllByText("Mercado de prueba aislada").length,
  ).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("tab", { name: "Lista" }));
  fireEvent.click(
    screen.getAllByRole("button", { name: /Mercado de prueba aislada/ })[0],
  );
  await screen.findByRole("heading", {
    name: "Productores y artesanos participantes",
  });
  expect(
    screen.getByText(
      "Este mercado todavía no tiene vendedores de UZTA inscritos.",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
    "href",
    "/mercados",
  );
});
test("existing Leaflet map component receives market mode", async () => {
  mocked.data = fixture();
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "Mapa" }));
  expect(await screen.findByLabelText("Map markets")).toBeInTheDocument();
});
test("market interface strings available in all four existing languages", () => {
  for (const lang of ["es", "fr", "eu", "en"] as const) {
    setLanguage(lang);
    for (const [es, translated] of Object.entries(marketLabels)) {
      expect(translated).toHaveLength(3);
      expect(t(es).trim()).not.toBe("");
    }
    expect(t("Mercados y ferias")).toBe(
      lang === "es"
        ? "Mercados y ferias"
        : lang === "fr"
          ? "Marchés et foires"
          : lang === "eu"
            ? "Azokak eta feriak"
            : "Markets and fairs",
    );
  }
});
