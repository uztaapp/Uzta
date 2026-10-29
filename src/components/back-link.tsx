import type { NavigationSection } from "./navigation-origin";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { t, useLanguage } from "../lib/language";
import "./back-link.css";

// Explicit internal destinations also work when a page is opened directly.
export function BackLink({
  to = "/",
  section,
  label,
  compact = false,
}: {
  to?: NavigationSection;
  section?: string;
  label?: string;
  compact?: boolean;
}) {
  useLanguage();
  const backLabel =
    label ??
    (to === "/"
      ? "Volver al inicio"
      : to === "/perfil"
        ? "Volver al perfil"
        : "Volver");
  return (
    <Link
      to={to}
      search={to === "/perfil" ? { apartado: section } : {}}
      className={`uzta-back${compact ? " uzta-back--compact" : ""}`}
      aria-label={t(backLabel)}
      title={t(backLabel)}
    >
      <ArrowLeft size={22} aria-hidden="true" />
      {!compact && <span>{t(backLabel)}</span>}
    </Link>
  );
}
