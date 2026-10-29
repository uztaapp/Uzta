import { StoreCover } from "../components/store-cover";
import {
  useBuyerLocation,
  locateBuyer,
  selectBuyerLocality,
  nearbyLocality,
  localityMatches,
} from "../lib/buyer-location";
import { SheetIcon, type SheetIconName } from "../components/sheet-icon";
import { EuskoBadge } from "../components/eusko";
import {
  AvailabilityLabel,
  AvailabilitySelect,
} from "../components/product-availability";
import {
  matchesAvailability,
  type AvailabilityFilter,
} from "../lib/availability";
import { FavoriteButton } from "../components/favorites";
import "./inicio.css";
import { Brand } from "../components/brand";
import { t, useLanguage } from "../lib/language";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Heart, ChevronRight, ChevronDown } from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { withinRadius, distanceLabel } from "../lib/nearby";
export function Inicio() {
  useLanguage();
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [categoryEdges, setCategoryEdges] = useState({
    previous: false,
    next: false,
  });
  function updateCategoryEdges() {
    const el = categoriesRef.current;
    if (!el) return;
    setCategoryEdges({
      previous: el.scrollLeft > 2,
      next: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  }
  useEffect(() => {
    const el = categoriesRef.current;
    if (!el) return;
    updateCategoryEdges();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateCategoryEdges)
        : null;
    observer?.observe(el);
    window.addEventListener("resize", updateCategoryEdges);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateCategoryEdges);
    };
  }, []);
  const [locationOpen, setLocationOpen] = useState(false);
  const [allFarms, setAllFarms] = useState(false);
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const { data, run, mode, busy, storageError } = useDemo();
  const buyerLocation = useBuyerLocation(!busy && !data.profile.location);
  const center = buyerLocation.point;
  const manualLocality =
    buyerLocation.source === "manual" ? buyerLocation.locality : "";
  const detectedTown = nearbyLocality(center, data.farms);
  const locationLabel =
    manualLocality ||
    (detectedTown
      ? `${t("Cerca de")} ${detectedTown}`
      : center
        ? t("Ubicación aproximada")
        : (!buyerLocation.source ? data.profile.location : "") ||
          t("Productos cerca de ti"));
  const [radius, setRadius] = useState(10);
  const visible = data.products.filter(
    (p) =>
      p.active &&
      p.catalogVisible !== false &&
      matchesAvailability(p, availability) &&
      withinRadius(
        data.farms.find((f) => f.id === p.farmId)?.position,
        center,
        radius,
      ) &&
      (!category || p.category === category) &&
      (!onlyFavorites || data.favorites.includes(p.id)) &&
      (!manualLocality ||
        center ||
        localityMatches(
          data.farms.find((f) => f.id === p.farmId)?.location ?? "",
          manualLocality,
        )),
  );
  return (
    <div className="uzta-home">
      <div className="home-heading">
        <div className="logo">
          <Brand />
          <small>{t("Del productor a tu mesa")}</small>
        </div>
        <Link to="/cesta" aria-label="Abrir cesta" className="basket-shortcut">
          <SheetIcon name="basket" />
          <span>
            {Object.values(data.quantities).filter((q) => q > 0).length}
          </span>
        </Link>
      </div>
      <h1 className="sr-only">{t("Inicio")}</h1>
      <button
        className="home-location"
        aria-expanded={locationOpen}
        aria-controls="home-zone"
        onClick={() => setLocationOpen(!locationOpen)}
      >
        <MapPin size={16} aria-hidden="true" />
        {locationLabel}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <div id="home-zone" className="home-zone" hidden={!locationOpen}>
        <button
          type="button"
          className="text-button"
          disabled={buyerLocation.status === "pending"}
          onClick={() => void locateBuyer()}
        >
          {t(
            buyerLocation.status === "pending"
              ? "Obteniendo ubicación…"
              : "Usar mi ubicación",
          )}
        </button>
        {buyerLocation.status === "unavailable" && (
          <p role="status">
            {t("Selecciona una localidad para buscar cerca de ti.")}
          </p>
        )}
        <form
          className="uzta-form"
          onSubmit={(e) => {
            e.preventDefault();
            const label = String(
              new FormData(e.currentTarget).get("locality") ?? "",
            ).trim();
            const farm = data.farms.find(
              (f) =>
                f.catalogVisible !== false &&
                localityMatches(f.location, label) &&
                localityMatches(label, f.location),
            );
            selectBuyerLocality(label, farm?.position);
            setLocationOpen(false);
          }}
        >
          <label>
            {t("Localidad")}
            <input
              name="locality"
              maxLength={200}
              required
              defaultValue={manualLocality}
              list="home-localities"
            />
          </label>
          <datalist id="home-localities">
            {[
              ...new Set(
                data.farms
                  .filter((f) => f.catalogVisible !== false)
                  .map((f) => f.location),
              ),
            ].map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
          <label>
            {t("Radio de búsqueda")}
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {[5, 10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} km
                </option>
              ))}
            </select>
          </label>
          <button className="primary">{t("Aplicar zona")}</button>
        </form>
        {(center || manualLocality) && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              selectBuyerLocality("");
              setLocationOpen(false);
            }}
          >
            {t("Quitar filtro de zona")}
          </button>
        )}
      </div>
      <div className="category-carousel">
        <div
          className="categories"
          aria-label="Categorías"
          ref={categoriesRef}
          onScroll={updateCategoryEdges}
        >
          {[
            ["vegetables", "Verduras"],
            ["fruit", "Frutas"],
            ["eggs", "Huevos"],
            ["dairy", "Lácteos"],
            ["honey", "Miel"],
          ].map(([icon, label]) => (
            <button
              key={label}
              aria-pressed={category === label}
              onClick={() => setCategory(category === label ? "" : label)}
            >
              <span>
                <SheetIcon name={icon as SheetIconName} />
              </span>
              {t(label)}
            </button>
          ))}
        </div>
        <div className="category-scroll-controls">
          {categoryEdges.previous && (
            <button
              type="button"
              aria-label={t("Categorías anteriores")}
              onClick={() =>
                categoriesRef.current?.scrollBy({
                  left: -200,
                  behavior: window.matchMedia?.(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                })
              }
            >
              <ChevronRight
                style={{ transform: "rotate(180deg)" }}
                aria-hidden="true"
                size={16}
              />
            </button>
          )}
          {categoryEdges.next && (
            <button
              type="button"
              aria-label={t("Más categorías")}
              onClick={() =>
                categoriesRef.current?.scrollBy({
                  left: 200,
                  behavior: window.matchMedia?.(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                })
              }
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="section-heading">
        <h2>{t("Productos cerca de ti")}</h2>
        <button
          onClick={() => {
            setCategory("");
            setOnlyFavorites(false);
          }}
        >
          {t("Ver todos")}
          <ChevronRight size={14} />
        </button>
      </div>
      <details className="home-filters">
        <summary>
          <Heart size={13} />
          {t("Mis favoritos")}
        </summary>
        <button
          className="filter-pill"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
        >
          <Heart size={15} />
          {t("Mis favoritos")}
        </button>
      </details>
      <AvailabilitySelect value={availability} onChange={setAvailability} />
      <div className="product-grid">
        {visible.map((p) => {
          const farm = data.farms.find((f) => f.id === p.farmId)!;
          return (
            <article key={p.id} className="product-card">
              <div className="product-image">
                <Link
                  to="/productor"
                  search={{ tienda: p.farmId }}
                  aria-label={`Ver ${p.name} de ${farm.name}`}
                >
                  <Photo
                    src={p.photo === undefined ? p.photoUrl : p.photo}
                    crop={p.photo === null ? [0, 0, 0, 0] : p.crop}
                    label={p.name}
                  />
                </Link>
                <FavoriteButton id={p.id} name={p.name} className="heart" />
                {farm.ecological ? (
                  <span className="eco">{t("Ecológico")}</span>
                ) : null}
              </div>
              <div className="product-copy">
                <h3>{p.name}</h3>
                <p>
                  <strong>{euro(p.priceCents)}</strong> / {p.unit}
                </p>
                <small>
                  <span>
                    <MapPin size={12} />
                    {farm.name}
                  </span>
                  <span>
                    {center
                      ? distanceLabel(center, farm.position)
                      : farm.distance}
                  </span>
                </small>
                <AvailabilityLabel product={p} />
                <EuskoBadge farm={farm} />
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && !storageError ? (
        <div className="empty">
          <p>
            {busy
              ? t("Cargando productos…")
              : data.products.some(
                    (p) => p.active && p.catalogVisible !== false,
                  )
                ? t("No hay productos que coincidan con tu búsqueda.")
                : t("Todavía no hay productos publicados.")}
          </p>
          {!busy && (
            <>
              <Link className="text-button" to="/explorar">
                {t("Explorar productores")}
              </Link>
              <Link
                className="text-button"
                to="/perfil"
                search={{ apartado: "productos" }}
              >
                {t("Publicar productos")}
              </Link>
            </>
          )}
        </div>
      ) : null}
      <div className="section-heading">
        <h2>{t("Directamente del productor")}</h2>
        <button
          aria-label="Mostrar todos los productores"
          onClick={() => setAllFarms(!allFarms)}
          aria-expanded={allFarms}
        >
          {t("Ver todos")}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="farm-grid">
        {data.farms
          .filter(
            (f) =>
              f.catalogVisible !== false &&
              withinRadius(f.position, center, radius) &&
              (!manualLocality ||
                center ||
                localityMatches(f.location, manualLocality)),
          )
          .slice(0, allFarms ? undefined : 1)
          .map((f) => (
            <div className="favorite-card-wrap" key={f.id}>
              <FavoriteButton id={f.id} name={f.name} target="seller" />
              <Link
                to="/productor"
                search={{ tienda: f.id }}
                className="farm-banner"
              >
                <StoreCover
                  farm={f}
                  crop={mode === "demo" ? [365, 96, 285, 82] : [0, 0, 0, 0]}
                  label={`${mode === "demo" ? "Tienda de ejemplo" : "Tienda"}: ${f.name}`}
                />
                <div>
                  <strong>{f.name}</strong>
                  <span>
                    {f.location}{" "}
                    {center
                      ? `· ${distanceLabel(center, f.position)}`
                      : f.distance
                        ? `· ${f.distance}`
                        : ""}
                  </span>
                </div>
                <ChevronRight />
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}
