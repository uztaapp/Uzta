import { useEffect, useSyncExternalStore } from "react";
import { validPosition, distanceKm, type Position } from "./nearby";
type Snapshot = {
  point: Position | null;
  locality: string;
  source: "automatic" | "manual" | null;
  status: "idle" | "pending" | "ready" | "unavailable";
};
let snapshot: Snapshot = {
  point: null,
  locality: "",
  source: null,
  status: "idle",
};
let manualVersion = 0;
export function getBuyerLocation() {
  return snapshot;
}
const listeners = new Set<() => void>();
function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
}
const attemptKey = "uzta.buyer-location.attempted";
export function selectBuyerLocality(locality: string, point?: Position | null) {
  manualVersion++;
  update({
    locality: locality.trim().slice(0, 200),
    point: point && validPosition(point) ? approximate(point) : null,
    source: "manual",
    status: "ready",
  });
}
function approximate(p: Position): Position {
  return {
    lat: Math.round(p.lat * 100) / 100,
    lng: Math.round(p.lng * 100) / 100,
  };
}
export async function locateBuyer(automatic = false) {
  if (
    snapshot.status === "pending" ||
    (automatic && (snapshot.source || snapshot.status === "unavailable"))
  )
    return;
  const version = manualVersion;
  let attempted = false;
  try {
    attempted = sessionStorage.getItem(attemptKey) === "1";
  } catch {
    /* Private browsing still uses the in-memory guard. */
  }
  let permission: PermissionState | undefined;
  try {
    permission = (await navigator.permissions?.query({ name: "geolocation" }))
      .state;
  } catch {
    /* Unsupported Permissions API. */
  }
  if (
    automatic &&
    (permission === "denied" || (attempted && permission !== "granted"))
  ) {
    update({ status: "unavailable" });
    return;
  }
  if (
    getBuyerLocation().status === "pending" ||
    version !== manualVersion ||
    (automatic && snapshot.source)
  )
    return;
  if (!navigator.geolocation) {
    update({ status: "unavailable" });
    return;
  }
  update({ status: "pending" });
  try {
    sessionStorage.setItem(attemptKey, "1");
  } catch {
    /* No location is persisted. */
  }
  try {
    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (version !== manualVersion) return;
        const point = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };
        update(
          validPosition(point)
            ? {
                point: approximate(point),
                locality: "",
                source: "automatic",
                status: "ready",
              }
            : { status: "unavailable" },
        );
      },
      () => {
        if (version === manualVersion) update({ status: "unavailable" });
      },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 },
    );
  } catch {
    update({ status: "unavailable" });
  }
}
export function useBuyerLocation(automatic = false) {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => snapshot,
  );
  useEffect(() => {
    if (automatic) void locateBuyer(true);
  }, [automatic]);
  return value;
}
export function nearbyLocality(
  point: Position | null,
  farms: {
    location: string;
    position?: Position | null;
    catalogVisible?: boolean;
  }[],
) {
  if (!point) return "";
  const sorted = farms
    .filter((f) => f.catalogVisible !== false && validPosition(f.position))
    .map((f) => ({
      label: f.location,
      distance: distanceKm(point, f.position!),
    }))
    .sort((a, b) => a.distance - b.distance);
  return sorted[0]?.distance <= 20 ? sorted[0].label : "";
}
export function localityMatches(a: string, b: string) {
  const clean = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();
  return clean(a).includes(clean(b));
}
