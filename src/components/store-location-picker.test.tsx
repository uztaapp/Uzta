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
  expect(new FormData(form).get("publicLatitude")).toBe("43.456789");
  expect(new FormData(form).get("publicLongitude")).toBe("-1.456789");
  fireEvent.click(screen.getByRole("button", { name: "Quitar punto" }));
  expect(new FormData(form).get("publicLatitude")).toBe("");
  expect(screen.getByRole("status")).toHaveTextContent("Sin punto público");
});
test("clicking the map selects a precise point and busy state prevents edits", () => {
  const view = open();
  act(() => events.get("click")!({ latlng: { lat: 43.457, lng: -1.455 } }));
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.457");
  view.rerender(
    <form aria-label="Tienda">
      <StoreLocationPicker
        initialPosition={{ lat: 43.45, lng: -1.46 }}
        disabled
      />
    </form>,
  );
  act(() => events.get("click")!({ latlng: { lat: 40, lng: 0 } }));
  expect(new FormData(form).get("publicLatitude")).toBe("43.457");
  expect(screen.getByRole("button", { name: "Quitar punto" })).toBeDisabled();
});
test("GPS is requested only on click, preserves precision and reports accuracy", () => {
  const locate = vi.fn((ok) =>
    ok({
      coords: { latitude: 43.4567891, longitude: -1.4567891, accuracy: 8 },
    }),
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: locate } });
  open();
  expect(locate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  expect(locate).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.456789");
  expect(screen.getByText(/precisión estimada: 8 m/)).toBeInTheDocument();
});
test("GPS denial keeps the selected point and permits manual selection", () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_ok: unknown, fail: Function) => fail({ code: 1 }),
    },
  });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  expect(screen.getByText(/Permiso de ubicación denegado/)).toBeInTheDocument();
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.45");
  act(() =>
    events.get("click")!({ latlng: { lat: 43.456123, lng: -1.456123 } }),
  );
  expect(new FormData(form).get("publicLatitude")).toBe("43.456123");
});
test("manual selection cancels a pending GPS result", () => {
  let found: Function = () => {};
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (ok: Function) => {
        found = ok;
      },
    },
  });
  open();
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  act(() =>
    events.get("click")!({ latlng: { lat: 43.456123, lng: -1.456123 } }),
  );
  act(() => found({ coords: { latitude: 1, longitude: 2, accuracy: 4 } }));
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.456123");
});

test("private picker never submits the exact point obtained from GPS or map", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const locate = vi.fn((ok) =>
    ok({ coords: { latitude: 43.456123, longitude: -1.456123, accuracy: 4 } }),
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: locate } });
  render(
    <form aria-label="Tienda">
      <StoreLocationPicker
        approximate
        initialPosition={{ lat: 43.456123, lng: -1.456123 }}
      />
    </form>,
  );
  const form = screen.getByRole("form", { name: "Tienda" }) as HTMLFormElement;
  expect(new FormData(form).get("publicLatitude")).toBe("43.46");
  fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación" }));
  expect(new FormData(form).get("publicLatitude")).toBe("43.46");
  act(() =>
    events.get("click")!({ latlng: { lat: 43.451123, lng: -1.451123 } }),
  );
  expect(new FormData(form).get("publicLatitude")).toBe("43.45");
});
