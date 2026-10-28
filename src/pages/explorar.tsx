import { EuskoBadge } from "../components/eusko";
import {
  AvailabilitySelect,
  AvailabilityLabel,
} from "../components/product-availability";
import type { AvailabilityFilter } from "../lib/availability";
import { FavoriteButton } from "../components/favorites";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  SlidersHorizontal,
  LocateFixed,
  List,
  Map,
  X,
  ChevronRight,
  Leaf,
} from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { categories } from "../lib/local-model";
import { exploreEntries, type ExploreEntry } from "../lib/explore";
import {
  distanceLabel,
  publicPosition,
  validPosition,
  type Position,
} from "../lib/nearby";
import "./explorar.css";
import { t, useLanguage } from "../lib/language";
import { sellerLabel, type SellerType } from "../lib/sellers";
const ProducerMap = lazy(() => import("../components/producer-map"));
export function Explorar() {
  useLanguage();
  const [euskoOnly, setEuskoOnly] = useState(false);
  const [sellerType, setSellerType] = useState<SellerType | "">("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const { data, mode, busy, storageError } = useDemo();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [radius, setRadius] = useState(0);
  const [center, setCenter] = useState<Position | null>(null),
    [filters, setFilters] = useState(false),
    [list, setList] = useState(false);
  const [selected, setSelected] = useState<string | null>(null),
    [group, setGroup] = useState<string[]>([]),
    [locating, setLocating] = useState(false),
    [geoError, setGeoError] = useState("");
  const alive = useRef(true),
    request = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  const entries = useMemo(
    () =>
      exploreEntries(
        data.farms,
        data.products,
        query,
        category,
        center,
        radius,
        sellerType,
        false,
        availability,
        euskoOnly,
      ),
    [
      data.farms,
      data.products,
      query,
      category,
      center,
      radius,
      sellerType,
      availability,
      euskoOnly,
    ],
  );
  const onSelect = useCallback((entry: ExploreEntry) => {
    setSelected(entry.farm.id);
    setGroup([]);
    setFilters(false);
  }, []);
  const onGroup = useCallback((items: ExploreEntry[]) => {
    setGroup(items.map((e) => e.farm.id));
    setSelected(null);
    setFilters(false);
  }, []);
  const preview = entries.find((e) => e.farm.id === selected);
  const visibleGroup = entries.filter((e) => group.includes(e.farm.id));
  const onMap = entries.filter((e) => publicPosition(e.farm.position));
  function locate() {
    if (!navigator.geolocation) {
      setGeoError(
        "La ubicación no está disponible. Puedes introducir una zona en Filtros.",
      );
      return;
    }
    const id = ++request.current;
    setLocating(true);
    setGeoError("");
    try {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          if (!alive.current || request.current !== id) return;
          const p = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          };
          if (validPosition(p)) setCenter(p);
          else setGeoError("Ubicación no válida.");
          setLocating(false);
        },
        () => {
          if (alive.current && request.current === id) {
            setGeoError(
              "No se pudo obtener la ubicación. Puedes introducir una zona en Filtros.",
            );
            setLocating(false);
          }
        },
        { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 },
      );
    } catch {
      setLocating(false);
      setGeoError(
        "La ubicación no está disponible. Puedes introducir una zona en Filtros.",
      );
    }
  }
  function card(entry: ExploreEntry) {
    const p = entry.products[0];
    return (
      <div className="favorite-card-wrap" key={entry.farm.id}>
        <FavoriteButton
          target="seller"
          id={entry.farm.id}
          name={entry.farm.name}
        />
        <Link
          to="/productor"
          search={{ tienda: entry.farm.id }}
          className="explore-preview-content"
          key={entry.farm.id}
        >
          <Photo
            src={p.photo === undefined ? p.photoUrl : p.photo}
            crop={mode === "demo" && p.photo !== null ? p.crop : [0, 0, 0, 0]}
            label={p.name}
          />
          <div>
            <h2>{entry.farm.name}</h2>
            <EuskoBadge farm={entry.farm} />
            <p>{entry.farm.location}</p>
            <small>{t(sellerLabel(entry.farm.sellerType))}</small>
            <small>
              {center
                ? distanceLabel(center, entry.farm.position)
                : publicPosition(entry.farm.position)
                  ? "Ubicación de la tienda"
                  : t("Sin ubicación pública en el mapa")}
            </small>
            <p>
              {entry.products.length}{" "}
              {entry.products.length === 1 ? t("producto") : t("productos")}
            </p>
            <AvailabilityLabel product={p} />
            <p className="explore-prices">
              {entry.products
                .slice(0, 2)
                .map((p) => `${p.name} · ${euro(p.priceCents)} / ${p.unit}`)
                .join(" · ")}
            </p>
            <strong>
              {t("Ver productos")} <ChevronRight size={14} />
            </strong>
          </div>
        </Link>
      </div>
    );
  }
  return (
    <section className="uzta-explore" aria-label={t("Explorar productores")}>
      <div className="explore-map-wrap" inert={list} aria-hidden={list}>
        <Suspense fallback={<p>{t("Cargando mapa…")}</p>}>
          <ProducerMap
            entries={entries}
            center={center}
            radius={radius}
            onSelect={onSelect}
            onGroup={onGroup}
          />
        </Suspense>
      </div>
      <div className="explore-top">
        <div className="explore-heading">
          <div>
            <h1>{t("Explorar")}</h1>
            <p role="status">
              {busy
                ? t("Cargando productores…")
                : `${entries.length} ${t(entries.length === 1 ? "productor" : "productores")} · ${onMap.length} ${t("en el mapa")}`}
            </p>
          </div>
          <button
            className="explore-button"
            aria-expanded={filters}
            aria-controls="explore-filters"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={17} />
            {t("Filtros")}
          </button>
        </div>
        <label className="explore-search">
          <Search size={19} />
          <input
            aria-label={t("Buscar productos, productores o localidades")}
            placeholder={t("Productos, productores o localidades")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="explore-types" aria-label={t("Tipo de vendedor")}>
          {(
            [
              ["", "Todos"],
              ["professional", "Agricultores"],
              ["private", "Particulares"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={`explore-type${sellerType === value ? " active" : ""}`}
              aria-pressed={sellerType === value}
              onClick={() => setSellerType(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {filters ? (
          <div id="explore-filters" className="explore-filters">
            <div className="explore-filter-title">
              <h2>{t("Filtros")}</h2>
              <button
                aria-label={t("Cerrar filtros")}
                onClick={() => setFilters(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label>
              {t("Categoría")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t("Todas las categorías")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Distancia")}
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value="0">{t("Todas las distancias")}</option>
                {[1, 5, 10, 25, 50].map((n) => (
                  <option key={n} value={n} disabled={!center}>
                    {n} km
                  </option>
                ))}
              </select>
            </label>
            <button
              className="explore-button"
              onClick={locate}
              disabled={locating}
            >
              <LocateFixed size={16} />
              {locating ? t("Localizando…") : t("Usar mi ubicación")}
            </button>
            <form
              className="explore-zone"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const p = {
                  lat: Number(form.get("lat")),
                  lng: Number(form.get("lng")),
                };
                if (validPosition(p)) {
                  request.current++;
                  setLocating(false);
                  setCenter(p);
                  setGeoError("");
                }
              }}
            >
              <label>
                {t("Latitud")}
                <input
                  name="lat"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  required
                />
              </label>
              <label>
                {t("Longitud")}
                <input
                  name="lng"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  required
                />
              </label>
              <button className="explore-button">{t("Aplicar zona")}</button>
            </form>
            {center ? (
              <button
                className="explore-button"
                onClick={() => {
                  request.current++;
                  setLocating(false);
                  setCenter(null);
                  setRadius(0);
                }}
              >
                {t("Quitar zona")}
              </button>
            ) : null}
            <p>
              {t(
                "Tu zona no se guarda. Los particulares muestran solo una ubicación aproximada.",
              )}
            </p>
            <label className="explore-verified">
              <input type="checkbox" disabled />
              {t("Solo ecológicos verificados (pendiente)")}
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={euskoOnly}
                onChange={(e) => setEuskoOnly(e.target.checked)}
              />
              {t("Acepta Eusko")}
            </label>
            <AvailabilitySelect
              value={availability}
              onChange={setAvailability}
            />
            <p>
              {t(
                "El tipo de vendedor es declarado; no acredita actividad profesional ni producción ecológica.",
              )}
            </p>
            <button
              className="explore-primary"
              onClick={() => setFilters(false)}
            >
              {t("Mostrar resultados")}
            </button>
          </div>
        ) : null}
      </div>
      {geoError ? (
        <p className="explore-notice" role="alert">
          {t(geoError)}
          <button
            aria-label={t("Cerrar aviso")}
            onClick={() => setGeoError("")}
          >
            <X size={16} />
          </button>
        </p>
      ) : null}
      {list ? (
        <section
          className="explore-list"
          aria-label={t("Lista de productores")}
        >
          {entries.map(card)}
          {!entries.length && !busy && !storageError ? (
            <p>
              {t(
                "No hay productores con productos disponibles en esta selección.",
              )}
            </p>
          ) : null}
        </section>
      ) : null}
      {!list && !filters && !busy && !storageError && !onMap.length ? (
        <p className="explore-empty">
          {entries.length
            ? t(
                "Estos productores todavía no tienen coordenadas públicas disponibles. Puedes ver sus productos en la lista.",
              )
            : t(
                "No hay productores con productos disponibles en esta selección.",
              )}
        </p>
      ) : null}
      {!list && !filters && (preview || visibleGroup.length > 0) ? (
        <aside
          className="explore-preview"
          aria-label={t("Productores seleccionados")}
        >
          <button
            className="explore-preview-close"
            aria-label={t("Cerrar tarjeta")}
            onClick={() => {
              setSelected(null);
              setGroup([]);
            }}
          >
            <X size={20} />
          </button>
          {preview ? (
            card(preview)
          ) : (
            <>
              <h2>{visibleGroup.length} productores en esta zona</h2>
              {visibleGroup.slice(0, 50).map((entry) => (
                <button
                  className="explore-group-row"
                  key={entry.farm.id}
                  onClick={() => onSelect(entry)}
                >
                  {entry.farm.name}
                  <ChevronRight size={17} />
                </button>
              ))}
              {visibleGroup.length > 50 ? (
                <button onClick={() => setList(true)}>
                  {t("Ver todos en lista")}
                </button>
              ) : null}
            </>
          )}
        </aside>
      ) : null}
      <div className="explore-bottom">
        <button
          className="explore-button"
          onClick={() => {
            setList(!list);
            setFilters(false);
          }}
        >
          {list ? <Map size={17} /> : <List size={17} />}{" "}
          {t(list ? "MAPA" : "LISTA")}
        </button>
        <button
          className="explore-button explore-locate"
          aria-label={t("Centrar en mi ubicación")}
          disabled={locating}
          onClick={locate}
        >
          <LocateFixed size={22} />
        </button>
      </div>
    </section>
  );
}
