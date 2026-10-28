import {
  SellerReviews,
  RatingSummary,
  useReviewSummaries,
} from "../components/seller-reviews";
import { EuskoBadge } from "../components/eusko";
import { AvailabilityLabel } from "../components/product-availability";
import { canReserve } from "../lib/availability";
import { FavoriteButton } from "../components/favorites";
import "./productor.css";
import { t, useLanguage } from "../lib/language";
import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  Star,
  ShoppingBasket,
  Info,
  Clock,
  Plus,
  Heart,
  Package,
  Leaf,
} from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { futureSlot } from "../lib/local-model";
import { ShareStore } from "../components/share-store";
import { publicMapUrl } from "../lib/nearby";
export function Productor() {
  useLanguage();
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [tab, setTab] = useState("Productos");
  const { data, run, mode, busy, storageError } = useDemo();
  const search = useSearch({ strict: false }) as { tienda?: string };
  const farm = data.farms.find(
    (f) =>
      f.catalogVisible !== false &&
      f.id ===
        (search.tienda ??
          (mode === "demo"
            ? "urki"
            : data.farms.find((f) => f.catalogVisible !== false)?.id)),
  );
  const [added, setAdded] = useState("");
  const reviews = useReviewSummaries(farm ? [farm.id] : []);
  if (!farm && busy) return <p role="status">{t("Cargando productor…")}</p>;
  if (!farm && storageError) return null;
  if (!farm)
    return (
      <div className="empty">
        <h1>
          {search.tienda
            ? t("Productor no encontrado")
            : t("Aún no hay productores publicados")}
        </h1>
        <Link to="/">{t("Volver al inicio")}</Link>
      </div>
    );
  const tabs = [
    ["Productos", ShoppingBasket],
    ["Información", Info],
    ["Horarios", Clock],
    ["Opiniones", Star],
  ] as const;
  return (
    <div className="uzta-producer">
      <div className="producer-hero">
        <Photo
          crop={mode === "demo" ? [480, 105, 170, 110] : [0, 0, 0, 0]}
          label={`${mode === "demo" ? "Explotación de ejemplo" : "Explotación"}: ${farm.name}`}
        />
        <Link className="hero-back" to="/" aria-label={t("Volver al inicio")}>
          <ArrowLeft />
        </Link>
        <FavoriteButton
          id={farm.id}
          name={farm.name}
          target="seller"
          className="producer-favorite"
        />
        <ShareStore id={farm.id} name={farm.name} demo={mode === "demo"} />
      </div>
      <div className="producer-intro">
        <Photo
          className="avatar farm-avatar"
          crop={mode === "demo" ? [383, 184, 78, 82] : [0, 0, 0, 0]}
          label={
            mode === "demo" ? "Productor de ejemplo" : `Avatar de ${farm.name}`
          }
        />
        <h1>{farm.name}</h1>
        <div className="farm-meta">
          <EuskoBadge farm={farm} />
          {farm.ecological ? (
            <span className="eco">
              <Leaf size={13} aria-hidden="true" />
              {t("Ecológico")}
            </span>
          ) : null}
          <RatingSummary value={reviews.rows[0]} />
        </div>
        <p className="location">
          <MapPin size={17} />
          {farm.location} {farm.distance ? `· ${farm.distance}` : ""}
        </p>
        <p
          className={`producer-description${expandedDescription ? " expanded" : ""}`}
        >
          {farm.description ||
            "El productor aún no ha añadido una descripción."}
        </p>
        {farm.description.length > 180 ? (
          <button
            className="description-toggle"
            aria-expanded={expandedDescription}
            onClick={() => setExpandedDescription(!expandedDescription)}
          >
            {expandedDescription ? "Ver menos" : "Leer más"}
          </button>
        ) : null}
      </div>
      <div
        className="producer-tabs"
        role="tablist"
        aria-label="Ficha del productor"
      >
        {tabs.map(([label, Icon]) => (
          <button
            key={label}
            id={`tab-${label}`}
            role="tab"
            aria-controls="producer-panel"
            aria-selected={tab === label}
            onClick={() => setTab(label)}
          >
            <Icon size={22} />
            {t(label)}
          </button>
        ))}
      </div>
      <section
        id="producer-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "Productos" ? (
          <>
            <h2>{t("Productos disponibles")}</h2>
            <p role="status" className="producer-added">
              {added}
            </p>
            <div className="producer-products">
              {data.products
                .filter(
                  (p) =>
                    p.farmId === farm.id &&
                    p.active &&
                    p.catalogVisible !== false,
                )
                .map((p) => (
                  <article key={p.id}>
                    <Photo
                      src={p.photo === undefined ? p.photoUrl : p.photo}
                      crop={p.photo === null ? [0, 0, 0, 0] : p.crop}
                      label={p.name}
                    />
                    <div>
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                      <p>
                        <strong>{euro(p.priceCents)}</strong> / {p.unit}
                      </p>
                      <AvailabilityLabel product={p} />
                      <small>
                        <Package size={11} aria-hidden="true" />
                        {p.stock} {p.unit}
                      </small>
                    </div>
                    <div className="product-actions">
                      <FavoriteButton id={p.id} name={p.name} />
                      <button
                        className="add"
                        disabled={busy || !canReserve(p)}
                        aria-label={`Añadir ${p.name} a la cesta`}
                        onClick={async () => {
                          if (
                            await run({ type: "quantity", id: p.id, delta: 1 })
                          )
                            setAdded(`${p.name} añadido a la cesta.`);
                        }}
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            <Link className="primary action-link" to="/cesta">
              {t("Ver cesta")}
            </Link>
          </>
        ) : null}
        {tab === "Información" ? (
          <div className="info-panel">
            <h2>{t("Información del productor")}</h2>
            <p>{farm.description || "Sin descripción añadida."}</p>
            <p>
              <strong>{t("Ubicación:")}</strong> {farm.location}
            </p>
            {publicMapUrl(farm.position) ? (
              <p>
                <a
                  className="text-button"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={publicMapUrl(farm.position)!}
                >
                  {t("Abrir ubicación aproximada en el mapa")}
                </a>
              </p>
            ) : null}
            {farm.ecological ? (
              <p className="producer-characteristic">
                <Leaf size={16} />
                {t("Ecológico")}
              </p>
            ) : null}
            <p className="pending-feature">
              La carga de portada y avatar está pendientes de integración. Los
              favoritos de productos siguen disponibles en Inicio.
            </p>
            <p>
              {t(
                "Recogida en el productor. Las fechas y horas se seleccionan al reservar.",
              )}
            </p>
          </div>
        ) : null}
        {tab === "Horarios" ? (
          <div className="info-panel">
            <h2>{t("Horarios de recogida")}</h2>
            {farm.slots.filter((s) => futureSlot(s)).length ? (
              farm.slots
                .filter((s) => futureSlot(s))
                .map((s) => (
                  <p key={s.id}>
                    {s.date} · {s.start} – {s.end}
                  </p>
                ))
            ) : (
              <p>
                {t(
                  "Este productor no ha publicado franjas de recogida. Se pueden configurar en Perfil → Horarios y entregas.",
                )}
              </p>
            )}
          </div>
        ) : null}
        {tab === "Opiniones" ? (
          <div className="info-panel">
            <h2>{t("Opiniones")}</h2>
            <SellerReviews producerId={farm.id} summaries={reviews} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
