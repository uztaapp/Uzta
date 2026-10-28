import "./inicio.css";
import { t, useLanguage } from "../lib/language";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  MapPin,
  Heart,
  ChevronRight,
  Sprout,
  ChevronDown,
  ShoppingCart,
} from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { NearbyControls } from "../components/nearby-controls";
import { withinRadius, distanceLabel, type Position } from "../lib/nearby";
export function Inicio() {
  useLanguage();
  const [locationOpen, setLocationOpen] = useState(false);
  const [allFarms, setAllFarms] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const [center, setCenter] = useState<Position | null>(null);
  const [radius, setRadius] = useState(10);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const { data, run, mode, busy, storageError } = useDemo();
  const visible = data.products.filter(
    (p) =>
      p.active &&
      withinRadius(
        data.farms.find((f) => f.id === p.farmId)?.position,
        center,
        radius,
      ) &&
      (!category || p.category === category) &&
      (!onlyFavorites || data.favorites.includes(p.id)) &&
      normalize(p.name).includes(normalize(query)),
  );
  return (
    <div className="uzta-home">
      <div className="home-heading">
        <div className="logo">
          <Sprout aria-hidden="true" size={30} /> UZTA
          <small>{t("Del productor a tu mesa")}</small>
        </div>
        <Link to="/cesta" aria-label="Abrir cesta" className="basket-shortcut">
          <ShoppingCart aria-hidden="true" />
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
        {data.profile.location || t("Productos cerca de ti")}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      <div id="home-zone" className="home-zone" hidden={!locationOpen}>
        <NearbyControls
          center={center}
          radius={radius}
          onCenter={setCenter}
          onRadius={setRadius}
        />
      </div>
      <label className="search">
        <Search size={21} />
        <input
          aria-label="Buscar productos"
          placeholder="¿Qué productos frescos buscas?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="categories" aria-label="Categorías">
        {[
          ["🥬", "Verduras"],
          ["🍎", "Frutas"],
          ["🥚", "Huevos"],
          ["🧀", "Lácteos"],
          ["🍯", "Miel"],
          ["🌿", "Otros"],
        ].map(([icon, label]) => (
          <button
            key={label}
            aria-pressed={category === label}
            onClick={() => setCategory(category === label ? "" : label)}
          >
            <span>{icon}</span>
            {t(label)}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>{t("Productos cerca de ti")}</h2>
        <button
          onClick={() => {
            setCategory("");
            setQuery("");
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
                <button
                  className="heart"
                  aria-label={`${data.favorites.includes(p.id) ? t("Quitar") : t("Guardar")} ${p.name} en favoritos`}
                  aria-pressed={data.favorites.includes(p.id)}
                  onClick={() => run({ type: "favorite", id: p.id })}
                >
                  <Heart
                    fill={
                      data.favorites.includes(p.id) ? "currentColor" : "none"
                    }
                    size={22}
                  />
                </button>
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
                {!p.stock ? <small>{t("Agotado")}</small> : null}
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
              : data.products.some((p) => p.active)
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
          .filter((f) => withinRadius(f.position, center, radius))
          .slice(0, allFarms ? undefined : 1)
          .map((f) => (
            <Link
              key={f.id}
              to="/productor"
              search={{ tienda: f.id }}
              className="farm-banner"
            >
              <Photo
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
          ))}
      </div>
    </div>
  );
}
