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
  const canvas = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    marker = useRef<L.Marker | null>(null);
  const locked = useRef(disabled);
  locked.current = disabled;
  useEffect(() => {
    if (!canvas.current) return;
    const start = publicPosition(initialPosition);
    const m = L.map(canvas.current, { scrollWheelZoom: false }).setView(
      start ? [start.lat, start.lng] : [43.49, -1.47],
      start ? 13 : 11,
    );
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.on("click", (event: L.LeafletMouseEvent) => {
      if (!locked.current)
        setPoint(
          publicPosition({ lat: event.latlng.lat, lng: event.latlng.lng }),
        );
    });
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(canvas.current);
    return () => {
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
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
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
          onClick={() => setPoint(null)}
        >
          Quitar punto
        </button>
      </div>
      <p role="status">
        {point
          ? "Punto seleccionado. Se guardará al pulsar Guardar tienda."
          : "Sin punto público seleccionado."}
      </p>
      <small>
        Se publicará una ubicación aproximada. Elige una zona que quieras hacer
        pública; no necesitas escribir coordenadas.
      </small>
    </div>
  );
}
