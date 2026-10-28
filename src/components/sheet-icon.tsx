import "./sheet-icon.css";
export type SheetIconName =
  | "home"
  | "location"
  | "basket"
  | "store"
  | "calendar"
  | "heart"
  | "star"
  | "profile"
  | "vegetables"
  | "fruit"
  | "eggs"
  | "dairy"
  | "honey"
  | "other";
export function SheetIcon({ name }: { name: SheetIconName }) {
  return (
    <img
      className="sheet-icon"
      src={`/brand/icons/${name}.png`}
      width="80"
      height="80"
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}
