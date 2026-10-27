import React, { useState } from "react";
import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  validPosition,
  publicPosition,
  distanceKm,
  withinRadius,
  publicMapUrl,
  type Position,
} from "./nearby";
import { NearbyControls } from "../components/nearby-controls";
beforeEach(() =>
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    get: () => undefined,
  }),
);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "geolocation");
});
test("position validation rejects missing, nonfinite and out-of-range coordinates", () => {
  for (const p of [
    null,
    {},
    { lat: NaN, lng: 1 },
    { lat: 91, lng: 1 },
    { lat: 1, lng: -181 },
  ])
    expect(validPosition(p)).toBe(false);
  expect(validPosition({ lat: 0, lng: 0 })).toBe(true);
});
test("public coordinates and map links preserve six decimal places", () => {
  expect(publicPosition({ lat: 43.456789, lng: -1.456789 })).toEqual({
    lat: 43.456789,
    lng: -1.456789,
  });
  const url = publicMapUrl({ lat: 43.456789, lng: -1.456789 })!;
  expect(url).toContain("456789");
  expect(new URL(url).hostname).toBe("www.openstreetmap.org");
  expect(new URL(url).searchParams.get("mlat")).toBe("43.456789");
});
test("radius filter excludes unknown locations only when a center is selected", () => {
  expect(withinRadius(null, null, 5)).toBe(true);
  expect(withinRadius(null, { lat: 43, lng: 1 }, 5)).toBe(false);
  expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
    111.195,
    2,
  );
  expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(
    20015.087,
    2,
  );
  expect(withinRadius({ lat: 0, lng: 1 }, { lat: 0, lng: 0 }, 50)).toBe(false);
});
test("location is requested only on an explicit click and a denial preserves manual search", () => {
  const locate = vi.fn((_ok, error) => error({ code: 1 }));
  vi.spyOn(navigator, "geolocation", "get").mockReturnValue({
    getCurrentPosition: locate,
  } as any);
  const selected = vi.fn();
  render(
    <NearbyControls
      center={null}
      radius={5}
      onRadius={() => {}}
      onCenter={selected}
    />,
  );
  expect(locate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  expect(locate).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent("introducir una zona");
  fireEvent.change(screen.getByLabelText("Latitud"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Longitud"), {
    target: { value: "0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar zona" }));
  expect(selected).toHaveBeenCalledWith({ lat: 0, lng: 0 });
});
test("clearing a search invalidates an outstanding location callback", () => {
  let found: (value: any) => void = () => {};
  const locate = vi.fn((ok) => {
    found = ok;
  });
  vi.spyOn(navigator, "geolocation", "get").mockReturnValue({
    getCurrentPosition: locate,
  } as any);
  const chosen = vi.fn();
  function Harness() {
    const [center, setCenter] = useState<Position | null>({ lat: 0, lng: 0 });
    return (
      <NearbyControls
        center={center}
        radius={5}
        onRadius={() => {}}
        onCenter={(p) => {
          chosen(p);
          setCenter(p);
        }}
      />
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Quitar filtro de zona" }),
  );
  found({ coords: { latitude: 10, longitude: 10 } });
  expect(chosen).toHaveBeenCalledTimes(1);
  expect(chosen).toHaveBeenLastCalledWith(null);
});
