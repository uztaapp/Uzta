import "./brand.css";
export function Brand({
  variant = "header",
  decorative = false,
}: {
  variant?: "header" | "footer" | "main";
  decorative?: boolean;
}) {
  const dimensions =
    variant === "main"
      ? [458, 488]
      : variant === "footer"
        ? [144, 47]
        : [240, 78];
  return (
    <img
      className={`uzta-brand uzta-brand--${variant}`}
      src={`/brand/logo-${variant}.png`}
      width={dimensions[0]}
      height={dimensions[1]}
      alt={decorative ? "" : "UZTA"}
      decoding="async"
    />
  );
}
