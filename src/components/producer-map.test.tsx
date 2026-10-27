import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ProducerMap from "./producer-map";
const { fitBounds } = vi.hoisted(() => ({ fitBounds: vi.fn() }));
vi.mock("leaflet", () => {
  const layer = () => ({
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    clearLayers: vi.fn(),
  });
  const map = {
    setView: vi.fn().mockReturnThis(),
    fitBounds,
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    invalidateSize: vi.fn(),
  };
  return {
    default: {
      map: () => map,
      tileLayer: layer,
      layerGroup: layer,
      circleMarker: layer,
      circle: layer,
      latLng: () => ({ toBounds: () => [] }),
    },
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fitBounds.mockClear();
});
test("changing catalogue results preserves the user's zoom with a location selected", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const props = {
    entries: [],
    center: { lat: 43.45, lng: -1.46 },
    radius: 5,
    onSelect: vi.fn(),
    onGroup: vi.fn(),
  };
  const view = render(<ProducerMap {...props} />);
  expect(fitBounds).toHaveBeenCalledTimes(1);
  view.rerender(<ProducerMap {...props} entries={[]} />);
  expect(fitBounds).toHaveBeenCalledTimes(1);
  view.rerender(<ProducerMap {...props} radius={10} />);
  expect(fitBounds).toHaveBeenCalledTimes(2);
});
