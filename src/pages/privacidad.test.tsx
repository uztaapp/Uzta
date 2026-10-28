import React from "react";
import { test, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Privacidad } from "./privacidad";
import { setLanguage, type Language } from "../lib/language";
import legal from "../../config/uzta-legal.public.json";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));
afterEach(() => {
  cleanup();
  setLanguage("es");
});
test("unapproved text is not presented as a public approved policy", () => {
  render(<Privacidad />);
  expect(screen.getByText(/pendiente de aprobación/)).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Datos utilizados" }),
  ).toBeNull();
});
test("review draft includes controller, actual providers and rights in four languages", () => {
  for (const lang of ["es", "fr", "eu", "en"] as Language[]) {
    setLanguage(lang);
    const view = render(<Privacidad preview />);
    expect(screen.getByText(/Cristian Martinez/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Supabase" })).toHaveAttribute(
      "href",
      "https://supabase.com/legal/customer-resources/data-processing-addendum",
    );
    expect(screen.getByRole("link", { name: "CNIL" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(11);
    expect(
      screen.getByRole("link", { name: legal.contactEmail }),
    ).toHaveAttribute("href", "mailto:" + legal.contactEmail);
    view.unmount();
  }
});
