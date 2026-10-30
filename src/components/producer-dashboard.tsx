import { MarketManager } from "./market-manager";
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
  RefreshCw,
  CheckCircle2,
  Truck,
  UserRound,
} from "lucide-react";
import { useUzta } from "../app-context";
import { useState } from "react";
import { Brand } from "./brand";
import { HeaderActions } from "./app-header";
import { NotificationBell } from "./notification-bell";
import { useMarkets } from "./market-data";
import {
  producerActivity,
  producerMarketActivity,
} from "../lib/producer-activity";
import { pickupDate } from "../lib/pickup-date";
import config from "../../config/uzta-cloud.public.json";
import type { Farm } from "../lib/local-model";
import { Photo } from "./presentation";
import { Gestion } from "../pages/gestion";
import { t, useLanguage } from "../lib/language";
import "./producer-dashboard.css";
const items = [
  ["Mi actividad", "panel", Home],
  ["Mis productos", "productos", Package],
  ["Reservas y entregas", "pedidos", ShoppingCart],
  ["Mensajes", "mensajes", MessageCircle],
  ["Calendario", "horarios", CalendarDays],
  ["Mis mercados", "mercados", CalendarDays],
  ["Mi perfil de productor", "tienda", Store],
  ["Estadísticas", "estadisticas", ChartNoAxesColumn],
  ["Ajustes", "cuenta", Settings],
] as const;
export function ProducerDashboard({ section = "panel" }: { section?: string }) {
  useLanguage();
  const { data, managedFarmId, mode } = useUzta();
  const farm = data.farms.find((f) => f.id === managedFarmId);
  if (
    !farm ||
    !data.sessionActive ||
    (mode !== "demo" && !canManageProducer(data, managedFarmId))
  )
    return null;
  const activity = producerActivity(data, farm.id);
  const pending = activity.pending.length;
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
        {section !== "panel" && (
          <header className="dashboard-header">
            <div>
              <h1>
                {t(
                  section === "nuevo"
                    ? "Añadir producto"
                    : (items.find((i) => i[1] === section)?.[0] ?? "Mi tienda"),
                )}
              </h1>
            </div>
            {section !== "nuevo" && add}
          </header>
        )}
        {section !== "panel" ? (
          <>
            {section === "mercados" ? (
              <MarketManager />
            ) : (
              <Gestion
                key={section}
                section={section === "nuevo" ? "productos" : section}
                create={section === "nuevo"}
              />
            )}
          </>
        ) : (
          <ProducerActivity farm={farm} activity={activity} />
        )}
      </div>
    </div>
  );
}

