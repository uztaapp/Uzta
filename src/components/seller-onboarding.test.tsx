import React from "react";
import { test, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { Gestion } from "../pages/gestion";
import { AppContext, type AppContextValue } from "../app-context";
import { emptyCloudData } from "../lib/cloud-data";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, search, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
for (const type of ["professional", "private"])
  test(
    "new " +
      type +
      " seller can reach and submit store creation without an existing farm",
    async () => {
      const data = emptyCloudData();
      data.sessionActive = true;
      const run = vi.fn().mockResolvedValue(true);
      render(
        <AppContext.Provider
          value={
            {
              data,
              run,
              mode: "cloud",
              busy: false,
              managedFarmId: null,
              show: () => {},
              storageError: "",
              userId: "user",
              switchMode: () => {},
              refresh: async () => {},
              signIn: async () => {},
              signUp: async () => "",
              signOut: async () => {},
            } as AppContextValue
          }
        >
          <Gestion section="tienda" />
        </AppContext.Provider>,
      );
      fireEvent.change(screen.getByLabelText("Tipo de vendedor"), {
        target: { value: type },
      });
      fireEvent.change(
        screen.getByLabelText(
          type === "private" ? "Nombre público" : "Nombre de la explotación",
        ),
        { target: { value: "Publicación local aislada" } },
      );
      fireEvent.change(screen.getByLabelText("Localidad"), {
        target: { value: "Baiona" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Crear mi tienda" }));
      await waitFor(() =>
        expect(run).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "farm",
            value: expect.objectContaining({
              sellerType: type,
              name: "Publicación local aislada",
            }),
          }),
        ),
      );
    },
  );
