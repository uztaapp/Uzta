export type Position = { lat: number; lng: number };
export function validPosition(value: unknown): value is Position {
  if (!value || typeof value !== "object") return false;
  const p = value as Position;
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}
export function publicPosition(value: unknown): Position | null {
  if (!validPosition(value)) return null;
  return {
    lat: Math.round(value.lat * 1e6) / 1e6,
    lng: Math.round(value.lng * 1e6) / 1e6,
  };
}
// Adapted from the reviewed TRUKA distance helper; no account or network dependency.
export function distanceKm(a: Position, b: Position) {
  if (!validPosition(a) || !validPosition(b))
    throw Error("Coordenadas no válidas.");
  const r = 6371,
    toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function withinRadius(
  value: unknown,
  center: Position | null,
  radius: number,
) {
  if (!center) return true;
  const position = publicPosition(value);
  return (
    !!position &&
    Number.isFinite(radius) &&
    radius > 0 &&
    distanceKm(center, position) <= radius
  );
}
export function distanceLabel(center: Position, value: unknown) {
  const point = publicPosition(value);
  if (!point) return "";
  const km = distanceKm(center, point);
  return `≈ ${km < 1 ? "< 1" : km.toFixed(1)} km`;
}
export function publicMapUrl(value: unknown) {
  const p = publicPosition(value);
  if (!p) return null;
  const url = new URL("https://www.openstreetmap.org/");
  url.searchParams.set("mlat", p.lat.toFixed(6));
  url.searchParams.set("mlon", p.lng.toFixed(6));
  url.hash = `map=18/${p.lat.toFixed(6)}/${p.lng.toFixed(6)}`;
  return url.href;
}
