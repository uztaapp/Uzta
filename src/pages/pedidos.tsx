import "./pedidos.css";
import { t, t as translate, useLanguage } from "../lib/language";
import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Photo, Modal, euro, useDemo } from "../design";
import { PickupLocation } from "../components/pickup-location";
import { pickupDate } from "../lib/pickup-date";
import { currentLanguage } from "../lib/language";
import { lineTotal } from "../lib/local-model";
export function Pedidos() {
  useLanguage();
  const search = useSearch({ strict: false }) as {
    pedido?: string;
    vista?: string;
  };
  const [tab, setTab] = useState(
    search.vista === "productor" ? "Como productor" : "Compras",
  );
  const {
    data,
    run,
    mode,
    managedFarmId,
    userId,
    busy,
    refresh,
    storageError,
  } = useDemo();
  const navigate = useNavigate();
  const selected = data.orders.find((o) => o.id === search.pedido);
  const visible =
    tab === "Compras"
      ? data.orders.filter((o) => mode === "demo" || o.customerId === userId)
      : data.orders.filter((o) => o.farmId === managedFarmId);
  const selectedFarm = data.farms.find((f) => f.id === selected?.farmId);
  const pendingReceived = data.orders.filter(
    (o) => o.farmId === managedFarmId && o.status === "Pendiente",
  ).length;
  return (
    <div className="uzta-orders">
      <div className="page-title">
        <h1>{t("Mis pedidos")}</h1>
      </div>
      <div className="segmented" role="tablist" aria-label="Tipo de pedidos">
        {["Compras", "Como productor"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {translate(t)}
          </button>
        ))}
      </div>
      <p className="subtle">
        {mode === "demo"
          ? t("Reservas de demostración guardadas en este navegador.")
          : t("Tus reservas y su estado actual.")}
      </p>
      {mode === "cloud" ? (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {t("Actualizar pedidos")}
        </button>
      ) : null}
      {tab === "Como productor" && pendingReceived > 0 && (
        <p className="pickup-notice" role="status">
          {t("Reservas pendientes de recogida:")}{" "}
          <strong>{pendingReceived}</strong>
        </p>
      )}
      {search.pedido && !selected && !busy && !storageError && (
        <p role="alert">
          {t(
            "Esta reserva no está disponible para tu cuenta. Actualiza los pedidos si acabas de reservar.",
          )}
        </p>
      )}
      <div className="orders" role="tabpanel">
        {visible.map((o) => (
          <button
            className="order-card"
            key={o.id}
            onClick={() =>
              void navigate({
                to: "/pedidos",
                search: {
                  pedido: o.id,
                  vista: tab === "Como productor" ? "productor" : undefined,
                },
              })
            }
          >
            <div className="order-top">
              <Photo
                className="avatar"
                crop={mode === "demo" ? [383, 184, 78, 82] : [0, 0, 0, 0]}
                label={
                  mode === "demo"
                    ? "Productor de ejemplo"
                    : `Productor: ${o.farmName}`
                }
              />
              <div>
                <h2>{o.farmName}</h2>
                <small>
                  {new Intl.DateTimeFormat(
                    currentLanguage() === "en" ? "en-GB" : currentLanguage(),
                    {
                      dateStyle: "medium",
                      timeZone: "Europe/Madrid",
                    },
                  ).format(new Date(o.createdAt))}
                </small>
              </div>
              <span
                className={`status ${o.status === "Pendiente" ? "pending" : o.status === "Completado" ? "completed" : "other"}`}
              >
                {translate(o.status)}
              </span>
            </div>
            <div className="order-photos">
              {o.lines.slice(0, 4).map((p) => {
                const product = data.products.find(
                  (item) => item.id === p.productId,
                );
                return (
                  <Photo
                    key={p.productId}
                    src={
                      product?.photo === undefined
                        ? product?.photoUrl
                        : product.photo
                    }
                    crop={
                      mode === "demo" && product?.photo !== null
                        ? p.crop
                        : [0, 0, 0, 0]
                    }
                    label={p.name}
                  />
                );
              })}
              <ChevronRight />
            </div>
            <p className="order-amount">
              {o.lines.length}{" "}
              {o.lines.length === 1 ? t("producto") : t("productos")} ·{" "}
              {euro(lineTotal(o.lines))}
            </p>
            <p>
              {t("Recogida:")} {pickupDate(o.pickup.date)} · {o.pickup.start} –{" "}
              {o.pickup.end}
            </p>
            {tab === "Como productor" ? (
              <p className="received-order-reference">
                Reserva #{o.id.slice(0, 8)}
                {o.message ? ` · ${o.message}` : ""}
              </p>
            ) : null}
            <small>
              {o.example
                ? t("Ejemplo de la maqueta")
                : mode === "cloud"
                  ? t("Reserva")
                  : t("Reserva local")}
            </small>
          </button>
        ))}
        {!visible.length && !busy && !storageError ? (
          <div className="empty">
            <h2>{t("No hay pedidos todavía")}</h2>
            <Link to="/">{t("Ver productos")}</Link>
          </div>
        ) : null}
      </div>
      {selected ? (
        <Modal
          title={
            selected.example
              ? t("Pedido de ejemplo")
              : mode === "cloud"
                ? t("Detalle de la reserva")
                : t("Detalle de la reserva local")
          }
          close={() =>
            void navigate({
              to: "/pedidos",
              search: {
                vista: tab === "Como productor" ? "productor" : undefined,
              },
            })
          }
        >
          <p>
            {t("Número de reserva")}
            <strong className="reservation-number">{selected.id}</strong>
          </p>
          <p>
            <strong>{selected.farmName}</strong>
          </p>
          <p>
            {pickupDate(selected.pickup.date)} · {selected.pickup.start} –{" "}
            {selected.pickup.end}
          </p>
          <p>
            {t("Estado:")}
            <strong>{t(selected.status)}</strong>
          </p>
          <PickupLocation farm={selectedFarm} />
          <p className="payment-note">
            {t(
              "Paga directamente al vendedor durante la recogida. UZTA no cobra online.",
            )}
          </p>
          {selected.status === "Pendiente" && (
            <p className="subtle">
              {t(
                "Reserva registrada, pendiente de recogida. No necesita otra confirmación del vendedor.",
              )}
            </p>
          )}
          <ul className="order-lines">
            {selected.lines.map((line) => (
              <li key={line.productId}>
                <span>
                  {line.name} · {line.quantity} {line.unit}
                </span>
                <strong>{euro(line.priceCents * line.quantity)}</strong>
              </li>
            ))}
          </ul>
          <div className="total">
            <strong>{t("Total")}</strong>
            <strong>{euro(lineTotal(selected.lines))}</strong>
          </div>
          {selected.message ? (
            <p>
              <strong>{t("Mensaje:")}</strong> {selected.message}
            </p>
          ) : null}
          <p className="subtle">
            {selected.example
              ? t("Ejemplo ilustrativo, sin reserva real.")
              : mode === "cloud"
                ? t("Reserva guardada en tu cuenta de UZTA.")
                : t("Conservado en este equipo. No enviado al productor.")}
          </p>
          {tab === "Como productor" &&
          !selected.example &&
          selected.status === "Pendiente" &&
          selected.farmId === managedFarmId ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => run({ type: "complete", id: selected.id })}
            >
              {t("Marcar recogido")}
            </button>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
