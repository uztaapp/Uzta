import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { publicPosition, type Position } from "../lib/nearby";
import "./store-location-picker.css";
export default function StoreLocationPicker({
  initialPosition,
  disabled = false,
}: {
  initialPosition?: Position | null;
  disabled?: boolean;
}) {
  const [point, setPoint] = useState(() => publicPosition(initialPosition));
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const locationRequest = useRef(0);
  function cancelLocation() {
    locationRequest.current++;
    setLocating(false);
    setLocationMessage("");
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Este dispositivo no ofrece ubicación. Coloca el punto en el mapa.",
      );
      return;
    }
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        if (locked.current) return;
        const next = publicPosition({
          lat: coords.latitude,
          lng: coords.longitude,
        });
        if (!next) {
          setLocationMessage(
            "No se ha obtenido una ubicación válida. Coloca el punto en el mapa.",
          );
          return;
        }
        setPoint(next);
        map.current?.setView([next.lat, next.lng], 18);
        setLocationMessage(
          `Ubicación obtenida${Number.isFinite(coords.accuracy) ? ` (precisión estimada: ${Math.ceil(coords.accuracy)} m)` : ""}. Revisa el punto y ajústalo a la entrada antes de guardar.`,
        );
      },
      (error) => {
        if (request !== locationRequest.current) return;
        setLocating(false);
        if (locked.current) return;
        setLocationMessage(
          error.code === 1
            ? "Permiso de ubicación denegado. Puedes permitirlo en el navegador o colocar el punto en el mapa."
            : "No se pudo obtener tu ubicación. Comprueba el GPS y vuelve a intentarlo, o coloca el punto en el mapa.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  const canvas = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    marker = useRef<L.Marker | null>(null);
  const locked = useRef(disabled);
  locked.current = disabled;
  useEffect(() => {
    if (disabled) cancelLocation();
  }, [disabled]);
  useEffect(() => {
    if (!canvas.current) return;
    const start = publicPosition(initialPosition);
    const m = L.map(canvas.current, { scrollWheelZoom: false }).setView(
      start ? [start.lat, start.lng] : [43.49, -1.47],
      start ? 18 : 11,
    );
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.on("click", (event: L.LeafletMouseEvent) => {
      if (!locked.current) {
        cancelLocation();
        setPoint(
          publicPosition({ lat: event.latlng.lat, lng: event.latlng.lng }),
        );
      }
    });
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(canvas.current);
    return () => {
      locationRequest.current++;
      observer.disconnect();
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // Initial viewport only. Choosing or dragging a point must not reset navigation.
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!point) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = L.marker([point.lat, point.lng], {
        draggable: !disabled,
        autoPan: true,
        title: "Punto público de tu tienda",
        alt: "Punto público de tu tienda",
        icon: L.divIcon({
          className: "store-location-pin",
          html: '<span aria-hidden="true">📍</span>',
          iconSize: [40, 40],
          iconAnchor: [20, 35],
        }),
      })
        .on("dragend", () => {
          if (locked.current) return;
          cancelLocation();
          const pos = marker.current?.getLatLng();
          if (pos) setPoint(publicPosition({ lat: pos.lat, lng: pos.lng }));
        })
        .addTo(m);
    } else marker.current.setLatLng([point.lat, point.lng]);
    if (disabled) marker.current.dragging?.disable();
    else marker.current.dragging?.enable();
  }, [point, disabled]);
  return (
    <div className="store-location-picker">
      <p>
        Pulsa en el mapa para colocar el punto de tu tienda. Después puedes
        arrastrarlo o desplazar el mapa y usar el centro.
      </p>
      <div
        ref={canvas}
        className="store-location-map"
        aria-label="Elegir ubicación pública de la tienda"
        aria-disabled={disabled}
      />
      <input type="hidden" name="publicLatitude" value={point?.lat ?? ""} />
      <input type="hidden" name="publicLongitude" value={point?.lng ?? ""} />
      <div className="store-location-actions">
        <button type="button" disabled={disabled || locating} onClick={locate}>
          {locating ? "Buscando ubicación…" : "Usar mi ubicación"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            cancelLocation();
            const center = map.current?.getCenter();
            if (center)
              setPoint(publicPosition({ lat: center.lat, lng: center.lng }));
          }}
        >
          Usar el centro del mapa
        </button>
        <button
          type="button"
          disabled={disabled || !point}
          onClick={() => {
            cancelLocation();
            setPoint(null);
          }}
        >
          Quitar punto
        </button>
      </div>
      {locationMessage && <p role="status">{locationMessage}</p>}
      <p role="status">
        {point
          ? "Punto seleccionado. Se guardará al pulsar Guardar tienda."
          : "Sin punto público seleccionado."}
      </p>
      <small>
        Se publicará el punto exacto que elijas para que puedan encontrar tu
        tienda. Usa tu ubicación solo si estás allí y ajusta el punto a la
        entrada. Se enviará a UZTA al pulsar Guardar tienda.
      </small>
    </div>
  );
}
