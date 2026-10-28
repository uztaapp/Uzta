import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { AppContext, type AppContextValue } from "../app-context";
import {
  ReservationReview,
  SellerReviews,
  RatingSummary,
} from "./seller-reviews";
import { reviewInput } from "../lib/reviews";
import { setLanguage, t, type Language } from "../lib/language";
const api = vi.hoisted(() => ({
  own: vi.fn(),
  submit: vi.fn(),
  comments: vi.fn(),
}));
vi.mock("../lib/reviews", async (original) => ({
  ...(await original<typeof import("../lib/reviews")>()),
  ownReview: api.own,
  submitReview: api.submit,
  reviewComments: api.comments,
}));
const order = "00000000-0000-4000-8000-000000000020",
  user = "00000000-0000-4000-8000-000000000002";
const wrap = (children: React.ReactNode) => (
  <AppContext.Provider value={{ mode: "cloud" } as AppContextValue}>
    {children}
  </AppContext.Provider>
);
const form = (id = user) => (
  <ReservationReview enabled orderId={order} userId={id} />
);
beforeEach(() => {
  vi.clearAllMocks();
  setLanguage("es");
  api.own.mockResolvedValue(null);
  api.submit.mockResolvedValue(undefined);
  api.comments.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  setLanguage("es");
});
test("rating required, bounded optional comment, one save", async () => {
  render(form());
  const button = await screen.findByRole("button", {
    name: "Guardar valoración",
  });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: /5/ }));
  expect(screen.getByRole("textbox")).toHaveAttribute("maxlength", "300");
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Muy fresco" },
  });
  fireEvent.click(button);
  await screen.findByRole("status");
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu valoración está guardada.",
    ),
  );
  expect(api.submit).toHaveBeenCalledExactlyOnceWith(order, 5, "Muy fresco");
});
test("existing review prevents duplicate form", async () => {
  api.own.mockResolvedValue({ rating: 4, comment: "OK" });
  render(form());
  expect(await screen.findByRole("status")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("guardada"),
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
test("load error is not presented as an empty review", async () => {
  api.own.mockRejectedValue(Error());
  render(form());
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudieron cargar",
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
test("write failure keeps form and does not claim success", async () => {
  api.submit.mockRejectedValue(Error());
  render(form());
  await screen.findByRole("button");
  fireEvent.click(screen.getByRole("radio", { name: /3/ }));
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo guardar",
  );
  expect(screen.getByRole("button")).toBeEnabled();
});
test("account change cannot reuse the previous review", async () => {
  api.own.mockResolvedValueOnce({ rating: 5, comment: "" });
  const view = render(form());
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("guardada"),
  );
  view.rerender(form("00000000-0000-4000-8000-000000000003"));
  await screen.findByRole("button");
  expect(screen.getByRole("button")).toBeDisabled();
});
test("public comments rendered as text without personal information", async () => {
  api.comments.mockResolvedValue([
    {
      id: order,
      rating: 4,
      comment: "<img src=x onerror=alert(1)>",
      created_at: "2026-10-28T10:00:00Z",
    },
  ]);
  const { container } = render(
    wrap(
      <SellerReviews
        enabled
        producerId={order}
        summaries={{
          key: "",
          rows: [{ producer_id: order, average: 4, total: 1 }],
          error: false,
          loading: false,
        }}
      />,
    ),
  );
  await screen.findByText("<img src=x onerror=alert(1)>");
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByText(/4 \/ 5 · 1/)).toBeInTheDocument();
});
test("empty and failed summaries are distinct", async () => {
  const view = render(
    wrap(
      <SellerReviews
        enabled
        producerId={order}
        summaries={{ key: "", rows: [], error: false, loading: false }}
      />,
    ),
  );
  await screen.findByText("Sin valoraciones todavía");
  view.rerender(
    wrap(
      <SellerReviews
        enabled
        producerId={order}
        summaries={{ key: "", rows: [], error: true, loading: false }}
      />,
    ),
  );
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText("Sin valoraciones todavía")).toBeNull();
});
test("no fabricated rating and all four languages", () => {
  const view = render(<RatingSummary value={undefined} />);
  expect(view.container).toBeEmptyDOMElement();
  for (const language of ["es", "fr", "eu", "en"] as Language[]) {
    setLanguage(language);
    expect(t("Valorar al vendedor")).toBeTruthy();
    if (language !== "es")
      expect(t("Sin valoraciones todavía")).not.toBe(
        "Sin valoraciones todavía",
      );
  }
  expect(
    reviewInput.safeParse({ rating: 5, comment: "x".repeat(301) }).success,
  ).toBe(false);
  expect(reviewInput.safeParse({ rating: 0, comment: "" }).success).toBe(false);
});
