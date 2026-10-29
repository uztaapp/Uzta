import "./brand.css";
export function Brand({
  variant = "header",
  decorative = false,
}: {
  variant?: "header" | "footer" | "main";
  decorative?: boolean;
}) {
  const size = variant === "main" ? 128 : variant === "footer" ? 48 : 128;
  return (
    <img
      className={`uzta-brand uzta-brand--${variant}`}
      src={`/brand/logo-${variant}.png`}
      srcSet="/brand/logo-header.png 240w, /brand/logo-footer.png 480w, /brand/logo-main.png 1254w"
      sizes={
        variant === "main" ? "128px" : variant === "footer" ? "48px" : "128px"
      }
      width={size}
      height={size}
      alt={decorative ? "" : "UZTA"}
      decoding="async"
    />
  );
}
