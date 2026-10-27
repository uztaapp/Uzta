import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import {
  Home,
  Search,
  Sprout,
  ShoppingBasket,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { DemoProvider, ModeBanner, useDemo } from "./design";
import { Inicio } from "./pages/inicio";
import { Productor } from "./pages/productor";
import { Cesta } from "./pages/cesta";
import { Pedidos } from "./pages/pedidos";
import { Perfil } from "./pages/perfil";
import { AppRecovery, RootRecovery } from "./components/app-recovery";
import { t, useLanguage } from "./lib/language";
const destinations = [
  ["/", "Inicio", Home],
  ["/productor", "Productor", Sprout],
  ["/cesta", "Cesta", ShoppingBasket],
  ["/pedidos", "Pedidos", ClipboardList],
  ["/perfil", "Perfil", UserRound],
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
        <main id="contenido">
          <AppRecovery key={pathname}>
            <Outlet />
          </AppRecovery>
        </main>
        <BottomNavigation />
      </div>
    </DemoProvider>
  );
}
function BottomNavigation() {
  useLanguage();
  const referenceNavigation = useRouterState({
    select: (state) => ["/", "/pedidos"].includes(state.location.pathname),
  });
  const { data } = useDemo();
  const count = Object.values(data.quantities).filter((q) => q > 0).length;
  return (
    <nav aria-label="Navegación principal">
      {destinations.map(([to, label, Icon]) => (
        <Link
          key={to}
          to={to}
          aria-label={
            referenceNavigation && to === "/productor" ? "Explorar" : t(label)
          }
          activeOptions={{ exact: true }}
          activeProps={{ className: "active", "aria-current": "page" }}
        >
          <span className="nav-icon">
            {referenceNavigation && to === "/productor" ? (
              <Search size={22} />
            ) : (
              <Icon size={22} />
            )}
            {to === "/cesta" && count > 0 ? (
              <span className="nav-count">{count}</span>
            ) : null}
          </span>
          <span>
            {referenceNavigation && to === "/productor" ? "Explorar" : t(label)}
          </span>
        </Link>
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
export const routeTree = root.addChildren([
  home,
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
