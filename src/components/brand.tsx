import "./brand.css";
export function Brand({
  variant = "header",
  decorative = false,
}: {
  variant?: "header" | "footer" | "main";
  decorative?: boolean;
}) {
  const size = variant === "main" ? 1254 : variant === "footer" ? 480 : 240;
  return (
    <img
      className={`uzta-brand uzta-brand--${variant}`}
      src={`/brand/logo-${variant}.png`}
      srcSet="/brand/logo-header.png 240w, /brand/logo-footer.png 480w, /brand/logo-main.png 1254w"
      sizes={
        variant === "main" ? "150px" : variant === "footer" ? "48px" : "96px"
      }
      width={size}
      height={size}
      alt={decorative ? "" : "UZTA"}
      decoding="async"
    />
  );
}