function ProducerActivity({
  farm,
  activity,
}: {
  farm: Farm;
  activity: ReturnType<typeof producerActivity>;
}) {
  const { data } = useUzta();
  const markets = useMarkets();
  const [expanded, setExpanded] = useState(false);
  const upcoming = producerMarketActivity(markets.data, farm.id);
  const marketsUnavailable =
    !config.marketsReady || markets.loading || !!markets.error;
  const avatar =
    farm.avatar === null ? undefined : (farm.avatar ?? farm.avatarUrl);
  const tasks = [
    ...activity.pending
      .slice()
      .sort(
        (a, b) =>
          Number(activity.collectionDue.has(b.id)) -
            Number(activity.collectionDue.has(a.id)) ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .map((order) => ({
        id: "order-" + order.id,
        label: activity.collectionDue.has(order.id)
          ? "Confirmar entrega"
          : "Gestionar reserva",
        title: order.lines.map((l) => l.name).join(", "),
        detail: `${pickupDate(order.pickup.date)} · ${order.pickup.start}–${order.pickup.end}`,
        photo: activity.products.find(
          (p) => p.id === order.lines[0]?.productId,
        ),
        Icon: activity.collectionDue.has(order.id) ? Truck : ShoppingCart,
        to: "/pedidos" as const,
        search: { vista: "productor", pedido: order.id },
      })),
    ...activity.depleted.map((p) => ({
      id: "stock-" + p.id,
      label: "Producto agotado",
      title: p.name,
      detail: t("Revisar existencias"),
      photo: p,
      Icon: RefreshCw,
      to: "/perfil" as const,
      search: { apartado: "productos" },
    })),
    ...upcoming.map((o) => ({
      id: "market-" + o.market.id,
      label: "Preparar mercado",
      title: o.market.name,
      detail: `${o.market.locality} · ${pickupDate(o.day)}${o.opens && o.closes ? ` · ${o.opens}–${o.closes}` : ""}`,
      photo: undefined,
      Icon: CalendarDays,
      to: "/perfil" as const,
      search: { apartado: "mercados" },
    })),
  ];
  const metrics = [
    {
      value: activity.active,
      label: "Productos activos",
      Icon: Package,
      color: "green",
      to: "/perfil",
      search: { apartado: "productos" },
    },
    {
      value: activity.pending.length,
      label: "Reservas pendientes",
      Icon: ShoppingCart,
      color: "orange",
      to: "/pedidos",
      search: { vista: "productor" },
    },
    {
      value: marketsUnavailable ? "—" : upcoming.length,
      label: "Próximos mercados confirmados",
      Icon: CalendarDays,
      color: "blue",
      to: "/perfil",
      search: { apartado: "mercados" },
    },
    {
      value: activity.completed,
      label: "Entregas realizadas",
      Icon: CheckCircle2,
      color: "purple",
      to: "/pedidos",
      search: { vista: "productor" },
    },
  ] as const;
  return (
    <section
      className="producer-activity"
      aria-labelledby="producer-activity-title"
    >
      <HeaderActions>
        <div className="activity-identity">
          <Brand variant="footer" />
          <NotificationBell />
          <Link
            className="activity-avatar"
            to="/perfil"
            search={{ apartado: "cuenta" }}
            aria-label={t("Mi perfil")}
          >
            <Photo src={avatar} crop={[0, 0, 0, 0]} label={data.profile.name} />
          </Link>
        </div>
      </HeaderActions>
      <header className="activity-intro">
        <h1 id="producer-activity-title">{t("Mi actividad")}</h1>
        <h2>
          {t("Hola")}, {data.profile.name.trim().split(/\s+/)[0] || farm.name}
        </h2>
        <p>{t("Aquí tienes un resumen de tu actividad")}</p>
      </header>
      <div className="dashboard-metrics" aria-label={t("Resumen de actividad")}>
        {metrics.map(({ value, label, Icon, color, to, search }) => (
          <Link
            key={label}
            to={to}
            search={search}
            className={`metric ${color}`}
          >
            <span className="metric-icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <strong>{value}</strong>
            <span>{t(label)}</span>
          </Link>
        ))}
      </div>
      {markets.loading && (
        <p className="activity-status" role="status">
          {t("Cargando mercados…")}
        </p>
      )}
      {markets.error && (
        <div className="activity-status" role="alert">
          <p>{t(markets.error)}</p>
          <button type="button" onClick={markets.reload}>
            {t("Reintentar")}
          </button>
        </div>
      )}
      {!config.marketsReady && (
        <p className="activity-status">
          {t("Mercados pendiente de activación. No se han guardado cambios.")}
        </p>
      )}
      <div className="activity-quick" aria-label={t("Gestión rápida")}>
        <Link
          className="activity-add"
          to="/perfil"
          search={{ apartado: "nuevo" }}
        >
          <Plus size={25} aria-hidden="true" />
          <span>
            <strong>{t("Añadir producto")}</strong>
            <small>{t("Publica con el formulario habitual")}</small>
          </span>
          <ChevronRight size={19} aria-hidden="true" />
        </Link>
        <Link to="/perfil" search={{ apartado: "productos" }}>
          <RefreshCw size={22} aria-hidden="true" />
          {t("Reponer producto")}
        </Link>
        {config.marketsReady && (
          <Link to="/perfil" search={{ apartado: "mercados" }}>
            <CalendarDays size={22} aria-hidden="true" />
            {t("Añadir mercado")}
          </Link>
        )}
      </div>
      <section
        className="activity-tasks"
        aria-labelledby="activity-tasks-title"
      >
        <div className="dashboard-section-title">
          <h2 id="activity-tasks-title">{t("Tareas pendientes")}</h2>
          {tasks.length > 5 && (
            <button
              type="button"
              className="text-button"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {t(expanded ? "Ver menos" : "Ver todas")}
            </button>
          )}
        </div>
        {!tasks.length && (
          <p className="activity-empty">
            <CheckCircle2 size={21} aria-hidden="true" />
            {t("Todo al día. No tienes tareas pendientes.")}
          </p>
        )}
        {(expanded ? tasks : tasks.slice(0, 5)).map(
          ({ id, label, title, detail, photo, Icon, to, search }) => (
            <Link
              className="activity-task"
              key={id}
              to={to}
              search={search}
              aria-label={`${t(label)} · ${title}`}
            >
              {photo ? (
                <Photo
                  src={
                    photo.photo === null
                      ? undefined
                      : (photo.photo ?? photo.photoUrl)
                  }
                  crop={photo.crop}
                  label={photo.name}
                />
              ) : (
                <span className="activity-task-icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
              )}
              <span>
                <strong>{t(label)}</strong>
                <span>{title}</span>
                <small>{detail}</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ),
        )}
      </section>
      <nav
        className="activity-sections"
        aria-label={t("Herramientas del productor")}
      >
        {[
          {
            label: "Mis productos",
            Icon: Package,
            to: "/perfil",
            search: { apartado: "productos" },
          },
          {
            label: "Reservas y entregas",
            Icon: ShoppingCart,
            to: "/pedidos",
            search: { vista: "productor" },
          },
          ...(config.marketsReady
            ? [
                {
                  label: "Mis mercados y ferias",
                  Icon: CalendarDays,
                  to: "/perfil",
                  search: { apartado: "mercados" },
                },
              ]
            : []),
          {
            label: "Mi perfil de productor",
            Icon: UserRound,
            to: "/perfil",
            search: { apartado: "tienda" },
          },
        ].map(({ label, Icon, to, search }) => (
          <Link key={label} to={to} search={search}>
            <Icon size={21} aria-hidden="true" />
            <span>{t(label)}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        ))}
        <Link to="/productor" search={{ tienda: farm.id }}>
          <ExternalLink size={21} aria-hidden="true" />
          <span>{t("Ver mi perfil público")}</span>
          <ChevronRight size={17} aria-hidden="true" />
        </Link>
      </nav>
      <details className="activity-more">
        <summary>{t("Más herramientas")}</summary>
        <div className="dashboard-mobile-menu">
          <Link to="/perfil" search={{ apartado: "horarios" }}>
            <CalendarDays size={20} />
            {t("Horarios y entregas")}
            <ChevronRight size={17} />
          </Link>
          <Link to="/perfil" search={{ apartado: "estadisticas" }}>
            <ChartNoAxesColumn size={20} />
            {t("Estadísticas")}
            <ChevronRight size={17} />
          </Link>
          <Link to="/perfil" search={{ apartado: "ventas" }}>
            <Store size={20} />
            {t("Mis ventas")}
            <ChevronRight size={17} />
          </Link>
          <Link to="/perfil" search={{ apartado: "cuenta" }}>
            <Settings size={20} />
            {t("Ajustes")}
            <ChevronRight size={17} />
          </Link>
          <span className="dashboard-unavailable" aria-disabled="true">
            <MessageCircle size={20} />
            <span>
              {t("Mensajes")}
              <small>{t("No disponible todavía")}</small>
            </span>
          </span>
        </div>
      </details>
    </section>
  );
}
