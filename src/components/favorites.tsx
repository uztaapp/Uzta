import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useUzta } from "../app-context";
import { Modal, Photo } from "./presentation";
import { euro } from "../lib/local-model";
import { Access } from "./access";
import { t, useLanguage } from "../lib/language";
import config from "../../config/uzta-cloud.public.json";
import "./favorites.css";
export function FavoriteButton({
  id,
  name,
  target = "product",
  className = "favorite-button",
}: {
  id: string;
  name: string;
  target?: "product" | "seller";
  className?: string;
}) {
  useLanguage();
  const { data, run, busy, mode, show } = useUzta();
  const [access, setAccess] = useState(false);
  useEffect(() => {
    if (data.sessionActive) setAccess(false);
  }, [data.sessionActive]);
  const saved = (
    target === "product" ? data.favorites : (data.sellerFavorites ?? [])
  ).includes(id);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={busy}
        aria-label={`${saved ? t("Quitar de favoritos") : t("Guardar en favoritos")}: ${name}`}
        aria-pressed={saved}
        onClick={() => {
          if (!data.sessionActive) {
            setAccess(true);
            return;
          }
          if (
            target === "seller" &&
            mode === "cloud" &&
            !config.sellerFavoritesReady
          ) {
            show(t("Favoritos de vendedores pendientes de activación."));
            return;
          }
          void run({
            type: target === "product" ? "favorite" : "sellerFavorite",
            id,
          });
        }}
      >
        <Heart size={22} fill={saved ? "currentColor" : "none"} />
      </button>
      {access && (
        <Modal
          title={t("Inicia sesión para guardar favoritos")}
          close={() => setAccess(false)}
        >
          <Access />
        </Modal>
      )}
    </>
  );
}
export function MyFavorites() {
  useLanguage();
  const { data, mode, busy, storageError } = useUzta();
  const [tab, setTab] = useState("products");
  const ids =
    tab === "products" ? data.favorites : (data.sellerFavorites ?? []);
  return (
    <section className="my-favorites">
      <div className="segmented" role="tablist" aria-label={t("Mis favoritos")}>
        <button
          role="tab"
          aria-selected={tab === "products"}
          onClick={() => setTab("products")}
        >
          {t("Productos")}
        </button>
        <button
          role="tab"
          aria-selected={tab === "sellers"}
          onClick={() => setTab("sellers")}
        >
          {t("Productores y particulares")}
        </button>
      </div>
      <div role="tabpanel">
        {storageError ? (
          <p role="alert">{t("No se pudieron cargar los favoritos.")}</p>
        ) : busy && !ids.length ? (
          <p role="status">{t("Cargando favoritos…")}</p>
        ) : !ids.length ? (
          <p>{t("Todavía no tienes favoritos.")}</p>
        ) : null}
        {ids.map((id) => {
          const product =
            tab === "products"
              ? data.products.find(
                  (p) => p.id === id && p.active && p.catalogVisible !== false,
                )
              : undefined;
          const farm =
            tab === "sellers"
              ? data.farms.find(
                  (f) => f.id === id && f.catalogVisible !== false,
                )
              : data.farms.find((f) => f.id === product?.farmId);
          const available = !!farm && (tab === "sellers" || !!product);
          const name = available
            ? (product?.name ?? farm!.name)
            : t("Favorito no disponible");
          return (
            <article className="favorite-row" key={id}>
              {product && (
                <Photo
                  src={
                    product.photo === undefined
                      ? product.photoUrl
                      : product.photo
                  }
                  crop={mode === "demo" ? product.crop : [0, 0, 0, 0]}
                  label={name}
                />
              )}
              <div>
                {available ? (
                  <Link to="/productor" search={{ tienda: farm!.id }}>
                    {name}
                  </Link>
                ) : (
                  <span>{name}</span>
                )}
                {product && (
                  <small>
                    {euro(product.priceCents)} / {product.unit}
                  </small>
                )}
                {farm && <small>{farm.location}</small>}
              </div>
              <FavoriteButton
                id={id}
                name={name}
                target={tab === "products" ? "product" : "seller"}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
