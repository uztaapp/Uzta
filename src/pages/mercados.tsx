import {
  marketCatalogue,
  marketCatalogueData,
  isCatalogueReview,
} from "../lib/market-catalogue";
import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useMarkets } from "../components/market-data";
import { useUzta } from "../app-context";
import {
  marketOccurrences,
  marketPresence,
  filterMarkets,
  addDays,
  localDay,
  marketTypeLabels,
  pickupInstant,
  type Market,
  type MarketOccurrence,
} from "../lib/markets";
import { useBuyerLocation, locateBuyer } from "../lib/buyer-location";
import { categories, type Farm } from "../lib/local-model";
import { pickupDate } from "../lib/pickup-date";
import { t, useLanguage, currentLanguage } from "../lib/language";
import config from "../../config/uzta-cloud.public.json";
import "./mercados.css";
import "./explorar.css";
const Map = lazy(() => import("../components/producer-map"));
export function Mercados() {
  useLanguage();
  const state = useMarkets();
  const catalogueReview = isCatalogueReview(
    (import.meta.env.DEV && import.meta.env.MODE !== "test") ||
      import.meta.env.UZTA_MARKET_CATALOG_REVIEW === true,
    config.marketsReady,
    state.error,
  );
  const data = catalogueReview ? marketCatalogueData() : state.data;
  const { data: app } = useUzta();
  const buyer = useBuyerLocation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mercado?: string };
  const today = localDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState("");
  const [view, setView] = useState("Calendario");
  const [query, setQuery] = useState("");
  const [locality, setLocality] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState(0);
  const [date, setDate] = useState("");
  const first = month + "-01",
    nextMonth = new Date(Date.parse(first + "T12:00:00Z"));
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const last = addDays(nextMonth.toISOString().slice(0, 10), -1);
  const all = marketOccurrences(data, today, addDays(today, 90)).filter((o) => {
    if (o.day > today || !o.closes) return true;
    try {
      return (
        Date.parse(pickupInstant(o.day, o.closes, o.market.timezone)) >
        Date.now()
      );
    } catch {
      return true;
    }
  });
  const filtered = filterMarkets(all, {
    query,
    locality,
    category,
    date,
    radius,
    position: buyer.point,
  });
  const calendar = filterMarkets(marketOccurrences(data, first, last), {
    query,
    locality,
    category,
    date: "",
    radius,
    position: buyer.point,
  });
  const detail = data.markets.find(
    (m) => m.id === search.mercado && m.status === "published",
  );
  function open(m: Market) {
    void navigate({ to: "/mercados", search: { mercado: m.id } });
  }
  function move(n: number) {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
    setSelectedDay("");
  }
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(currentLanguage(), {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 5, 1 + i))),
  );
  const offset = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const total = Number(last.slice(-2));
  const candidates =
    view === "Calendario"
      ? selectedDay
        ? calendar.filter((o) => o.day === selectedDay)
        : calendar
      : filtered;
  // One upcoming occurrence per market; its detail retains all dates. Avoid
  // mounting thousands of identical cards when importing a regional catalogue.
  const seenMarkets = new Set<string>();
  const shown = candidates.filter((o) => {
    if (seenMarkets.has(o.market.id)) return false;
    seenMarkets.add(o.market.id);
    return true;
  });
  const cards = (list: MarketOccurrence[]) =>
    list.map((o) => (
      <button
        type="button"
        className="market-card"
        key={o.key}
        onClick={() => open(o.market)}
      >
        <CalendarDays size={24} />
        <span>
          <strong>{o.market.name}</strong>
          <small>
            {o.market.locality} · {t(marketTypeLabels[o.market.kind])}
          </small>
          <span>
            {pickupDate(o.day)} ·{" "}
            {o.opens && o.closes
              ? `${o.opens} – ${o.closes}`
              : t("Horario pendiente de confirmar")}
          </span>
          <small>
            {t(
              data.participants.some(
                (p) =>
                  p.market_id === o.market.id &&
                  marketPresence(data, p, o.day, o.day).length,
              )
                ? "Con vendedores de UZTA"
                : "Sin vendedores de UZTA inscritos",
            )}
          </small>
        </span>
        <ChevronRight size={18} />
      </button>
    ));
  const unique = Array.from(new Set(filtered.map((o) => o.market.id))).map(
    (id) => data.markets.find((m) => m.id === id)!,
  );
  const entries = unique
    .filter((m) => m.latitude !== null && m.longitude !== null)
    .map((m) => ({
      farm: {
        id: m.id,
        name: m.name,
        location: m.locality,
        description: m.description,
        distance: "",
        ecological: false,
        slots: [],
        cover: null,
        avatar: null,
        position: { lat: m.latitude!, lng: m.longitude! },
        sellerType: "professional",
      } satisfies Farm,
      products: [],
    }));
  return (
    <div className="markets-page">
      <h1 className="sr-only">{t("Mercados y ferias")}</h1>
      {!config.marketsReady && (
        <p className="market-notice" role="status">
          {t(
            "Sección preparada. La base de mercados está pendiente de revisión y activación.",
          )}
        </p>
      )}
      {catalogueReview && (
        <p className="market-notice" role="status">
          {t(
            "Catálogo real en revisión: consulta sin reservas. Todavía no importado a Supabase.",
          )}
        </p>
      )}
      {state.loading && <p role="status">{t("Cargando mercados…")}</p>}
      {state.error && (
        <div role="alert">
          <p>{t(state.error)}</p>
          <button onClick={state.reload}>{t("Reintentar")}</button>
        </div>
      )}
      {search.mercado ? (
        detail ? (
          <section className="market-detail">
            <h2>{detail.name}</h2>
            <p>{t(marketTypeLabels[detail.kind])}</p>
            <p>{detail.description}</p>
            <p>
              <MapPin size={17} />
              {detail.address} · {detail.locality}
            </p>
            <p>
              {detail.source_url && (
                <a href={detail.source_url} target="_blank" rel="noreferrer">
                  {t("Fuente de información")}
                </a>
              )}{" "}
              · {t("Última verificación")}:{" "}
              {detail.verified_at
                ? pickupDate(detail.verified_at.slice(0, 10))
                : t("Pendiente")}
            </p>
            <small>{detail.source_license}</small>
            {(() => {
              const evidence = marketCatalogue.find(
                (m) => m.data.source_key === detail.source_key,
              );
              return evidence ? (
                <aside>
                  <p>
                    {t("Confianza")}:{" "}
                    {t(evidence.confidence === "high" ? "Alta" : "Media")}
                  </p>
                  {evidence.review_note && <p>{evidence.review_note}</p>}
                  {evidence.source_urls
                    .filter((s) => s.url !== detail.source_url)
                    .map((s) => (
                      <p key={s.url}>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {t("Fuente de información")}:{" "}
                          {new URL(s.url).hostname}
                        </a>
                      </p>
                    ))}
                </aside>
              ) : null;
            })()}
            <h3>{t("Próximas fechas")}</h3>
            {cards(all.filter((o) => o.market.id === detail.id).slice(0, 12))}
            <h3>{t("Productores y artesanos participantes")}</h3>
            {data.participants
              .filter(
                (p) =>
                  p.market_id === detail.id &&
                  marketPresence(data, p, today, addDays(today, 90)).length,
              )
              .map((p) => {
                const farm = app.farms.find((f) => f.id === p.producer_id);
                if (!farm) return null;
                return (
                  <article key={p.id} className="market-card">
                    <span>
                      <Link to="/productor" search={{ tienda: farm.id }}>
                        <strong>{farm.name}</strong>
                        <small>
                          {t(
                            p.production_kind === "artisan"
                              ? "Artesano"
                              : "Productor",
                          )}
                        </small>
                      </Link>
                      <small>
                        {marketPresence(data, p, today, addDays(today, 30))
                          .slice(0, 3)
                          .map(
                            (o) =>
                              `${pickupDate(o.day)} ${o.opens ?? ""}–${o.closes ?? ""}`,
                          )
                          .join(" · ")}
                      </small>
                      {app.products
                        .filter(
                          (x) =>
                            x.farmId === farm.id &&
                            x.active &&
                            x.catalogVisible !== false,
                        )
                        .map((x) => (
                          <p key={x.id}>{x.name}</p>
                        ))}
                      <Link
                        className="text-button"
                        to="/productor"
                        search={{ tienda: farm.id }}
                      >
                        {t("Ver productos y reservar")}
                      </Link>
                    </span>
                  </article>
                );
              })}
            {!data.participants.some(
              (p) => p.market_id === detail.id && p.active,
            ) && (
              <p>
                {t(
                  "Este mercado todavía no tiene vendedores de UZTA inscritos.",
                )}
              </p>
            )}
          </section>
        ) : (
          <p>{t("Mercado no disponible")}</p>
        )
      ) : (
        <>
          <div
            className="market-views"
            role="tablist"
            aria-label={t("Vista de mercados")}
          >
            {["Calendario", "Lista", "Mapa"].map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <details className="market-filters">
            <summary>{t("Buscar y filtrar mercados")}</summary>
            <div className="uzta-form">
              <label>
                {t("Nombre")}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label>
                {t("Localidad")}
                <input
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                />
              </label>
              <label>
                {t("Categoría")}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">{t("Todas")}</option>
                  {[...categories, "Artesanía"].map((c) => (
                    <option key={c}>{t(c)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("Fecha")}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (e.target.value && view === "Calendario") {
                      setMonth(e.target.value.slice(0, 7));
                      setSelectedDay(e.target.value);
                    }
                  }}
                />
              </label>
              <label>
                {t("Distancia")}
                <select
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                >
                  <option value={0}>{t("Todas")}</option>
                  {[5, 10, 25, 50, 100].map((r) => (
                    <option key={r} value={r}>
                      {r} km
                    </option>
                  ))}
                </select>
              </label>
              {!buyer.point && radius > 0 && (
                <p role="status">
                  {t("Activa tu ubicación para filtrar por distancia.")}
                </p>
              )}
              {!buyer.point && (
                <button type="button" onClick={() => void locateBuyer()}>
                  {t("Usar mi ubicación")}
                </button>
              )}
            </div>
          </details>
          {view === "Calendario" && (
            <>
              <div className="market-month">
                <button aria-label={t("Mes anterior")} onClick={() => move(-1)}>
                  <ChevronLeft />
                </button>
                <input
                  aria-label={t("Mes")}
                  type="month"
                  value={month}
                  onChange={(e) => {
                    if (e.target.value) setMonth(e.target.value);
                  }}
                />
                <button aria-label={t("Mes siguiente")} onClick={() => move(1)}>
                  <ChevronRight />
                </button>
              </div>
              <div className="market-calendar">
                {weekdays.map((d, i) => (
                  <small key={i}>{d}</small>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={"empty" + i} />
                ))}
                {Array.from({ length: total }, (_, i) => {
                  const d = month + "-" + String(i + 1).padStart(2, "0"),
                    has = calendar.some((o) => o.day === d);
                  return (
                    <button
                      className={has ? "has-market" : ""}
                      aria-label={`${pickupDate(d)}${has ? " · " + t("Con mercados") : ""}`}
                      aria-pressed={selectedDay === d}
                      key={d}
                      onClick={() => setSelectedDay(selectedDay === d ? "" : d)}
                    >
                      {i + 1}
                      {has && <span aria-hidden="true">•</span>}
                    </button>
                  );
                })}
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setSelectedDay("");
                  setView("Lista");
                }}
              >
                {t("Ver próximos mercados")}
              </button>
            </>
          )}
          {view === "Mapa" ? (
            <>
              <div className="market-map">
                <Suspense fallback={<p>{t("Cargando mapa…")}</p>}>
                  <Map
                    entries={entries}
                    center={buyer.point}
                    radius={radius}
                    kind="markets"
                    onSelect={(e) =>
                      open(data.markets.find((m) => m.id === e.farm.id)!)
                    }
                    onGroup={(group) => {
                      setQuery("");
                      setView("Lista");
                      setLocality(group[0].farm.location);
                    }}
                  />
                </Suspense>
              </div>
              {unique.some((m) => m.latitude === null) && (
                <p>
                  {t(
                    "Los mercados sin punto confirmado se muestran en la lista.",
                  )}
                </p>
              )}
            </>
          ) : (
            cards(shown)
          )}
          {!state.loading && !state.error && !shown.length && (
            <div className="empty">
              <h2>{t("No hay mercados para esta selección")}</h2>
              <p>
                {t(
                  "Prueba otra fecha o localidad. Los vendedores pueden proponer un mercado desde su panel.",
                )}
              </p>
            </div>
          )}
        </>
      )}
      {catalogueReview && (
        <details>
          <summary>{t("Fuentes y registros pendientes de revisión")}</summary>
          {marketCatalogue
            .filter((m) => m.review_status !== "verified")
            .map((m) => (
              <p key={m.data.source_key}>
                <a href={m.data.source_url} target="_blank" rel="noreferrer">
                  {m.data.name} · {m.data.locality}
                </a>
                <small>{m.review_note}</small>
              </p>
            ))}
          <small>
            {t("Coordenadas OSM: © OpenStreetMap contributors · ODbL 1.0")}
          </small>
        </details>
      )}
    </div>
  );
}
