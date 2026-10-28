import { test, expect } from "vitest";
import { sellerPosition, sellerMarkerClass } from "./sellers";
test("private markers are coarse and professional markers preserve the chosen entrance", () => {
  const p = { lat: 43.456123, lng: -1.456123 };
  expect(sellerPosition(p, "private")).toEqual({ lat: 43.46, lng: -1.46 });
  expect(sellerPosition(p, "professional")).toEqual(p);
  expect(sellerPosition(null, "private")).toBeNull();
});
test("unclassified sellers are visually distinct and never assumed professional", () => {
  expect(sellerMarkerClass("private")).toContain("private");
  expect(sellerMarkerClass("professional")).toBe("");
  expect(sellerMarkerClass(null)).toContain("unclassified");
});
