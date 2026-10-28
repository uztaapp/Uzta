import { PaymentChoice } from "../components/eusko";
import { paymentAllowed, type PaymentPreference } from "../lib/eusko";
import cloudConfig from "../../config/uzta-cloud.public.json";
import { AvailabilityLabel } from "../components/product-availability";
import { canReserve as productReservable } from "../lib/availability";
import "./cesta.css";
import { t, useLanguage } from "../lib/language";
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2, Minus, Plus, CalendarDays } from "lucide-react";
import { Photo, euro, useDemo } from "../design";
import { pickupDate } from "../lib/pickup-date";
import { PickupLocation } from "../components/pickup-location";
import { pendingReservationId } from "../lib/checkout-receipt";
import { futureSlot } from "../lib/local-model";
export function Cesta() {
  useLanguage();
  const { data, run, mode, busy, userId, storageError } = useDemo();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [payment, setPayment] = useState<{
    farm: string;
    value: PaymentPreference;
  }>({ farm: "", value: "EUR" });
  const [date, setDate] = useState("");
  const [reviewed, setReviewed] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const finished = useRef(false);
  const [slot, setSlot] = useState("");
  const submitting = useRef(false);
  const requestId = useRef<string>(crypto.randomUUID());
  const items = data.products.filter((p) => (data.quantities[p.id] ?? 0) > 0);
  const farm = data.farms.find((f) => f.id === items[0]?.farmId);
  const preference = payment.farm === farm?.id ? payment.value : "EUR";
  const paymentEnabled = mode === "demo" || cloudConfig.euskoReady;
  const slots = farm?.slots.filter((s) => futureSlot(s)) ?? [];
  const total = items.reduce(
    (sum, p) => sum + p.priceCents * data.quantities[p.id],
    0,
  );
  const unavailable = items.some(
    (p) => !productReservable(p) || data.quantities[p.id] > p.stock,
  );
  const dates = [...new Set(slots.map((s) => s.date))].sort();
  const chosenSlot = slots.find((s) => s.id === slot && s.date === date);
  const validSlot = !!chosenSlot;
  const multipleSellers = new Set(items.map((p) => p.farmId)).size > 1;
  const reviewKey = JSON.stringify({
    items: items.map((p) => [
      p.id,
      data.quantities[p.id],
      p.priceCents,
      p.active,
      p.stock,
      p.availability,
      p.expectedAvailableOn,
    ]),
    preference,
    paymentMethods: [farm?.euskoNotes, farm?.euskoDigital],
    pickup: chosenSlot,
    message: data.message,
  });
  const changed = step === 3 && reviewed !== reviewKey;
  const canReserve =
    !busy &&
    !unavailable &&
    (!paymentEnabled || paymentAllowed(farm, preference)) &&
    !multipleSellers &&
    validSlot &&
    items.length > 0 &&
    data.sessionActive &&
    !changed;

  async function reserve() {
    if (submitting.current || finished.current || !canReserve) return;
    submitting.current = true;
    setError("");
    try {
      const reservationId =
        mode === "cloud" && userId
          ? (pendingReservationId(userId) ?? requestId.current)
          : requestId.current;
      const ok = await run({
        type: "reserve",
        id: reservationId,
        slotId: slot,
        now: new Date().toISOString(),
        ...(paymentEnabled ? { paymentPreference: preference } : {}),
      });
      if (ok) {
        finished.current = true;
        setReceipt(reservationId);
      }
    } catch {
      setError(
        "No se pudo comprobar la reserva pendiente. Actualiza tus pedidos antes de repetir.",
      );
    } finally {
      submitting.current = false;
    }
  }
  if (receipt)
    return (
      <div className="uzta-basket checkout-receipt">
        <h1>{t("Reserva registrada")}</h1>
        <p role="status">
          {t("Tu reserva se ha guardado. No vuelvas a confirmarla.")}
        </p>
        <p>
          {t("Número de reserva")}
          <strong className="reservation-number">{receipt}</strong>
        </p>
        <p className="payment-note">
          {t(
            "Paga directamente al vendedor durante la recogida. UZTA no cobra online.",
          )}
        </p>
        <Link className="primary" to="/pedidos" search={{ pedido: receipt }}>
          {t("Ver mi reserva")}
        </Link>
        <Link className="text-button" to="/">
          {t("Seguir explorando")}
        </Link>
      </div>
    );
  return (
    <div className="uzta-basket">
      <div className="page-title">
        <Link to="/" aria-label={t("Volver al inicio")}>
          <ArrowLeft />
        </Link>
        <h1>{t("Cesta de compra")}</h1>
      </div>
      <ol className="checkout-steps" aria-label={t("Pasos de la reserva")}>
        {["Revisar cesta", "Elegir recogida", "Confirmar reserva"].map(
          (label, i) => (
            <li key={label} aria-current={step === i + 1 ? "step" : undefined}>
              <span aria-hidden="true">{i + 1}</span>
              {t(label)}
            </li>
          ),
        )}
      </ol>
      {farm ? (
        <p className="subtle basket-producer">
          {t("Productos de")} {farm.name}
        </p>
      ) : null}
      <div className="basket-layout">
        <section className="basket-items">
          {items.map((p) => (
            <article key={p.id} className="basket-item">
              <Photo
                src={p.photo === undefined ? p.photoUrl : p.photo}
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
                    disabled={busy || step !== 1}
                    aria-label={`${t("Reducir")} ${p.name}`}
                    onClick={() =>
                      run({ type: "quantity", id: p.id, delta: -1 })
                    }
                  >
                    <Minus size={15} />
                  </button>
                  <output aria-label={`${t("Cantidad de")} ${p.name}`}>
                    {data.quantities[p.id]}
                  </output>
                  <button
                    disabled={
                      busy ||
                      step !== 1 ||
                      !productReservable(p) ||
                      data.quantities[p.id] >= p.stock
                    }
                    aria-label={`${t("Aumentar")} ${p.name}`}
                    onClick={() =>
                      run({ type: "quantity", id: p.id, delta: 1 })
                    }
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <AvailabilityLabel product={p} />
                {!productReservable(p) || data.quantities[p.id] > p.stock ? (
                  <small role="alert">
                    {t("Revisa el stock disponible (")}
                    {p.stock}).
                  </small>
                ) : null}
              </div>
              <div className="item-end">
                <button
                  disabled={busy || step !== 1}
                  aria-label={`${t("Eliminar")} ${p.name}`}
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
              <h2>{t("La cesta está vacía")}</h2>
              <Link to="/">{t("Ver productos")}</Link>
            </div>
          ) : null}
        </section>
        <aside className="basket-summary">
          <div className="total">
            <strong>{t("Total de productos")}</strong>
            <strong aria-label={t("Total de productos")}>{euro(total)}</strong>
          </div>
          {multipleSellers && (
            <p role="alert">
              {t("Cada reserva debe contener productos de un solo vendedor.")}
            </p>
          )}
          {error && <p role="alert">{t(error)}</p>}
          {step === 1 ? (
            <>
              <button
                className="primary"
                disabled={
                  busy ||
                  unavailable ||
                  multipleSellers ||
                  !items.length ||
                  !!storageError
                }
                onClick={() => setStep(2)}
              >
                {t("Elegir recogida")}
              </button>
              <p className="pickup-note">
                <CalendarDays size={23} />
                {t(
                  "Seleccionar fecha y hora de recogida en el siguiente paso.",
                )}
              </p>
            </>
          ) : (
            <section className="checkout">
              <h2>{t(step === 2 ? "Elegir recogida" : "Revisar reserva")}</h2>
              {step === 2 ? (
                <>
                  {slots.length ? (
                    <>
                      <label>
                        {t("Fecha de recogida")}
                        <select
                          value={date}
                          onChange={(e) => {
                            setDate(e.target.value);
                            setSlot("");
                          }}
                          disabled={busy}
                        >
                          <option value="">{t("Selecciona una fecha")}</option>
                          {dates.map((d) => (
                            <option key={d} value={d}>
                              {pickupDate(d)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t("Franja horaria")}
                        <select
                          value={slot}
                          onChange={(e) => setSlot(e.target.value)}
                          disabled={busy || !date}
                        >
                          <option value="">{t("Selecciona una franja")}</option>
                          {slots
                            .filter((s) => s.date === date)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.start} – {s.end}
                              </option>
                            ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <p>
                      {t(
                        "El vendedor todavía no ha publicado horarios de recogida. Vuelve a consultar más tarde.",
                      )}
                    </p>
                  )}
                  <label className="message">
                    {t("Añadir un mensaje al vendedor (opcional)")}
                    <textarea
                      disabled={busy}
                      maxLength={1000}
                      value={data.message}
                      onChange={(e) =>
                        run({ type: "message", value: e.target.value })
                      }
                      placeholder={t(
                        "Por ejemplo, una indicación para tu recogida.",
                      )}
                    />
                  </label>
                </>
              ) : (
                <>
                  {chosenSlot && (
                    <p>
                      {pickupDate(chosenSlot.date)} · {chosenSlot.start} –{" "}
                      {chosenSlot.end}
                    </p>
                  )}
                  {data.message && (
                    <p>
                      <strong>{t("Mensaje:")}</strong> {data.message}
                    </p>
                  )}
                  {changed && (
                    <p role="alert">
                      {t(
                        "La cesta o la recogida han cambiado. Revisa la reserva de nuevo.",
                      )}
                    </p>
                  )}
                </>
              )}
              {paymentEnabled && (
                <PaymentChoice
                  farm={farm}
                  value={preference}
                  onChange={(value) =>
                    setPayment({ farm: farm?.id ?? "", value })
                  }
                  disabled={step !== 2 || busy}
                />
              )}
              <PickupLocation farm={farm} />
              <p className="payment-note">
                {t(
                  "Paga directamente al vendedor durante la recogida. UZTA no cobra online.",
                )}
              </p>
              {!data.sessionActive && (
                <p>
                  {t("Inicia sesión para reservar:")}{" "}
                  <Link to="/perfil">{t("Mi perfil")}</Link>
                </p>
              )}
              {step === 2 ? (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    unavailable ||
                    multipleSellers ||
                    !validSlot ||
                    !items.length
                  }
                  onClick={() => {
                    setReviewed(reviewKey);
                    setStep(3);
                  }}
                >
                  {t("Revisar reserva")}
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={!canReserve}
                  onClick={reserve}
                >
                  {t("Confirmar reserva")}
                </button>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setStep(step === 3 ? 2 : 1)}
              >
                {t(step === 3 ? "Cambiar recogida" : "Volver a la cesta")}
              </button>
            </section>
          )}
          <p className="subtle">
            {mode === "cloud"
              ? t(
                  "La reserva se confirmará con el stock y la franja disponibles del productor.",
                )
              : t(
                  "Solo en este navegador · Sin reservas ni mensajes enviados al exterior",
                )}
          </p>
        </aside>
      </div>
    </div>
  );
}
