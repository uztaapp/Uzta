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
import { AppContext, type AppContextValue } from "../app-context";
import { NotificationBell } from "./notification-bell";
import { emptyCloudData } from "../lib/cloud-data";
import { setLanguage, t, type Language } from "../lib/language";
const mocks = vi.hoisted(() => ({ load: vi.fn(), read: vi.fn() }));
vi.mock("../lib/notifications", async (original) => ({
  ...(await original<typeof import("../lib/notifications")>()),
  loadNotifications: mocks.load,
  readNotification: mocks.read,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, search, children, ...rest }: any) => (
    <a
      href={
        to +
        "?" +
        new URLSearchParams(
          Object.entries(search).filter(([, v]) => v !== undefined) as [
            string,
            string,
          ][],
        )
      }
      {...rest}
    >
      {children}
    </a>
  ),
}));
const USER = "00000000-0000-4000-8000-000000000001",
  OTHER = "00000000-0000-4000-8000-000000000002";
const row = {
  id: "00000000-0000-4000-8000-000000000010",
  order_id: "00000000-0000-4000-8000-000000000020",
  kind: "new_reservation",
  audience: "seller",
  created_at: "2026-10-28T10:00:00Z",
};
function view(user = USER, enabled = true) {
  return (
    <AppContext.Provider
      value={
        {
          data: emptyCloudData(),
          mode: "cloud",
          userId: user,
        } as AppContextValue
      }
    >
      <NotificationBell enabled={enabled} />
    </AppContext.Provider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  setLanguage("es");
  mocks.load.mockResolvedValue({ rows: [row], count: 1 });
  mocks.read.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  setLanguage("es");
});
test("disabled migration makes no queries and shows no false notifications", async () => {
  render(view(USER, false));
  expect(
    screen.queryByRole("button", { name: "Notificaciones" }),
  ).not.toBeInTheDocument();
  expect(mocks.load).not.toHaveBeenCalled();
});
test("unread counter, read action and seller order link share the same notification", async () => {
  render(view());
  await screen.findByLabelText("Pendientes");
  fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
  const link = await screen.findByRole("link", {
    name: /Nueva reserva recibida/,
  });
  expect(link).toHaveAttribute(
    "href",
    "/pedidos?pedido=" + row.order_id + "&vista=productor",
  );
  fireEvent.click(screen.getByRole("button", { name: "Marcar como leída" }));
  await waitFor(() =>
    expect(screen.queryByLabelText("Pendientes")).not.toBeInTheDocument(),
  );
  expect(mocks.read).toHaveBeenCalledWith(row.id);
  expect(
    await screen.findByText("No tienes notificaciones pendientes."),
  ).toBeInTheDocument();
});
test("failed reads preserve unread count and show an error", async () => {
  mocks.read.mockRejectedValueOnce(Error("offline"));
  render(view());
  await screen.findByLabelText("Pendientes");
  fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
  await screen.findByRole("link", { name: /Nueva reserva recibida/ });
  fireEvent.click(screen.getByRole("button", { name: "Marcar como leída" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo marcar",
  );
  expect(screen.getByLabelText("Pendientes")).toHaveTextContent("1");
});
test("late response from a previous account cannot populate another account", async () => {
  let resolve!: (x: any) => void;
  mocks.load.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const ui = render(view());
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith(USER));
  mocks.load.mockResolvedValue({ rows: [], count: 0 });
  ui.rerender(view(OTHER));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith(OTHER));
  await act(async () => resolve({ rows: [row], count: 1 }));
  expect(screen.queryByLabelText("Pendientes")).not.toBeInTheDocument();
});
test.each(["es", "fr", "eu", "en"])(
  "bell and notification labels use %s translations",
  async (language) => {
    setLanguage(language as Language);
    render(view());
    await screen.findByLabelText(t("Pendientes"));
    fireEvent.click(screen.getByRole("button", { name: t("Notificaciones") }));
    expect(
      await screen.findByRole("link", {
        name: new RegExp(t("Nueva reserva recibida")),
      }),
    ).toBeInTheDocument();
  },
);
