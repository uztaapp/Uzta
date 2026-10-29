import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { t, useLanguage } from "../lib/language";
import "./back-link.css";

// Explicit internal destinations also work when a page is opened directly.
export function BackLink({
  to = "/",
  section,
  label = "Volver al inicio",
  compact = false,
}: {
  to?: "/" | "/perfil";
  section?: string;
  label?: string;
  compact?: boolean;
}) {
  useLanguage();
  return (
    <Link
      to={to}
      search={to === "/perfil" ? { apartado: section } : {}}
      className={`uzta-back${compact ? " uzta-back--compact" : ""}`}
      aria-label={t(label)}
      title={t(label)}
    >
      <ArrowLeft size={22} aria-hidden="true" />
      {!compact && <span>{t(label)}</span>}
    </Link>
  );
}
