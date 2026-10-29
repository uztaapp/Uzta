import React from "react";
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Pedidos } from "./pedidos";
import { AppContext, type AppContextValue } from "../app-context";
import { emptyCloudData } from "../lib/cloud-data";
import config from "../../config/uzta-cloud.public.json";
vi.mock("@tanstack/react-router", () => ({
  useSearch: () => ({ pedido: "order" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, search, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
const ready = config.cancellationsReady;
beforeEach(() => {
  config.cancellationsReady = true;
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  config.cancellationsReady = ready;
});
function mount(
  startsAt: string,
  status: "Pendiente" | "Completado" | "Cancelado" = "Pendiente",
) {
  const data = emptyCloudData();
  data.sessionActive = true;
  data.orders = [
    {
      id: "order",
      farmId: "seller",
      farmName: "Tienda aislada",
      customerId: "buyer",
      createdAt: "2026-10-01T10:00:00Z",
      pickup: {
        id: "slot",
        date: "2026-10-25",
        start: "02:30",
        end: "03:30",
        startsAt,
      },
      message: "",
      status,
      example: false,
      lines: [
        {
          productId: "p",
          name: "Huevos",
          priceCents: 199,
          unit: "docena",
          quantity: 1,
          crop: [0, 0, 0, 0],
        },
      ],
    },
  ];
  render(
    <AppContext.Provider
      value={
        {
          data,
          userId: "buyer",
          managedFarmId: null,
          mode: "cloud",
          busy: false,
          run: vi.fn(),
          refresh: vi.fn(),
        } as unknown as AppContextValue
      }
    >
      <Pedidos />
    </AppContext.Provider>,
  );
}
test("autumn clock-change reservation uses its original UTC instant without crashing", () => {
  vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
  mount("2026-10-25T00:30:00Z");
  expect(
    screen.getByRole("button", { name: "Cancelar reserva" }),
  ).toBeEnabled();
});
test("the second repeated 02:30 remains cancellable until its own UTC start", () => {
  vi.setSystemTime(new Date("2026-10-25T00:45:00Z"));
  mount("2026-10-25T01:30:00Z");
  expect(
    screen.getByRole("button", { name: "Cancelar reserva" }),
  ).toBeEnabled();
});
test("buyer cancellation closes at the exact start without throwing on repeated hours", () => {
  vi.setSystemTime(new Date("2026-10-25T00:30:00Z"));
  mount("2026-10-25T00:30:00Z");
  expect(
    screen.getByRole("button", { name: "Cancelar reserva" }),
  ).toBeDisabled();
});
test("cancelled reservations keep their detail but no second cancellation action", () => {
  vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
  mount("2026-10-25T00:30:00Z", "Cancelado");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancelar reserva" })).toBeNull();
});
