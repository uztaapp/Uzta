import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from "@testing-library/react";
import StoreLocationPicker from "./store-location-picker";
const { events } = vi.hoisted(() => ({
  events: new Map<string, (event: any) => void>(),
}));
vi.mock("leaflet", () => {
  const chain = () => ({
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    setLatLng: vi.fn(),
    dragging: { enable: vi.fn(), disable: vi.fn() },
  });
  const map = {
    setView: vi.fn().mockReturnThis(),
    on: vi.fn((name, handler) => events.set(name, handler)),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
    getCenter: () => ({ lat: 43.456789, lng: -1.456789 }),
  };
  return {
    default: {
      map: () => map,
      tileLayer: chain,
      marker: chain,
      divIcon: () => ({}),
    },
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  events.clear();
});
function open(disabled = false) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  return render(
    <form aria-label="Tienda">
      <StoreLocationPicker
        initialPosition={{ lat: 43.45, lng: -1.46 }}
        disabled={disabled}
      />
    </form>,
  );
}
test("choose a point visually and remove it without exposing numeric coordinate fields", () => {
  open();
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Usar el centro del mapa" }),
  );
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.46");
  expect(new FormData(form).get("publicLongitude")).toBe("-1.46");
  fireEvent.click(screen.getByRole("button", { name: "Quitar punto" }));
  expect(new FormData(form).get("publicLatitude")).toBe("");
  expect(screen.getByRole("status")).toHaveTextContent("Sin punto público");
});
test("clicking the map selects an approximate point and busy state prevents edits", () => {
  const view = open();
  act(() => events.get("click")!({ latlng: { lat: 43.457, lng: -1.455 } }));
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.46");
  view.rerender(
    <form aria-label="Tienda">
      <StoreLocationPicker
        initialPosition={{ lat: 43.45, lng: -1.46 }}
        disabled
      />
    </form>,
  );
  act(() => events.get("click")!({ latlng: { lat: 40, lng: 0 } }));
  expect(new FormData(form).get("publicLatitude")).toBe("43.46");
  expect(screen.getByRole("button", { name: "Quitar punto" })).toBeDisabled();
});
