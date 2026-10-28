import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useUzta } from "../app-context";
import { Modal } from "./presentation";
import { t, useLanguage } from "../lib/language";
import {
  loadNotifications,
  readNotification,
  notificationTitle,
  type Notification,
} from "../lib/notifications";
import config from "../../config/uzta-cloud.public.json";
import "./notification-bell.css";

export function NotificationBell({
  enabled = config.notificationsReady,
}: {
  enabled?: boolean;
}) {
  useLanguage();
  const { userId, mode, data } = useUzta();
  const [open, setOpen] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<{
    user: string;
    rows: Notification[];
    count: number;
  } | null>(null);
  const [reading, setReading] = useState<string[]>([]);
  const current = useRef(userId),
    generation = useRef(0),
    inFlight = useRef(new Set<string>()),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  current.current = userId;
  const version = data.orders.map((o) => o.id + o.status).join(";");
  async function load() {
    if (!enabled || mode !== "cloud" || !userId) return;
    const owner = userId,
      request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadNotifications(owner);
      if (
        alive.current &&
        current.current === owner &&
        generation.current === request
      )
        setSnapshot({ user: owner, ...result });
    } catch {
      if (
        alive.current &&
        current.current === owner &&
        generation.current === request
      )
        setError("No se pudieron cargar las notificaciones.");
    } finally {
      if (
        alive.current &&
        current.current === owner &&
        generation.current === request
      )
        setLoading(false);
    }
  }
  useEffect(() => {
    setOpen(false);
    setError("");
    setReading([]);
    inFlight.current.clear();
    void load();
    return () => {
      generation.current++;
    };
  }, [userId, mode, enabled, version]);
  async function read(id: string) {
    if (!userId || inFlight.current.has(id)) return;
    const owner = userId;
    setError("");
    inFlight.current.add(id);
    setReading([...inFlight.current]);
    try {
      await readNotification(id);
      if (!alive.current || current.current !== owner) return;
      generation.current++;
      setLoading(false);
      setSnapshot((s) =>
        s?.user === owner && s.rows.some((n) => n.id === id)
          ? {
              ...s,
              rows: s.rows.filter((n) => n.id !== id),
              count: Math.max(0, s.count - 1),
            }
          : s,
      );
    } catch {
      if (alive.current && current.current === owner)
        setError("No se pudo marcar la notificación como leída.");
    } finally {
      if (alive.current && current.current === owner) {
        inFlight.current.delete(id);
        setReading([...inFlight.current]);
      }
    }
  }
  if (!enabled || mode !== "cloud" || !userId) return null;
  const own = snapshot?.user === userId ? snapshot : null;
  return (
    <>
      <div className="notification-toolbar">
        <button
          className="notification-bell"
          aria-label={t("Notificaciones")}
          onClick={() => {
            setOpen(true);
            if (!loading) void load();
          }}
        >
          <Bell size={21} />
          {!!own?.count && (
            <span aria-label={t("Pendientes")}>{own.count}</span>
          )}
          {error && <span aria-label={t("Error de notificaciones")}>!</span>}
        </button>
      </div>
      {open && (
        <Modal
          title={t("Notificaciones pendientes")}
          close={() => setOpen(false)}
        >
          <button
            className="text-button"
            disabled={loading}
            onClick={() => void load()}
          >
            {t("Actualizar notificaciones")}
          </button>
          {loading && <p role="status">{t("Cargando notificaciones…")}</p>}
          {error && <p role="alert">{t(error)}</p>}
          {!error && !loading && !own?.count && (
            <p>{t("No tienes notificaciones pendientes.")}</p>
          )}
          <ul className="notification-list">
            {own?.rows.map((n) => (
              <li key={n.id}>
                <Link
                  to="/pedidos"
                  search={{
                    pedido: n.order_id,
                    vista: n.audience === "seller" ? "productor" : undefined,
                  }}
                  onClick={() => {
                    void read(n.id);
                    setOpen(false);
                  }}
                >
                  {notificationTitle(n.kind)}
                  <small>
                    {t("Reserva")} #{n.order_id.slice(0, 8)}
                  </small>
                </Link>
                <button
                  className="text-button"
                  disabled={reading.includes(n.id)}
                  onClick={() => void read(n.id)}
                >
                  {t("Marcar como leída")}
                </button>
              </li>
            ))}
          </ul>
          {!!own && own.count > own.rows.length && (
            <p>
              {t(
                "Hay más avisos pendientes. Marca los anteriores y actualiza para verlos.",
              )}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
