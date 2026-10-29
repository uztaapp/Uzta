import { Mercados } from "./pages/mercados";
import {
  NavigationOrigin,
  useNavigationOrigin,
  type NavigationSection,
} from "./components/navigation-origin";
import { SheetIcon } from "./components/sheet-icon";
import { Privacidad } from "./pages/privacidad";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
  useRouterState,
  useLinkProps,
} from "@tanstack/react-router";
import { DemoProvider, ModeBanner, useDemo } from "./design";
import { lazy, Suspense } from "react";
const Explorar = lazy(() =>
  import("./pages/explorar").then((module) => ({ default: module.Explorar })),
);
function ExploreRoute() {
  return (
    <Suspense fallback={<p role="status">Cargando Explorar…</p>}>
      <Explorar />
    </Suspense>
  );
}
import { HeaderLayout } from "./components/app-header";
import { Inicio } from "./pages/inicio";
import { Productor } from "./pages/productor";
import { Cesta } from "./pages/cesta";
import { Pedidos } from "./pages/pedidos";
import { Perfil } from "./pages/perfil";
import { AppRecovery, RootRecovery } from "./components/app-recovery";
import { t, useLanguage } from "./lib/language";
const destinations = [
  ["/", "Inicio", "home"],
  ["/explorar", "Explorar", "location"],
  ["/cesta", "Cesta", "basket"],
  ["/pedidos", "Pedidos", "calendar"],
  ["/perfil", "Perfil", "profile"],
] as const;
export function Shell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return (
    <DemoProvider>
      <ModeBanner />
      <div className="app">
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        <NavigationOrigin>
          <HeaderLayout>
            <main id="contenido">
              <AppRecovery key={pathname}>
                <Outlet />
              </AppRecovery>
            </main>
            <BottomNavigation />
          </HeaderLayout>
        </NavigationOrigin>
      </div>
    </DemoProvider>
  );
}
function NavigationItem({
  to,
  label,
  children,
}: {
  to: NavigationSection;
  label: string;
  children: React.ReactNode;
}) {
  const section = useNavigationOrigin();
  const props = useLinkProps({ to });
  const active = section === to;
  return (
    <a
      {...props}
      aria-label={t(label)}
      className={active ? "active" : undefined}
      aria-current={active ? "page" : undefined}
      data-status={active ? "active" : undefined}
    >
      {children}
    </a>
  );
}
function BottomNavigation() {
  useLanguage();
  const { data } = useDemo();
  const count = Object.values(data.quantities).filter((q) => q > 0).length;
  return (
    <nav className="bottom-navigation" aria-label="Navegación principal">
      {destinations.map(([to, label, icon]) => (
        <NavigationItem key={to} to={to} label={label}>
          <span className="nav-icon">
            <SheetIcon name={icon} />
            {to === "/cesta" && count > 0 ? (
              <span className="nav-count">{count}</span>
            ) : null}
          </span>
          <span>{t(label)}</span>
        </NavigationItem>
      ))}
    </nav>
  );
}
const root = createRootRoute({
  errorComponent: RootRecovery,
  component: Shell,
  notFoundComponent: () => (
    <>
      <h1>Página no encontrada</h1>
      <Link to="/">Volver al inicio</Link>
    </>
  ),
});
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  component: Inicio,
});
const explore = createRoute({
  getParentRoute: () => root,
  path: "/explorar",
  component: ExploreRoute,
});
const producer = createRoute({
  getParentRoute: () => root,
  path: "/productor",
  validateSearch: (s: Record<string, unknown>): { tienda?: string } => ({
    tienda: typeof s.tienda === "string" ? s.tienda : undefined,
  }),
  component: Productor,
});
const basket = createRoute({
  getParentRoute: () => root,
  path: "/cesta",
  component: Cesta,
});
const orders = createRoute({
  getParentRoute: () => root,
  path: "/pedidos",
  validateSearch: (
    s: Record<string, unknown>,
  ): { pedido?: string; vista?: string } => ({
    pedido: typeof s.pedido === "string" ? s.pedido : undefined,
    vista: typeof s.vista === "string" ? s.vista : undefined,
  }),
  component: Pedidos,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/perfil",
  validateSearch: (s: Record<string, unknown>): { apartado?: string } => ({
    apartado: typeof s.apartado === "string" ? s.apartado : undefined,
  }),
  component: Perfil,
});
const markets = createRoute({
  getParentRoute: () => root,
  path: "/mercados",
  validateSearch: (s: Record<string, unknown>): { mercado?: string } => ({
    mercado: typeof s.mercado === "string" ? s.mercado : undefined,
  }),
  component: Mercados,
});
const privacy = createRoute({
  getParentRoute: () => root,
  path: "/privacidad",
  component: Privacidad,
});
export const routeTree = root.addChildren([
  privacy,
  markets,
  home,
  explore,
  producer,
  basket,
  orders,
  profile,
]);
export const router = createRouter({ routeTree });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
