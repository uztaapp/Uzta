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
const ProducerMap = lazy(() => import("../components/producer-map"));
export function Explorar() {
  const { data, mode, busy } = useDemo();
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
      ),
    [data.farms, data.products, query, category, center, radius],
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
          <p>{entry.farm.location}</p>
          <small>
            {center
              ? distanceLabel(center, entry.farm.position)
              : publicPosition(entry.farm.position)
                ? "Ubicación de la tienda"
                : "Sin ubicación pública en el mapa"}
          </small>
          <p>
            {entry.products.length}{" "}
            {entry.products.length === 1
              ? "producto disponible"
              : "productos disponibles"}
          </p>
          <p className="explore-prices">
            {entry.products
              .slice(0, 2)
              .map((p) => `${p.name} · ${euro(p.priceCents)} / ${p.unit}`)
              .join(" · ")}
          </p>
          <strong>
            Ver productos <ChevronRight size={14} />
          </strong>
        </div>
      </Link>
    );
  }
  return (
    <section className="uzta-explore" aria-label="Explorar productores">
      <div className="explore-map-wrap" inert={list} aria-hidden={list}>
        <Suspense fallback={<p>Cargando mapa…</p>}>
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
            <h1>Explorar</h1>
            <p role="status">
              {busy
                ? "Cargando productores…"
                : `${entries.length} ${entries.length === 1 ? "productor" : "productores"} · ${onMap.length} en el mapa`}
            </p>
          </div>
          <button
            className="explore-button"
            aria-expanded={filters}
            aria-controls="explore-filters"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={17} />
            Filtros
          </button>
        </div>
        <label className="explore-search">
          <Search size={19} />
          <input
            aria-label="Buscar productos, productores o localidades"
            placeholder="Productos, productores o localidades"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="explore-types" aria-label="Tipo de productor">
          <button className="explore-type active" aria-pressed="true">
            Todos
          </button>
          <button
            className="explore-type"
            disabled
            title="Clasificación profesional pendiente de integrar"
          >
            Agricultores
          </button>
          <button
            className="explore-type"
            disabled
            title="Clasificación de particulares pendiente de integrar"
          >
            Particulares
          </button>
        </div>
        {filters ? (
          <div id="explore-filters" className="explore-filters">
            <div className="explore-filter-title">
              <h2>Filtros</h2>
              <button
                aria-label="Cerrar filtros"
                onClick={() => setFilters(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label>
              Categoría
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Distancia
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value="0">Todas las distancias</option>
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
              {locating ? "Localizando…" : "Usar mi ubicación"}
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
                Latitud
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
                Longitud
                <input
                  name="lng"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  required
                />
              </label>
              <button className="explore-button">Aplicar zona</button>
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
                Quitar zona
              </button>
            ) : null}
            <p>
              Tu ubicación solo se usa en esta pantalla. El mapa se carga desde
              OpenStreetMap; los puntos de las tiendas son aproximados.
            </p>
            <label className="explore-verified">
              <input type="checkbox" disabled />
              Solo ecológicos verificados (pendiente)
            </label>
            <p className="explore-pending">
              <Leaf size={15} />
              Clasificación agricultor/particular y certificación ecológica
              pendientes. No se deducen de los nombres ni de las etiquetas
              actuales.
            </p>
            <button
              className="explore-primary"
              onClick={() => setFilters(false)}
            >
              Mostrar resultados
            </button>
          </div>
        ) : null}
      </div>
      {geoError ? (
        <p className="explore-notice" role="alert">
          {geoError}
          <button aria-label="Cerrar aviso" onClick={() => setGeoError("")}>
            <X size={16} />
          </button>
        </p>
      ) : null}
      {list ? (
        <section className="explore-list" aria-label="Lista de productores">
          {entries.map(card)}
          {!entries.length ? (
            <p>
              No hay productores con productos disponibles en esta selección.
            </p>
          ) : null}
        </section>
      ) : null}
      {!list && !filters && !busy && !onMap.length ? (
        <p className="explore-empty">
          {entries.length
            ? "Estos productores todavía no tienen coordenadas públicas disponibles. Puedes ver sus productos en la lista."
            : "No hay productores con productos disponibles en esta selección."}
        </p>
      ) : null}
      {!list && !filters && (preview || visibleGroup.length > 0) ? (
        <aside
          className="explore-preview"
          aria-label="Productores seleccionados"
        >
          <button
            className="explore-preview-close"
            aria-label="Cerrar tarjeta"
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
                  Ver todos en lista
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
          {list ? "MAPA" : "LISTA"}
        </button>
        <button
          className="explore-button explore-locate"
          aria-label="Centrar en mi ubicación"
          disabled={locating}
          onClick={locate}
        >
          <LocateFixed size={22} />
        </button>
      </div>
    </section>
  );
}
