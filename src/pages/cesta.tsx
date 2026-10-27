import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2, Minus, Plus, CalendarDays } from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { futureSlot } from "../lib/local-model";
export function Cesta() {
  const { data, run, mode, busy } = useDemo();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(false);
  const [slot, setSlot] = useState("");
  const submitting = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const items = data.products.filter((p) => (data.quantities[p.id] ?? 0) > 0);
  const farm = data.farms.find((f) => f.id === items[0]?.farmId);
  const slots = farm?.slots.filter((s) => futureSlot(s)) ?? [];
  const total = items.reduce(
    (sum, p) => sum + p.priceCents * data.quantities[p.id],
    0,
  );
  const unavailable = items.some(
    (p) => !p.active || data.quantities[p.id] > p.stock,
  );
  const validSlot = slots.some((s) => s.id === slot);
  async function reserve() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const ok = await run({
        type: "reserve",
        id: requestId.current,
        slotId: slot,
        now: new Date().toISOString(),
      });
      if (ok)
        void navigate({
          to: "/pedidos",
          search: mode === "cloud" ? {} : { pedido: requestId.current },
        });
    } finally {
      submitting.current = false;
    }
  }
  return (
    <>
      <div className="page-title">
        <Link to="/" aria-label="Volver al inicio">
          <ArrowLeft />
        </Link>
        <h1>Cesta de compra</h1>
      </div>
      {farm ? <p className="subtle">Productos de {farm.name}</p> : null}
      <div className="basket-layout">
        <section className="basket-items">
          {items.map((p) => (
            <article key={p.id} className="basket-item">
              <Photo
                src={p.photo}
                crop={p.photo === null ? [0, 0, 0, 0] : p.crop}
                label={p.name}
              />
              <div>
                <h2>{p.name}</h2>
                <p>
                  {euro(p.priceCents)} / {p.unit}
                </p>
                <div className="quantity">
                  <button
                    disabled={busy}
                    aria-label={`Reducir ${p.name}`}
                    onClick={() =>
                      run({ type: "quantity", id: p.id, delta: -1 })
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label={`Cantidad de ${p.name}`}>
                    {data.quantities[p.id]}
                  </output>
                  <button
                    disabled={
                      busy || !p.active || data.quantities[p.id] >= p.stock
                    }
                    aria-label={`Aumentar ${p.name}`}
                    onClick={() =>
                      run({ type: "quantity", id: p.id, delta: 1 })
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
                {!p.active || data.quantities[p.id] > p.stock ? (
                  <small role="alert">
                    Revisa el stock disponible ({p.stock}).
                  </small>
                ) : null}
              </div>
              <div className="item-end">
                <button
                  disabled={busy}
                  aria-label={`Eliminar ${p.name}`}
                  onClick={() => run({ type: "remove", id: p.id })}
                >
                  <Trash2 size={18} />
                </button>
                <strong>{euro(p.priceCents * data.quantities[p.id])}</strong>
              </div>
            </article>
          ))}
          {!items.length ? (
            <div className="empty">
              <h2>La cesta está vacía</h2>
              <Link to="/">Ver productos</Link>
            </div>
          ) : null}
        </section>
        <aside className="basket-summary">
          <div className="total">
            <strong>Total de productos</strong>
            <strong aria-label="Total de productos">{euro(total)}</strong>
          </div>
          <label className="message">
            Añadir un mensaje al productor (opcional)
            <textarea
              disabled={busy}
              maxLength={1000}
              value={data.message}
              onChange={(e) => run({ type: "message", value: e.target.value })}
              placeholder="Por ejemplo, si prefieres productos más grandes o más pequeños, etc."
            />
          </label>
          {!checkout ? (
            <>
              <button
                className="primary"
                disabled={busy || unavailable || !items.length}
                onClick={() => setCheckout(true)}
              >
                Confirmar reserva
              </button>
              <p className="pickup-note">
                <CalendarDays size={23} />
                Seleccionar fecha y hora de recogida en el siguiente paso.
              </p>
            </>
          ) : (
            <section className="checkout">
              <h2>Fecha y hora de recogida</h2>
              {slots.length ? (
                <label>
                  Franjas ofrecidas por {farm?.name}
                  <select
                    aria-label="Fecha y hora de recogida"
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                  >
                    <option value="">Selecciona una franja</option>
                    {slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} · {s.start} – {s.end}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p>
                  No hay franjas de recogida configuradas. Añádelas en{" "}
                  <Link to="/perfil" search={{ apartado: "horarios" }}>
                    Perfil → Horarios y entregas
                  </Link>
                  .
                </p>
              )}
              {!data.sessionActive ? (
                <p>
                  {mode === "cloud"
                    ? "Inicia sesión para reservar:"
                    : "Abre tu perfil local para continuar:"}{" "}
                  <Link to="/perfil">Mi perfil</Link>.
                </p>
              ) : null}
              <button
                className="primary"
                disabled={
                  busy ||
                  unavailable ||
                  !validSlot ||
                  !items.length ||
                  !data.sessionActive
                }
                onClick={reserve}
              >
                {mode === "cloud"
                  ? "Confirmar reserva"
                  : "Guardar reserva local"}
              </button>
              <button
                className="text-button"
                onClick={() => setCheckout(false)}
              >
                Volver a la cesta
              </button>
            </section>
          )}
          <p className="subtle">
            {mode === "cloud"
              ? "La reserva se confirmará con el stock y la franja disponibles del productor."
              : "Solo en este navegador · Sin reservas ni mensajes enviados al exterior"}
          </p>
        </aside>
      </div>
    </>
  );
}
