import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DemoProvider } from "./design";
vi.mock("./cloud-provider", () => ({
  CloudProvider: ({ children }: { children: React.ReactNode }) => (
    <div>Proveedor Supabase{children}</div>
  ),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllEnvs();
});
test("public app ignores a previously stored demo mode and selects Supabase", async () => {
  vi.stubEnv("MODE", "production");
  localStorage.setItem("uzta.view.v1", "demo");
  render(
    <DemoProvider>
      <span>Contenido compartido</span>
    </DemoProvider>,
  );
  expect(await screen.findByText("Proveedor Supabase")).toBeInTheDocument();
  expect(screen.getByText("Contenido compartido")).toBeInTheDocument();
  expect(localStorage.getItem("uzta.view.v1")).toBe("demo");
});
