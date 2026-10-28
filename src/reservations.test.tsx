import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { AppContext, type AppContextValue } from "./app-context";
import { seedStore, type LocalStore } from "./lib/local-model";
import { pendingCheckoutKey } from "./lib/checkout-receipt";
import { setLanguage, t, type Language } from "./lib/language";
import { Cesta } from "./pages/cesta";
import { Pedidos } from "./pages/pedidos";
import { PickupLocation } from "./components/pickup-location";
const mocks = vi.hoisted(() => ({ search: {} as Record<string, string> }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useSearch: () => mocks.search,
  useNavigate: () => vi.fn(),
}));
const USER = "00000000-0000-4000-8000-000000000001";
const RECEIPT = "00000000-0000-4000-8000-000000000099";
beforeEach(() => {
  localStorage.clear();
  setLanguage("es");
  mocks.search = {};
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLanguage("es");
});
function fixture() {
  const data = seedStore();
  data.quantities = { tomates: 1 };
  data.message = "";
  data.farms[0].slots = [
    { id: "morning", date: "2040-01-02", start: "09:00", end: "10:00" },
    { id: "afternoon", date: "2040-01-02", start: "17:00", end: "18:00" },
    { id: "next", date: "2040-01-03", start: "09:00", end: "10:00" },
    { id: "past", date: "2020-01-01", start: "09:00", end: "10:00" },
  ];
  return data;
}
function wrap(
  data: LocalStore,
  run: any,
  child = <Cesta />,
  managedFarmId: string | null = null,
) {
  return (
    <AppContext.Provider
      value={
        {
          data,
          run,
          show: vi.fn(),
          storageError: "",
          mode: "cloud",
          busy: false,
          userId: USER,
          managedFarmId,
          refresh: vi.fn(),
        } as unknown as AppContextValue
      }
    >
      {child}
    </AppContext.Provider>
  );
}
function pickup() {
  fireEvent.click(screen.getByRole("button", { name: t("Elegir recogida") }));
  fireEvent.change(screen.getByLabelText(t("Fecha de recogida")), {
    target: { value: "2040-01-02" },
  });
  fireEvent.change(screen.getByLabelText(t("Franja horaria")), {
    target: { value: "afternoon" },
  });
}
function review() {
  pickup();
  fireEvent.click(screen.getByRole("button", { name: t("Revisar reserva") }));
}
test("date and offered time are selected separately; changing date clears the slot", () => {
  render(wrap(fixture(), vi.fn()));
  fireEvent.click(screen.getByRole("button", { name: "Elegir recogida" }));
  expect(screen.getByLabelText("Franja horaria")).toBeDisabled();
  expect(
    screen.queryByRole("option", { name: /2020/ }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Fecha de recogida"), {
    target: { value: "2040-01-02" },
  });
  fireEvent.change(screen.getByLabelText("Franja horaria"), {
    target: { value: "afternoon" },
  });
  fireEvent.change(screen.getByLabelText("Fecha de recogida"), {
    target: { value: "2040-01-03" },
  });
  expect(screen.getByLabelText("Franja horaria")).toHaveValue("");
  expect(
    screen.queryByRole("option", { name: "17:00 – 18:00" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Revisar reserva" }),
  ).toBeDisabled();
});
test("repeated clicks submit once and the confirmation shows the original retry receipt", async () => {
  let finish!: (value: boolean) => void;
  const run = vi.fn(
    (_command: unknown) =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  localStorage.setItem(
    pendingCheckoutKey(USER),
    JSON.stringify({ id: RECEIPT, fingerprint: "previous attempt" }),
  );
  render(wrap(fixture(), run));
  review();
  const button = screen.getByRole("button", { name: "Confirmar reserva" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0][0]).toMatchObject({
    type: "reserve",
    id: RECEIPT,
    slotId: "afternoon",
  });
  await act(async () => finish(true));
  expect(
    screen.getByRole("heading", { name: "Reserva registrada" }),
  ).toBeInTheDocument();
  expect(screen.getByText(RECEIPT)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Confirmar reserva" }),
  ).not.toBeInTheDocument();
});
test("failed confirmation can retry with the same id and never reports success early", async () => {
  const run = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(wrap(fixture(), run));
  review();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  expect(
    screen.queryByRole("heading", { name: "Reserva registrada" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar reserva" }));
  await screen.findByRole("heading", { name: "Reserva registrada" });
  expect(run.mock.calls[0][0].id).toBe(run.mock.calls[1][0].id);
});
test("a changed price invalidates the review before any reservation call", () => {
  const data = fixture(),
    run = vi.fn();
  const view = render(wrap(data, run));
  review();
  const next = {
    ...data,
    products: data.products.map((p) =>
      p.id === "tomates" ? { ...p, priceCents: p.priceCents + 100 } : p,
    ),
  };
  view.rerender(wrap(next, run));
  expect(screen.getByRole("alert")).toHaveTextContent("han cambiado");
  expect(
    screen.getByRole("button", { name: "Confirmar reserva" }),
  ).toBeDisabled();
  expect(run).not.toHaveBeenCalled();
});
test("a visitor may review pickup but cannot confirm without a session", () => {
  const data = fixture();
  data.sessionActive = false;
  render(wrap(data, vi.fn()));
  review();
  expect(
    screen.getByRole("button", { name: "Confirmar reserva" }),
  ).toBeDisabled();
});
test("multiple sellers cannot advance into one reservation", () => {
  const data = fixture();
  data.quantities["huevos-poules"] = 1;
  render(wrap(data, vi.fn()));
  expect(
    screen.getByRole("button", { name: "Elegir recogida" }),
  ).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("un solo vendedor");
});
test("a private pickup map link exposes only the approximate public zone", () => {
  const farm = {
    ...fixture().farms[0],
    sellerType: "private" as const,
    position: { lat: 43.456123, lng: -1.456123 },
  };
  render(<PickupLocation farm={farm} />);
  const url = new URL(
    screen
      .getByRole("link", { name: "Abrir zona de recogida" })
      .getAttribute("href")!,
  );
  expect(url.searchParams.get("mlat")).toBe("43.460000");
  expect(url.href).not.toContain("456123");
});
test("own buyer access cannot mark another seller's order collected", () => {
  const data = fixture(),
    order = data.orders[0];
  order.example = false;
  order.customerId = USER;
  mocks.search = { pedido: order.id, vista: "productor" };
  render(wrap(data, vi.fn(), <Pedidos />, "another-store"));
  expect(screen.getByRole("dialog")).toHaveTextContent(order.id);
  expect(
    screen.queryByRole("button", { name: "Marcar recogido" }),
  ).not.toBeInTheDocument();
});
test.each(["es", "fr", "eu", "en"])(
  "checkout controls and payment notice are translated in %s",
  (language) => {
    setLanguage(language as Language);
    render(wrap(fixture(), vi.fn()));
    review();
    expect(
      screen.getByRole("button", { name: t("Confirmar reserva") }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        t(
          "Paga directamente al vendedor durante la recogida. UZTA no cobra online.",
        ),
      ),
    ).toBeInTheDocument();
  },
);
