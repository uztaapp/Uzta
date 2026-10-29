import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

export const sections = [
  "/",
  "/explorar",
  "/cesta",
  "/pedidos",
  "/perfil",
] as const;
export type NavigationSection = (typeof sections)[number];
const Origin = createContext<NavigationSection | null>(null);
const prefix = "uzta-navigation-v1:";
function valid(value: unknown): value is NavigationSection {
  return sections.includes(value as NavigationSection);
}
export function NavigationOrigin({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (state) => state.location });
  const previous = useRef<NavigationSection | null>(null);
  const search = location.search as { apartado?: string; pedido?: string };
  const nested =
    location.pathname === "/productor" ||
    location.pathname === "/privacidad" ||
    (location.pathname === "/perfil" &&
      !!search.apartado &&
      !["panel", "cuenta"].includes(search.apartado)) ||
    (location.pathname === "/pedidos" && !!search.pedido);
  const key =
    prefix +
    (location.state.__TSR_key ?? location.state.key ?? location.href) +
    ":" +
    location.href;
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem(key);
  } catch {
    /* Navigation still works when storage is unavailable. */
  }
  const section =
    !nested && valid(location.pathname)
      ? location.pathname
      : valid(saved)
        ? saved
        : previous.current;
  useEffect(() => {
    previous.current = section;
    if (section) {
      try {
        sessionStorage.setItem(key, section);
      } catch {
        /* Optional reload persistence. */
      }
    }
  }, [key, section]);
  return <Origin.Provider value={section}>{children}</Origin.Provider>;
}
export function useNavigationOrigin() {
  return useContext(Origin);
}
