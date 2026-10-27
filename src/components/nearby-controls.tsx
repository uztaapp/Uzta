import { useState, useRef, useEffect, type FormEvent } from "react";
import { validPosition, type Position } from "../lib/nearby";
import { t, useLanguage } from "../lib/language";
export function NearbyControls({
  center,
  radius,
  onCenter,
  onRadius,
}: {
  center: Position | null;
  radius: number;
  onCenter: (p: Position | null) => void;
  onRadius: (n: number) => void;
}) {
  useLanguage();
  const [lat, setLat] = useState(""),
    [lng, setLng] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    request = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current++;
    };
  }, []);
  function apply(e: FormEvent) {
    e.preventDefault();
    const p = { lat: Number(lat), lng: Number(lng) };
    if (!lat.trim() || !lng.trim() || !validPosition(p)) {
      setError("Coordenadas no válidas.");
      return;
    }
    request.current++;
    setPending(false);
    setError("");
    onCenter(p);
  }
  function locate() {
    if (!navigator.geolocation) {
      setError(
        "La ubicación no está disponible. Introduce una zona manualmente.",
      );
      return;
    }
    const id = ++request.current;
    setPending(true);
    setError("");
    try {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          if (!alive.current || request.current !== id) return;
          const p = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          };
          if (validPosition(p)) {
            setLat(String(p.lat));
            setLng(String(p.lng));
            onCenter(p);
          } else setError("Coordenadas no válidas.");
          setPending(false);
        },
        () => {
          if (alive.current && request.current === id) {
            setPending(false);
            setError(
              "No se pudo obtener la ubicación. Puedes introducir una zona manualmente.",
            );
          }
        },
        { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 },
      );
    } catch {
      setPending(false);
      setError(
        "La ubicación no está disponible. Introduce una zona manualmente.",
      );
    }
  }
  return (
    <details className="nearby-controls">
      <summary>
        {t("Buscar por zona")}
        {center ? ` · ${radius} km` : ""}
      </summary>
      <p className="subtle">
        {t(
          "Tu zona de búsqueda se usa solo en esta pantalla. No se guarda ni se envía al productor.",
        )}
      </p>
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={locate}
      >
        {t(pending ? "Obteniendo ubicación…" : "Usar mi ubicación")}
      </button>
      <form className="uzta-form" onSubmit={apply}>
        <div className="form-columns">
          <label>
            {t("Latitud")}
            <input
              type="number"
              min="-90"
              max="90"
              step="any"
              required
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </label>
          <label>
            {t("Longitud")}
            <input
              type="number"
              min="-180"
              max="180"
              step="any"
              required
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </label>
        </div>
        <label>
          {t("Radio de búsqueda")}
          <select
            value={radius}
            onChange={(e) => onRadius(Number(e.target.value))}
          >
            {[1, 5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} km
              </option>
            ))}
          </select>
        </label>
        <button className="primary">{t("Aplicar zona")}</button>
      </form>
      {error ? <p role="alert">{t(error)}</p> : null}
      {center ? (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            request.current++;
            setPending(false);
            setError("");
            setLat("");
            setLng("");
            onCenter(null);
          }}
        >
          {t("Quitar filtro de zona")}
        </button>
      ) : null}
      <p className="subtle">
        {t(
          "Las distancias son aproximadas. Al aplicar un radio se excluyen tiendas sin coordenadas.",
        )}
      </p>
    </details>
  );
}
