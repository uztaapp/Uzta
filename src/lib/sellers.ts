import { publicPosition, type Position } from "./nearby";
export type SellerType = "professional" | "private";
export function sellerPosition(
  value: unknown,
  type?: SellerType | null,
): Position | null {
  const p = publicPosition(value);
  return p && type === "private"
    ? { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 }
    : p;
}
export function sellerLabel(type?: SellerType | null) {
  return type === "private"
    ? "Particular"
    : type === "professional"
      ? "Agricultor profesional"
      : "Tipo sin indicar";
}

export function sellerMarkerClass(type?: SellerType | null) {
  return type === "private"
    ? " uzta-map-private"
    : type === "professional"
      ? ""
      : " uzta-map-unclassified";
}
