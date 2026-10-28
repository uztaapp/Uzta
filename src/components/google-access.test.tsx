import React from "react";
import { test, expect, vi, afterEach, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { GoogleAccess } from "./google-access";
const auth = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("../lib/google-auth", () => ({ signInGoogle: auth.signIn }));
beforeEach(() => {
  vi.clearAllMocks();
  auth.signIn.mockResolvedValue(undefined);
});
afterEach(cleanup);
test("disabled provider cannot start an invalid Google flow", () => {
  render(<GoogleAccess enabled={false} />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(
    screen.getByText("Acceso con Google pendiente de configuración."),
  ).toBeInTheDocument();
  expect(auth.signIn).not.toHaveBeenCalled();
});
test("enabled button reuses the OAuth flow", async () => {
  render(<GoogleAccess enabled />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(auth.signIn).toHaveBeenCalledExactlyOnceWith(true),
  );
});
test("failure is visible and allows retry", async () => {
  auth.signIn.mockRejectedValue(Error());
  render(<GoogleAccess enabled />);
  fireEvent.click(screen.getByRole("button"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo iniciar",
  );
  expect(screen.getByRole("button")).toBeEnabled();
});
