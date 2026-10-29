import { test, expect, vi, beforeEach, afterEach } from "vitest";
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());
function browser(state: PermissionState = "prompt") {
  const get = vi.fn();
  vi.stubGlobal("navigator", {
    permissions: { query: vi.fn().mockResolvedValue({ state }) },
    geolocation: { getCurrentPosition: get },
  });
  return get;
}
test("automatic location is approximate and only the attempt flag is persisted", async () => {
  const get = browser();
  const m = await import("./buyer-location");
  await m.locateBuyer(true);
  get.mock.calls[0][0]({
    coords: { latitude: 43.123456, longitude: -1.234567 },
  });
  expect(m.getBuyerLocation().point).toEqual({ lat: 43.12, lng: -1.23 });
  expect(sessionStorage.length).toBe(1);
  expect(sessionStorage.getItem("uzta.buyer-location.attempted")).toBe("1");
});
test("denied automatic permission never prompts again", async () => {
  const get = browser("denied");
  const m = await import("./buyer-location");
  await m.locateBuyer(true);
  await m.locateBuyer(true);
  expect(get).not.toHaveBeenCalled();
  expect(m.getBuyerLocation().status).toBe("unavailable");
});
test("parallel automatic attempts share one request and a late result cannot replace a manual choice", async () => {
  const get = browser();
  const m = await import("./buyer-location");
  await Promise.all([m.locateBuyer(true), m.locateBuyer(true)]);
  expect(get).toHaveBeenCalledTimes(1);
  m.selectBuyerLocality("Ustaritz");
  get.mock.calls[0][0]({ coords: { latitude: 43.12, longitude: -1.23 } });
  expect(m.getBuyerLocation()).toMatchObject({
    source: "manual",
    locality: "Ustaritz",
    point: null,
  });
});
test("a previous prompt is not repeated on reload", async () => {
  sessionStorage.setItem("uzta.buyer-location.attempted", "1");
  const get = browser();
  const m = await import("./buyer-location");
  await m.locateBuyer(true);
  expect(get).not.toHaveBeenCalled();
});
test("manual locality is kept until explicitly requesting device location", async () => {
  const get = browser();
  const m = await import("./buyer-location");
  m.selectBuyerLocality("Bayona");
  await m.locateBuyer(true);
  expect(get).not.toHaveBeenCalled();
  await m.locateBuyer();
  get.mock.calls[0][0]({
    coords: { latitude: 43.123456, longitude: -1.234567 },
  });
  expect(m.getBuyerLocation().source).toBe("automatic");
});
