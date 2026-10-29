import React from "react";
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import config from "../../config/uzta-cloud.public.json";
import { AppContext, type AppContextValue } from "../app-context";
import { emptyCloudData } from "../lib/cloud-data";
import { Pedidos } from "../pages/pedidos";
import { Perfil } from "../pages/perfil";
import {
  ProducerApplication,
  ProducerRequestsAdmin,
} from "./producer-application";
import * as service from "../lib/producer-approval";
const mocks = vi.hoisted(() => ({
  search: {} as Record<string, string>,
  send: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue([]),
  review: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => mocks.search,
}));
vi.mock("./sales-panel", () => ({
  SalesLinks: () => null,
  SalesPanel: () => null,
}));
vi.mock("../lib/producer-approval", async (original) => ({
  ...(await original<typeof service>()),
  sendProducerRequest: mocks.send,
  loadProducerRequests: mocks.load,
  reviewProducerRequest: mocks.review,
}));
const wasReady = config.producerApprovalsReady;
beforeEach(() => {
  config.producerApprovalsReady = true;
  mocks.search = {};
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  config.producerApprovalsReady = wasReady;
});
function mount(
  node: React.ReactNode,
  access = {
    approved: false,
    admin: false,
    status: null as "pending" | "approved" | "rejected" | "revoked" | null,
  },
) {
  const data = emptyCloudData();
  data.sessionActive = true;
  data.profile = {
    name: "Comprador",
    location: "Baiona",
    email: "buyer@example.test",
    language: "Español",
  };
  data.producerAccess = access;
  const refresh = vi.fn().mockResolvedValue(undefined);
  render(
    <AppContext.Provider
      value={
        {
          data,
          managedFarmId: null,
          userId: "buyer",
          mode: "cloud",
          busy: false,
          refresh,
          show: vi.fn(),
          run: vi.fn(),
        } as unknown as AppContextValue
      }
    >
      {node}
    </AppContext.Provider>,
  );
  return refresh;
}
test("buyer direct product URL offers application and no store or product editor", () => {
  mocks.search = { apartado: "productos" };
  mount(<Perfil />);
  expect(
    screen.getByRole("heading", { name: "Quiero ser productor" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Crear mi tienda")).toBeNull();
  expect(screen.queryByText("Gestión rápida")).toBeNull();
});
test("buyer can submit one application without creating a store", async () => {
  const refresh = mount(<ProducerApplication />);
  fireEvent.click(screen.getByRole("button", { name: "Quiero ser productor" }));
  for (const [label, value] of [
    ["Nombre de la explotación o actividad", "Huerta"],
    ["Tipo de producción", "Verduras"],
    ["Breve descripción", "Actividad local"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});
test("pending applications do not expose another submission form", () => {
  mount(<ProducerApplication />, {
    approved: false,
    admin: false,
    status: "pending",
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "pendiente de aprobación",
  );
  expect(
    screen.queryByRole("button", { name: "Quiero ser productor" }),
  ).toBeNull();
});
test("rejected candidates may apply again but revoked users may not", () => {
  mount(<ProducerApplication />, {
    approved: false,
    admin: false,
    status: "rejected",
  });
  expect(
    screen.getByRole("button", { name: "Quiero ser productor" }),
  ).toBeInTheDocument();
  cleanup();
  mount(<ProducerApplication />, {
    approved: false,
    admin: false,
    status: "revoked",
  });
  expect(
    screen.queryByRole("button", { name: "Quiero ser productor" }),
  ).toBeNull();
});
test("approved producer without a shop reaches the original creation form", () => {
  mount(<Perfil />, { approved: true, admin: false, status: "approved" });
  expect(
    screen.getByRole("button", { name: "Crear mi tienda" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Quiero ser productor" }),
  ).toBeNull();
});
test("buyers cannot open the administration queue", () => {
  mount(<ProducerRequestsAdmin />);
  expect(screen.getByRole("alert")).toHaveTextContent("administración");
  expect(mocks.load).not.toHaveBeenCalled();
});
test("admin gets queue without receiving producer permission", async () => {
  mount(<ProducerRequestsAdmin />, {
    approved: false,
    admin: true,
    status: null,
  });
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(1));
  expect(
    screen.getByRole("heading", { name: "Solicitudes de productores" }),
  ).toBeInTheDocument();
});

test("buyer direct received-orders URL retains purchases without producer tools", () => {
  mocks.search = { vista: "productor" };
  mount(<Pedidos />);
  expect(screen.getByRole("tab", { name: "Compras" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.queryByRole("tab", { name: "Como productor" })).toBeNull();
});
