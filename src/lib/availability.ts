export type Availability = "available" | "upcoming" | "sold_out";
export type AvailabilityFilter = "all" | "available" | "upcoming";
type Item = {
  stock: number;
  catalogVisible?: boolean;
  active: boolean;
  availability?: Availability;
  expectedAvailableOn?: string | null;
};
export const availabilityOf = (p: Item): Availability =>
  p.availability === "upcoming"
    ? "upcoming"
    : p.stock > 0
      ? "available"
      : "sold_out";
export const canReserve = (p: Item) =>
  p.active &&
  p.catalogVisible !== false &&
  availabilityOf(p) === "available" &&
  p.stock > 0;
export const matchesAvailability = (p: Item, filter: AvailabilityFilter) =>
  filter === "all" || availabilityOf(p) === filter;
export const availabilityLabel = (status: Availability) =>
  ({ available: "Disponible", upcoming: "Próximamente", sold_out: "Agotado" })[
    status
  ];
