import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Link,
} from "@tanstack/react-router";
import {
  Home,
  Sprout,
  ShoppingBasket,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { DemoProvider, ModeBanner } from "./design";
import { Inicio } from "./pages/inicio";
import { Productor } from "./pages/productor";
import { Cesta } from "./pages/cesta";
import { Pedidos } from "./pages/pedidos";
import { Perfil } from "./pages/perfil";
const destinations = [
  ["/", "Inicio", Home],
  ["/productor", "Productor", Sprout],
  ["/cesta", "Cesta", ShoppingBasket],
  ["/pedidos", "Pedidos", ClipboardList],
  ["/perfil", "Perfil", UserRound],
] as const;
export function Shell() {
  return (
    <DemoProvider>
      <ModeBanner />
      <div className="app">
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        <main id="contenido">
          <Outlet />
        </main>
        <nav aria-label="Navegación principal">
          {destinations.map(([to, label, Icon]) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "active", "aria-current": "page" }}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </DemoProvider>
  );
}
const root = createRootRoute({
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
