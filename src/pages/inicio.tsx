import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  MapPin,
  Heart,
  ChevronRight,
  ShoppingBasket,
  Leaf,
} from "lucide-react";
import { Photo, euro, useDemo } from "../design";
export function Inicio() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const { data, run, mode, busy } = useDemo();
  const visible = data.products.filter(
    (p) =>
      p.active &&
      (showAll ||
        !!query.trim() ||
        !!category ||
        onlyFavorites ||
        p.featured ||
        data.favorites.includes(p.id)) &&
      (!category || p.category === category) &&
      (!onlyFavorites || data.favorites.includes(p.id)) &&
      normalize(p.name).includes(normalize(query)),
  );
  return (
    <>
      <div className="home-heading">
        <div className="logo">
          <Leaf fill="currentColor" size={27} /> UZTA
          <small>Del productor a tu mesa</small>
        </div>
        <Link to="/cesta" aria-label="Abrir cesta" className="basket-shortcut">
          <ShoppingBasket />
          <span>
            {Object.values(data.quantities).filter((q) => q > 0).length}
          </span>
        </Link>
      </div>
      <h1 className="sr-only">Inicio</h1>
      <p className="location">
        <MapPin size={17} />
        {data.profile.location || "Productos cerca de ti"}
      </p>
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
            {label}
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>Productos cerca de ti</h2>
        <button
          onClick={() => {
            setShowAll(true);
            setCategory("");
            setQuery("");
            setOnlyFavorites(false);
          }}
        >
          Ver todos <ChevronRight size={14} />
        </button>
      </div>
      <button
        className="filter-pill"
        aria-pressed={onlyFavorites}
        onClick={() => setOnlyFavorites(!onlyFavorites)}
      >
        <Heart size={15} /> Mis favoritos
      </button>
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
                  <Photo crop={p.crop} label={p.name} />
                </Link>
                <button
                  className="heart"
                  aria-label={`${data.favorites.includes(p.id) ? "Quitar" : "Guardar"} ${p.name} en favoritos`}
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
                  <span className="eco">Ecológico</span>
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
                  <span>{farm.distance}</span>
                </small>
                {!p.stock ? <small>Agotado</small> : null}
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length ? (
        <p className="empty">
          {busy
            ? "Cargando productos…"
            : "Todavía no hay productos publicados en esta selección."}
        </p>
      ) : null}
      <div className="section-heading">
        <h2>Directamente del productor</h2>
      </div>
      <div className="farm-grid">
        {data.farms.map((f) => (
          <Link
            key={f.id}
            to="/productor"
            search={{ tienda: f.id }}
            className="farm-banner"
          >
            <Photo
              crop={mode === "demo" ? [365, 96, 285, 82] : [0, 0, 0, 0]}
              label={`Tienda de ejemplo: ${f.name}`}
            />
            <div>
              <strong>{f.name}</strong>
              <span>
                {f.location} {f.distance ? `· ${f.distance}` : ""}
              </span>
            </div>
            <ChevronRight />
          </Link>
        ))}
      </div>
    </>
  );
}
