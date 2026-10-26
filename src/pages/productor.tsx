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
} from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { futureSlot } from "../lib/local-model";
export function Productor() {
  const [tab, setTab] = useState("Productos");
  const { data, run } = useDemo();
  const search = useSearch({ strict: false }) as { tienda?: string };
  const farm = data.farms.find((f) => f.id === (search.tienda ?? "urki"));
  const [added, setAdded] = useState("");
  if (!farm)
    return (
      <div className="empty">
        <h1>Productor no encontrado</h1>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  const tabs = [
    ["Productos", ShoppingBasket],
    ["Información", Info],
    ["Horarios", Clock],
    ["Opiniones", Star],
  ] as const;
  return (
    <>
      <div className="producer-hero">
        <Photo
          crop={[365, 96, 285, 82]}
          label={`Caserío de ejemplo de ${farm.name}`}
        />
        <Link className="hero-back" to="/" aria-label="Volver al inicio">
          <ArrowLeft />
        </Link>
      </div>
      <div className="producer-intro">
        <Photo
          className="avatar farm-avatar"
          crop={[383, 184, 78, 82]}
          label="Productor de ejemplo"
        />
        <h1>{farm.name}</h1>
        <div className="farm-meta">
          {farm.ecological ? <span className="eco">♧ Ecológico</span> : null}
          {farm.id === "urki" ? (
            <span>
              <Star size={18} fill="#efb329" color="#efb329" />{" "}
              <strong>4,8</strong> (32) <small>Maqueta</small>
            </span>
          ) : null}
        </div>
        <p className="location">
          <MapPin size={17} />
          {farm.location} {farm.distance ? `· ${farm.distance}` : ""}
        </p>
        <p>
          {farm.description ||
            "El productor aún no ha añadido una descripción."}
        </p>
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
            {label}
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
            <h2>Productos disponibles</h2>
            <p role="status" className="subtle">
              {added}
            </p>
            <div className="producer-products">
              {data.products
                .filter((p) => p.farmId === farm.id && p.active)
                .map((p) => (
                  <article key={p.id}>
                    <Photo crop={p.crop} label={p.name} />
                    <div>
                      <h3>{p.name}</h3>
                      <p>
                        <strong>{euro(p.priceCents)}</strong> / {p.unit}
                      </p>
                      <small>
                        {p.stock
                          ? `Disponible: ${p.stock} ${p.unit}`
                          : "Agotado"}
                      </small>
                    </div>
                    <button
                      className="add"
                      disabled={!p.stock}
                      aria-label={`Añadir ${p.name} a la cesta`}
                      onClick={() => {
                        if (run({ type: "quantity", id: p.id, delta: 1 }))
                          setAdded(`${p.name} añadido a la cesta.`);
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  </article>
                ))}
            </div>
            <Link className="primary action-link" to="/cesta">
              Ver cesta
            </Link>
          </>
        ) : null}
        {tab === "Información" ? (
          <div className="info-panel">
            <h2>Información del productor</h2>
            <p>{farm.description || "Sin descripción añadida."}</p>
            <p>
              <strong>Ubicación:</strong> {farm.location}
            </p>
            <p>
              Recogida en el productor. Las fechas y horas se seleccionan al
              reservar.
            </p>
          </div>
        ) : null}
        {tab === "Horarios" ? (
          <div className="info-panel">
            <h2>Horarios de recogida</h2>
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
                Este productor no ha publicado franjas de recogida. Se pueden
                configurar en Perfil → Horarios y entregas.
              </p>
            )}
          </div>
        ) : null}
        {tab === "Opiniones" ? (
          <div className="info-panel">
            <h2>Opiniones</h2>
            <p>
              La valoración 4,8 de la maqueta es ilustrativa. Aún no hay
              opiniones verificadas. No se muestran reseñas inventadas.
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
