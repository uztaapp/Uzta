import { t } from "../lib/language";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { clusterEntries, type ExploreEntry } from "../lib/explore";
import { publicPosition, type Position } from "../lib/nearby";
import { sellerMarkerClass, sellerPosition } from "../lib/sellers";
export default function ProducerMap({
  kind = "producers",
  entries,
  center,
  radius,
  onSelect,
  onGroup,
}: {
  kind?: "producers" | "markets";
  entries: ExploreEntry[];
  center: Position | null;
  radius: number;
  onSelect: (entry: ExploreEntry) => void;
  onGroup: (entries: ExploreEntry[]) => void;
}) {
  const el = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    fitted = useRef(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: true,
      preferCanvas: true,
    }).setView([43.49, -1.47], 11);
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
      .on("tileerror", () => setTileError(true))
      .on("tileload", () => setTileError(false))
      .addTo(m);
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(el.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (center)
      m.fitBounds(
        L.latLng(center.lat, center.lng).toBounds(Math.max(radius, 1) * 2000),
        { padding: [30, 150], maxZoom: 14, animate: false },
      );
  }, [center, radius]);
  useEffect(() => {
    const m = map.current;
    if (!m || center || fitted.current) return;
    {
      const points = entries
        .map((e) => sellerPosition(e.farm.position, e.farm.sellerType))
        .filter((p): p is Position => p !== null);
      if (points.length) {
        m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
          padding: [45, 160],
          maxZoom: 12,
          animate: false,
        });
        fitted.current = true;
      }
    }
  }, [center, entries]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const layer = L.layerGroup().addTo(m);
    const render = () => {
      layer.clearLayers();
      if (center) {
        L.circleMarker([center.lat, center.lng], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: "#2b7de9",
          fillOpacity: 1,
        }).addTo(layer);
        if (radius)
          L.circle([center.lat, center.lng], {
            radius: radius * 1000,
            color: "#31552b",
            weight: 1,
            fillOpacity: 0.05,
          }).addTo(layer);
      }
      const visible = entries.filter((e) => {
        const p = sellerPosition(e.farm.position, e.farm.sellerType);
        return p && m.getBounds().pad(0.2).contains([p.lat, p.lng]);
      });
      for (const group of clusterEntries(visible, (p) =>
        m.latLngToContainerPoint([p.lat, p.lng]),
      )) {
        const expanded = m.getZoom() >= 16 && group.entries.length <= 50;
        const pins = expanded ? group.entries.map((e) => [e]) : [group.entries];
        pins.forEach((list, index) => {
          const angle = (index * Math.PI * 2) / pins.length,
            ring = Math.max(55, pins.length * 9);
          const point =
            expanded && pins.length > 1
              ? m.containerPointToLatLng([
                  group.x + Math.cos(angle) * ring,
                  group.y + Math.sin(angle) * ring,
                ])
              : L.latLng(group.position.lat, group.position.lng);
          const count = list.length;
          L.marker(point, {
            icon: L.divIcon({
              className: "uzta-map-marker",
              html: `<div class="uzta-map-pin${count > 1 ? " uzta-map-group" : sellerMarkerClass(list[0].farm.sellerType)}"><span aria-hidden="true">${count > 1 ? count : kind === "markets" ? '<img src="/brand/icons/calendar.png" width="30" height="30" alt="" />' : list[0].farm.sellerType === "private" ? "👤" : list[0].farm.sellerType === "professional" ? "🌱" : "📍"}</span></div>`,
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            }),
            title:
              count > 1
                ? `${count} ${kind === "markets" ? t("mercados agrupados") : "productores agrupados"}`
                : list[0].farm.name,
            alt:
              count > 1
                ? `${count} ${kind === "markets" ? t("mercados agrupados") : "productores agrupados"}`
                : list[0].farm.name,
            bubblingMouseEvents: false,
            autoPanOnFocus: false,
          })
            .on("click", () => {
              if (count === 1) onSelect(list[0]);
              else {
                onGroup(list);
                m.setView(point, Math.min(m.getZoom() + 2, 16), {
                  animate: false,
                });
              }
            })
            .addTo(layer);
        });
      }
    };
    render();
    m.on("moveend resize", render);
    return () => {
      m.off("moveend resize", render);
      layer.remove();
    };
  }, [entries, center, radius, onSelect, onGroup, kind]);
  return (
    <>
      <div
        ref={el}
        className="explore-canvas"
        aria-label={
          kind === "markets"
            ? t("Mapa de mercados")
            : "Mapa interactivo de productores"
        }
      />
      {tileError ? (
        <p className="map-tile-error" role="status">
          {t("No se pudo cargar parte del mapa. Puedes usar la lista.")}
        </p>
      ) : null}
    </>
  );
}
