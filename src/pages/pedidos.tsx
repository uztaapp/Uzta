import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Photo, Modal, euro, useDemo } from "../design";
import { lineTotal } from "../lib/local-model";
export function Pedidos() {
  const search = useSearch({ strict: false }) as {
    pedido?: string;
    vista?: string;
  };
  const [tab, setTab] = useState(
    search.vista === "productor" ? "Como productor" : "Compras",
  );
  const { data, run } = useDemo();
  const navigate = useNavigate();
  const selected = data.orders.find((o) => o.id === search.pedido);
  const visible =
    tab === "Compras"
      ? data.orders
      : data.orders.filter((o) => o.farmId === "urki");
  const date = (value: string) =>
    new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(
      new Date(value + "T12:00:00"),
    );
  return (
    <>
      <div className="page-title">
        <h1>Mis pedidos</h1>
      </div>
      <div className="segmented" role="tablist" aria-label="Tipo de pedidos">
        {["Compras", "Como productor"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="subtle">
        Reservas guardadas solo en este navegador. Los ejemplos están señalados.
      </p>
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
                crop={[383, 184, 78, 82]}
                label="Productor de ejemplo"
              />
              <div>
                <h2>{o.farmName}</h2>
                <small>{date(o.pickup.date)}</small>
              </div>
              <span
                className={`status ${o.status === "Pendiente" ? "pending" : ""}`}
              >
                {o.status}
              </span>
            </div>
            <div className="order-photos">
              {o.lines.slice(0, 4).map((p) => (
                <Photo key={p.productId} crop={p.crop} label={p.name} />
              ))}
              <ChevronRight />
            </div>
            <p>
              {o.lines.length} productos · {euro(lineTotal(o.lines))}
            </p>
            <p>
              Recogida: {o.pickup.start} – {o.pickup.end}
            </p>
            <small>
              {o.example ? "Ejemplo de la maqueta" : "Reserva local"}
            </small>
          </button>
        ))}
        {!visible.length ? (
          <div className="empty">
            <h2>No hay pedidos todavía</h2>
            <Link to="/">Ver productos</Link>
          </div>
        ) : null}
      </div>
      {selected ? (
        <Modal
          title={
            selected.example
              ? "Pedido de ejemplo"
              : "Detalle de la reserva local"
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
            <strong>{selected.farmName}</strong>
          </p>
          <p>
            {date(selected.pickup.date)} · {selected.pickup.start} –{" "}
            {selected.pickup.end}
          </p>
          <p>
            Estado: <strong>{selected.status}</strong>
          </p>
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
            <strong>Total</strong>
            <strong>{euro(lineTotal(selected.lines))}</strong>
          </div>
          {selected.message ? (
            <p>
              <strong>Mensaje:</strong> {selected.message}
            </p>
          ) : null}
          <p className="subtle">
            {selected.example
              ? "Ejemplo ilustrativo, sin reserva real."
              : "Conservado en este equipo. No enviado al productor."}
          </p>
          {tab === "Como productor" &&
          !selected.example &&
          selected.status === "Pendiente" ? (
            <button
              className="primary"
              onClick={() => run({ type: "complete", id: selected.id })}
            >
              Marcar recogido
            </button>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
