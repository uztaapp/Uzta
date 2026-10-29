import { canManageProducer } from "../lib/producer-approval";
import { Link } from "@tanstack/react-router";
import {
  Home,
  Package,
  ShoppingCart,
  MessageCircle,
  CalendarDays,
  Store,
  ChartNoAxesColumn,
  Settings,
  Plus,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useUzta } from "../app-context";
import { Brand } from "./brand";
import { StoreCover } from "./store-cover";
import { Photo } from "./presentation";
import { euro as money } from "../lib/local-model";
import { AvailabilityLabel } from "./product-availability";
import { Gestion } from "../pages/gestion";
import { t, useLanguage, currentLanguage } from "../lib/language";
import "./producer-dashboard.css";
const items = [
  ["Inicio", "panel", Home],
  ["Productos", "productos", Package],
  ["Pedidos", "pedidos", ShoppingCart],
  ["Mensajes", "mensajes", MessageCircle],
  ["Calendario", "horarios", CalendarDays],
  ["Mi tienda", "tienda", Store],
  ["Estadísticas", "estadisticas", ChartNoAxesColumn],
  ["Ajustes", "cuenta", Settings],
] as const;
export function ProducerDashboard({ section = "panel" }: { section?: string }) {
  useLanguage();
  const { data, managedFarmId } = useUzta();
  const farm = data.farms.find((f) => f.id === managedFarmId);
  if (!farm || !data.sessionActive || !canManageProducer(data, managedFarmId))
    return null;
  const products = data.products.filter(
      (p) => p.farmId === farm.id && p.catalogVisible !== false,
    ),
    orders = data.orders.filter((o) => o.farmId === farm.id && !o.example);
  const pending = orders.filter((o) => o.status === "Pendiente").length;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Europe/Madrid",
    }).format(new Date()),
  );
  const greeting =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const add = (
    <Link
      className="primary dashboard-add"
      to="/perfil"
      search={{ apartado: "nuevo" }}
    >
      <Plus size={18} />
      {t("Añadir producto")}
    </Link>
  );
  function destination(label: string, key: string, Icon: typeof Home) {
    if (key === "mensajes")
      return (
        <span className="dashboard-unavailable" aria-disabled="true">
          <Icon size={20} />
          <span>
            {t(label)}
            <small>{t("No disponible todavía")}</small>
          </span>
        </span>
      );
    return (
      <Link
        to={key === "pedidos" ? "/pedidos" : "/perfil"}
        search={key === "pedidos" ? { vista: "productor" } : { apartado: key }}
        className={section === key ? "selected" : ""}
      >
        <Icon size={20} />
        <span>{t(label)}</span>
        {key === "pedidos" && pending > 0 ? (
          <b>{pending}</b>
        ) : (
          <ChevronRight size={16} />
        )}
      </Link>
    );
  }
  return (
    <div className="producer-dashboard">
      <aside className="dashboard-sidebar">
        <Brand />
        {items.map(([label, key, Icon]) => (
          <div key={key}>{destination(label, key, Icon)}</div>
        ))}
        <Link
          className="dashboard-public"
          to="/productor"
          search={{ tienda: farm.id }}
        >
          <ExternalLink size={16} />
          {t("Ver mi perfil público")}
        </Link>
      </aside>
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>
              {section === "panel"
                ? `${t(greeting)}, ${data.profile.name.split(" ")[0] || farm.name} 👋`
                : t(
                    section === "nuevo"
                      ? "Añadir producto"
                      : (items.find((i) => i[1] === section)?.[0] ??
                          "Mi tienda"),
                  )}
            </h1>
            <p>{t("Aquí tienes un resumen de tu actividad")}</p>
          </div>
          {add}
        </header>
        {section !== "panel" ? (
          <>
            <Link
              className="text-button"
              to="/perfil"
              search={{ apartado: "panel" }}
            >
              {t("Volver al panel")}
            </Link>
            <Gestion
              key={section}
              section={section === "nuevo" ? "productos" : section}
              create={section === "nuevo"}
            />
          </>
        ) : (
          <>
            <section className="dashboard-store-mobile">
              <Brand />
              <div className="dashboard-store-title">
                <h2>{t("Mi tienda")}</h2>
                <Link to="/productor" search={{ tienda: farm.id }}>
                  {t("Ver perfil")} ›
                </Link>
              </div>
              <div className="dashboard-cover">
                <StoreCover farm={farm} crop={[0, 0, 0, 0]} label={farm.name} />
                <Link to="/perfil" search={{ apartado: "tienda" }}>
                  {t("Cambiar portada")}
                </Link>
              </div>
              <div className="dashboard-farm-name">
                <Link
                  to="/perfil"
                  search={{ apartado: "tienda" }}
                  aria-label={t("Cambiar foto del productor")}
                >
                  <Photo
                    src={
                      farm.avatar === null
                        ? undefined
                        : (farm.avatar ?? farm.avatarUrl)
                    }
                    crop={[0, 0, 0, 0]}
                    label={farm.name}
                  />
                </Link>
                <div>
                  <h2>{farm.name}</h2>
                  <p>{data.profile.name}</p>
                </div>
              </div>
            </section>
            <section
              className="dashboard-metrics"
              aria-label={t("Resumen de actividad")}
            >
              {[
                [
                  products.filter((p) => p.active).length,
                  "Productos activos",
                  Package,
                  "green",
                ],
                [pending, "Pedidos pendientes", ShoppingCart, "orange"],
                ["—", "Mensajes nuevos", MessageCircle, "blue"],
                ["—", "Visitas esta semana", ChartNoAxesColumn, "green"],
              ].map(([value, label, Icon, color]) => {
                const Symbol = Icon as typeof Home;
                return (
                  <div className={`metric ${color}`} key={String(label)}>
                    <Symbol size={28} />
                    <div>
                      <strong>{String(value)}</strong>
                      <span>{t(String(label))}</span>
                      {value === "—" && (
                        <small>{t("No disponible todavía")}</small>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
            <div className="dashboard-mobile-add">{add}</div>
            <div className="dashboard-mobile-menu">
              {items.slice(1).map(([label, key, Icon]) => (
                <div key={key}>{destination(label, key, Icon)}</div>
              ))}
            </div>
            <section className="dashboard-quick">
              <div>
                <h2>{t("Gestión rápida")}</h2>
                <div className="dashboard-actions">
                  <Link to="/perfil" search={{ apartado: "nuevo" }}>
                    <Package />
                    {t("Añadir producto")} ›
                  </Link>
                  <Link to="/pedidos" search={{ vista: "productor" }}>
                    <ShoppingCart />
                    {t("Ver pedidos")} ›
                  </Link>
                  <span aria-disabled="true">
                    <MessageCircle />
                    {t("Ver mensajes")}
                    <small>{t("No disponible todavía")}</small>
                  </span>
                  <Link to="/perfil" search={{ apartado: "productos" }}>
                    <CalendarDays />
                    {t("Actualizar disponibilidad")} ›
                  </Link>
                </div>
              </div>
              <div className="dashboard-tip">
                <Store size={42} />
                <h2>{t("Tu tienda siempre al día")}</h2>
                <p>
                  {t(
                    "Añade productos y gestiona tus pedidos desde un mismo lugar.",
                  )}
                </p>
              </div>
            </section>
            <div className="dashboard-lower">
              <section className="dashboard-products">
                <div className="dashboard-section-title">
                  <h2>{t("Tus productos")}</h2>
                  <Link to="/perfil" search={{ apartado: "productos" }}>
                    {t("Ver todos")} ›
                  </Link>
                </div>
                <div className="dashboard-product-grid">
                  {products.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      to="/perfil"
                      search={{ apartado: "productos" }}
                    >
                      <Photo
                        src={
                          p.photo === null ? undefined : (p.photo ?? p.photoUrl)
                        }
                        crop={[0, 0, 0, 0]}
                        label={p.name}
                      />
                      <h3>{p.name}</h3>
                      <strong>
                        {money(p.priceCents)} / {p.unit}
                      </strong>
                      <AvailabilityLabel product={p} />
                      <small>
                        {t(p.active ? "Publicado" : "Oculto")} · {p.stock}{" "}
                        {p.unit}
                      </small>
                    </Link>
                  ))}
                  <Link
                    className="dashboard-new-product"
                    to="/perfil"
                    search={{ apartado: "nuevo" }}
                  >
                    <Plus />
                    {t("Añadir producto")}
                  </Link>
                </div>
                {!products.length && (
                  <p>{t("Todavía no tienes productos publicados.")}</p>
                )}
              </section>
              <section className="dashboard-orders">
                <div className="dashboard-section-title">
                  <h2>{t("Pedidos recientes")}</h2>
                  <Link to="/pedidos" search={{ vista: "productor" }}>
                    {t("Ver todos")} ›
                  </Link>
                </div>
                {orders
                  .slice()
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 3)
                  .map((o) => (
                    <Link
                      className="dashboard-order"
                      key={o.id}
                      to="/pedidos"
                      search={{ vista: "productor", pedido: o.id }}
                    >
                      <Photo
                        crop={[0, 0, 0, 0]}
                        src={
                          data.products.find(
                            (p) => p.id === o.lines[0]?.productId,
                          )?.photoUrl
                        }
                        label={o.lines[0]?.name ?? t("Pedido")}
                      />
                      <div>
                        <strong>{o.lines.map((l) => l.name).join(", ")}</strong>
                        <small>
                          {o.lines.reduce((n, l) => n + l.quantity, 0)} ·{" "}
                          {money(
                            o.lines.reduce(
                              (n, l) => n + l.priceCents * l.quantity,
                              0,
                            ),
                          )}
                        </small>
                        <small>
                          {new Intl.DateTimeFormat(currentLanguage(), {
                            dateStyle: "short",
                          }).format(new Date(o.createdAt))}
                        </small>
                      </div>
                      <span
                        className={
                          o.status === "Pendiente"
                            ? "dashboard-status pending"
                            : "dashboard-status"
                        }
                      >
                        {t(o.status)}
                      </span>
                    </Link>
                  ))}
                {!orders.length && <p>{t("No hay pedidos todavía")}</p>}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
