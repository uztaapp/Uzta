import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import {
  detectLanguage,
  setLanguage,
  currentLanguage,
  LANGUAGE_KEY,
  t,
  initializeLanguage,
  translatedLabels,
} from "./language";
import { routeTree } from "../router";
import { seedStore, STORAGE_KEY } from "./local-model";
afterEach(() => {
  cleanup();
  setLanguage("es");
  localStorage.clear();
  vi.restoreAllMocks();
});
test("automatic language follows ordered browser preferences and normalizes regional tags", () => {
  expect(detectLanguage(["pt-PT", "en_GB", "es-ES"])).toBe("en");
  expect(detectLanguage([" fr_CA "])).toBe("fr");
  expect(detectLanguage(["eu-ES"])).toBe("eu");
  expect(detectLanguage(["ja-JP"])).toBe("es");
});
test("manual preference survives initialization and changes only UZTA language storage", () => {
  localStorage.setItem("uzta.auth.example", "retained");
  setLanguage("eu");
  const stop = initializeLanguage();
  expect(currentLanguage()).toBe("eu");
  expect(document.documentElement.lang).toBe("eu");
  expect(localStorage.getItem("uzta.auth.example")).toBe("retained");
  expect(localStorage.getItem(LANGUAGE_KEY)).toBe("eu");
  stop();
});
test("storage failure does not prevent the UI language from changing", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  setLanguage("fr");
  expect(t("Mi perfil")).toBe("Mon profil");
});
test("every common label has a nonempty translation in all four languages", () => {
  for (const language of ["es", "fr", "en", "eu"] as const) {
    setLanguage(language);
    for (const key of translatedLabels())
      expect(t(key).trim().length).toBeGreaterThan(0);
  }
});
test("profile selector updates navigation while leaving product names and saved data untouched", async () => {
  const raw = JSON.stringify(seedStore());
  localStorage.setItem(STORAGE_KEY, raw);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/perfil"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole("button", { name: /Idioma/ }));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
  expect(
    screen.getByRole("heading", { name: "My profile" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Basket" })).toBeInTheDocument();
  expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
});
test("translated order tabs preserve their business identifiers and the complete purchase list", async () => {
  setLanguage("fr");
  const data = seedStore();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/pedidos"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  expect(screen.getByRole("tab", { name: "Achats" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    screen.getByRole("heading", { name: "Les Poules Heureuses" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Comme producteur" }));
  expect(
    screen.queryByRole("heading", { name: "Les Poules Heureuses" }),
  ).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).orders[0].status).toBe(
    "Pendiente",
  );
});
