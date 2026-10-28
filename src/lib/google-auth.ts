import config from "../../config/uzta-cloud.public.json";
export async function signInGoogle(enabled = config.googleReady) {
  if (!enabled) throw Error("Google pending configuration");
  const { cloudClient, authReturnUrl } = await import("./cloud-client");
  const r = await cloudClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: authReturnUrl() },
  });
  if (r.error) throw Error("Google sign in failed");
}
