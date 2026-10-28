import { test, expect, vi, beforeEach } from "vitest";
import { signInGoogle } from "./google-auth";
const oauth = vi.hoisted(() => vi.fn());
vi.mock("./cloud-client", () => ({
  cloudClient: () => ({ auth: { signInWithOAuth: oauth } }),
  authReturnUrl: () => "https://uzta-nu.vercel.app/",
}));
beforeEach(() => {
  vi.clearAllMocks();
  oauth.mockResolvedValue({ error: null });
});
test("Google uses only the UZTA callback through the existing PKCE client", async () => {
  await signInGoogle(true);
  expect(oauth).toHaveBeenCalledExactlyOnceWith({
    provider: "google",
    options: { redirectTo: "https://uzta-nu.vercel.app/" },
  });
});
test("disabled or failed provider never pretends success", async () => {
  await expect(signInGoogle(false)).rejects.toThrow();
  expect(oauth).not.toHaveBeenCalled();
  oauth.mockResolvedValue({ error: { message: "failure" } });
  await expect(signInGoogle(true)).rejects.toThrow("Google sign in failed");
});
