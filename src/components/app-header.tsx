import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { Heart } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useNavigationOrigin } from "./navigation-origin";
import { Brand } from "./brand";
import { BackLink } from "./back-link";
import { NotificationBell } from "./notification-bell";
import { t, useLanguage } from "../lib/language";
import "./app-header.css";

const sectionTitles: Record<string, string> = {
  "/cesta": "Cesta de compra",
  "/pedidos": "Mis pedidos",
  "/perfil": "Mi perfil",
};
const Actions = createContext<{ target: HTMLDivElement | null } | null>(null);
export function HeaderActions({ children }: { children: ReactNode }) {
  const context = useContext(Actions);
  if (!context) return <>{children}</>;
  return context.target ? createPortal(children, context.target) : null;
}
function HeaderFrame({
  home = false,
  title,
  left,
  right,
  actionsRef,
}: {
  home?: boolean;
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  actionsRef?: Ref<HTMLDivElement>;
}) {
  useLanguage();
  return (
    <header
      className={`app-header${home ? " app-header--home" : " app-header--compact"}`}
      aria-label={t("Cabecera de UZTA")}
    >
      <div className="app-header-navigation">
        <div className="app-header-back">{left}</div>
        {title && (
          <span className="app-header-title" aria-hidden="true">
            {t(title)}
          </span>
        )}
        <div className="app-header-right">
          {right}
          <div ref={actionsRef} className="app-header-actions" />
        </div>
      </div>
      {home && (
        <div className="app-header-brand">
          <Brand />
          <small>{t("Del productor a tu mesa")}</small>
        </div>
      )}
    </header>
  );
}
export function HeaderLoading() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  if (pathname === "/explorar")
    return (
      <p role="status" className="loading-status">
        {t("Abriendo UZTA…")}
      </p>
    );
  return (
    <div className="app">
      <HeaderFrame home={pathname === "/"} title={sectionTitles[pathname]} />
      <p role="status" className="sr-only">
        {t("Abriendo UZTA…")}
      </p>
    </div>
  );
}
export function HeaderLayout({ children }: { children: ReactNode }) {
  useLanguage();
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const origin = useNavigationOrigin();
  const section = (location.search as { apartado?: string }).apartado;
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const personal = ["solicitudes", "favoritos", "comisiones"].includes(
    section ?? "",
  );
  const internalProfile =
    pathname === "/perfil" &&
    !!section &&
    !["panel", "cuenta"].includes(section);
  return (
    <Actions.Provider value={{ target }}>
      {pathname !== "/explorar" && (
        <HeaderFrame
          home={pathname === "/"}
          title={sectionTitles[pathname]}
          actionsRef={setTarget}
          right={pathname === "/" ? <NotificationBell /> : null}
          left={
            pathname === "/" ? (
              <Link
                to="/perfil"
                search={{ apartado: "favoritos" }}
                state={{ favoriteReturnTo: "/" }}
                className="uzta-back uzta-back--compact"
                aria-label={t("Mis favoritos")}
                title={t("Mis favoritos")}
              >
                <Heart size={22} aria-hidden="true" />
              </Link>
            ) : pathname === "/perfil" &&
              section === "favoritos" &&
              location.state.favoriteReturnTo === "/" ? (
              <BackLink compact />
            ) : internalProfile || pathname === "/privacidad" ? (
              <BackLink
                compact
                to="/perfil"
                section={
                  personal || pathname === "/privacidad" ? "cuenta" : "panel"
                }
                label={
                  personal || pathname === "/privacidad"
                    ? "Volver al perfil"
                    : "Volver al panel"
                }
              />
            ) : (
              <BackLink
                compact
                to={pathname === "/productor" && origin ? origin : "/"}
              />
            )
          }
        />
      )}
      {children}
    </Actions.Provider>
  );
}
