import React from "react";
import { test, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  EuskoFields,
  EuskoBadge,
  PaymentChoice,
  PaymentMethods,
} from "./eusko";
import { acceptsEusko, paymentAllowed } from "../lib/eusko";
import { exploreEntries } from "../lib/explore";
import { seedStore } from "../lib/local-model";
import { setLanguage, t, type Language } from "../lib/language";
afterEach(() => {
  cleanup();
  setLanguage("es");
});
test("seller acceptance defaults off and methods are explicit", () => {
  render(<EuskoFields farm={{}} />);
  expect(screen.getByLabelText("Acepto pagos en Eusko")).not.toBeChecked();
  expect(screen.queryByLabelText("Billetes Eusko")).toBeNull();
  fireEvent.click(screen.getByLabelText("Acepto pagos en Eusko"));
  expect(screen.getByLabelText("Billetes Eusko")).not.toBeChecked();
  expect(
    screen.getByLabelText("Eusko digital (Euskopay/Euskokart)"),
  ).not.toBeChecked();
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "https://www.euskalmoneta.org/",
  );
});
test("Eusko preference is only offered for sellers who accept it", () => {
  const { rerender } = render(
    <PaymentChoice farm={{}} value="EUR" onChange={() => {}} />,
  );
  expect(screen.queryByRole("option", { name: "Eusko" })).toBeNull();
  rerender(
    <PaymentChoice
      farm={{ euskoNotes: true }}
      value="EUR"
      onChange={() => {}}
    />,
  );
  expect(screen.getByRole("option", { name: "Eusko" })).toBeEnabled();
  expect(screen.getByText(/no tienen céntimos/)).toBeInTheDocument();
  expect(screen.getByText(/no constituye un pago/)).toBeInTheDocument();
});
test("withdrawing acceptance invalidates a chosen preference without claiming a payment", () => {
  render(<PaymentChoice farm={{}} value="EUSKO" onChange={() => {}} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Eusko no aceptado");
  expect(paymentAllowed({}, "EUSKO")).toBe(false);
  expect(paymentAllowed({}, "EUR")).toBe(true);
});
test("profiles do not show a false badge", () => {
  const { container, rerender } = render(<EuskoBadge farm={{}} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<EuskoBadge farm={{ euskoDigital: true }} />);
  expect(screen.getByText("Acepta Eusko")).toBeInTheDocument();
});
test("map filtering reuses seller entries and does not alter products", () => {
  const data = seedStore();
  data.farms[0].euskoDigital = true;
  const all = exploreEntries(
    data.farms,
    data.products,
    "",
    "",
    null,
    0,
    "",
    false,
    "all",
    true,
  );
  expect(all).toHaveLength(1);
  expect(all[0].farm.id).toBe(data.farms[0].id);
  expect(acceptsEusko(all[0].farm)).toBe(true);
});
test("four languages include labels and informational distinction", () => {
  for (const l of ["es", "fr", "eu", "en"] as Language[]) {
    setLanguage(l);
    expect(t("Preferencia de pago")).toBeTruthy();
    if (l !== "es") expect(t("Acepta Eusko")).not.toBe("Acepta Eusko");
  }
});
