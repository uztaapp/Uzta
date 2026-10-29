import { BackLink } from "./back-link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUzta } from "../app-context";
import config from "../../config/uzta-cloud.public.json";
import {
  applicationSchema,
  sendProducerRequest,
  loadProducerRequests,
  reviewProducerRequest,
  type ProducerRequest,
} from "../lib/producer-approval";
import { t, useLanguage, currentLanguage } from "../lib/language";
export function ProducerApplication() {
  useLanguage();
  const { data, refresh, busy } = useUzta();
  const [open, setOpen] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const status = data.producerAccess?.status;
  useEffect(() => {
    if (!config.producerApprovalsReady) return;
    let last = 0;
    const check = () => {
      if (Date.now() - last < 15000) return;
      last = Date.now();
      void refresh();
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [refresh]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || !config.producerApprovalsReady) return;
    const f = new FormData(e.currentTarget),
      v = applicationSchema.safeParse({
        activity: f.get("activity"),
        locality: f.get("locality"),
        production: f.get("production"),
        description: f.get("description"),
      });
    if (!v.success) {
      setError("Revisa los campos de la solicitud.");
      return;
    }
    lock.current = true;
    setSending(true);
    setError("");
    try {
      await sendProducerRequest(v.data);
      setOpen(false);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo enviar la solicitud.",
      );
    } finally {
      lock.current = false;
      setSending(false);
    }
  }
  return (
    <section className="info-panel">
      <h2>{t("Quiero ser productor")}</h2>
      {!config.producerApprovalsReady && (
        <p>
          {t(
            "Las solicitudes estarán disponibles al activar la aprobación de productores.",
          )}
        </p>
      )}
      <>
        {status === "pending" ? (
          <p role="status">{t("Tu solicitud está pendiente de aprobación")}</p>
        ) : status === "revoked" ? (
          <p role="status">
            {t(
              "Tu permiso de productor ha sido revocado. Contacta con administración.",
            )}
          </p>
        ) : status === "approved" ? (
          <p>{t("Solicitud aprobada")}</p>
        ) : (
          <>
            {status === "rejected" && (
              <p role="status">
                {t("Solicitud rechazada. Puedes enviar una nueva solicitud.")}
              </p>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => setOpen(!open)}
            >
              {t("Quiero ser productor")}
            </button>
            {open && (
              <form className="uzta-form" onSubmit={submit}>
                <fieldset disabled={sending || busy}>
                  <label>
                    {t("Nombre de la explotación o actividad")}
                    <input name="activity" required maxLength={100} />
                  </label>
                  <label>
                    {t("Localidad")}
                    <input
                      name="locality"
                      required
                      maxLength={200}
                      defaultValue={data.profile.location}
                    />
                  </label>
                  <label>
                    {t("Tipo de producción")}
                    <input name="production" required maxLength={100} />
                  </label>
                  <label>
                    {t("Breve descripción")}
                    <textarea name="description" required maxLength={2000} />
                  </label>
                  <button
                    className="primary"
                    disabled={!config.producerApprovalsReady}
                  >
                    {t("Enviar solicitud")}
                  </button>
                </fieldset>
              </form>
            )}
          </>
        )}
        <button
          type="button"
          className="text-button"
          disabled={busy || sending || !config.producerApprovalsReady}
          onClick={() => void refresh()}
        >
          {t("Comprobar estado")}
        </button>
      </>
      {error && <p role="alert">{t(error)}</p>}
    </section>
  );
}
export function ProducerRequestsAdmin() {
  useLanguage();
  const { data } = useUzta();
  const [rows, setRows] = useState<ProducerRequest[]>([]),
    [revision, setRevision] = useState(0),
    [error, setError] = useState("");
  const [pending, setPending] = useState(false),
    [selected, setSelected] = useState<ProducerRequest | null>(null),
    [action, setAction] = useState<"approved" | "rejected" | "revoked" | null>(
      null,
    ),
    [reason, setReason] = useState("");
  const lock = useRef(false);
  const allowed = data.producerAccess?.admin === true;
  useEffect(() => {
    let active = true;
    if (allowed && config.producerApprovalsReady) {
      setError("");
      void loadProducerRequests()
        .then((r) => {
          if (active) setRows(r);
        })
        .catch(() => {
          if (active) setError("No se pudieron cargar las solicitudes.");
        });
    }
    return () => {
      active = false;
    };
  }, [allowed, revision]);
  if (!allowed)
    return (
      <>
        <BackLink to="/perfil" section="cuenta" label="Volver al perfil" />
        <p role="alert">{t("Acceso reservado a administración.")}</p>
      </>
    );
  return (
    <section className="management">
      <BackLink to="/perfil" section="cuenta" label="Volver al perfil" />
      <h1>{t("Solicitudes de productores")}</h1>
      <button className="text-button" onClick={() => setRevision((v) => v + 1)}>
        {t("Actualizar")}
      </button>
      {error && <p role="alert">{t(error)}</p>}
      {!rows.length && !error && <p>{t("No hay solicitudes.")}</p>}
      {rows.map((r) => (
        <article className="info-panel" key={r.id}>
          <h2>{r.activity_name}</h2>
          <p>
            {r.applicant_name} · {r.locality} · {r.production_type}
          </p>
          <p>
            {new Intl.DateTimeFormat(currentLanguage(), {
              dateStyle: "medium",
            }).format(new Date(r.created_at))}{" "}
            ·{" "}
            {t(
              {
                pending: "Pendiente",
                approved: "Aprobado",
                rejected: "Rechazado",
                revoked: "Revocado",
              }[r.status],
            )}
          </p>
          <button
            className="text-button"
            onClick={() => {
              setSelected(r);
              setAction(null);
              setReason("");
            }}
          >
            {t("Consultar detalles")}
          </button>
        </article>
      ))}
      {selected && (
        <div className="info-panel">
          <h2>{selected.activity_name}</h2>
          <p>{selected.description}</p>
          {selected.reason && <p>{selected.reason}</p>}
          {!action ? (
            <>
              {(selected.status === "pending" ||
                selected.status === "revoked") && (
                <button onClick={() => setAction("approved")}>
                  {t("Aprobar")}
                </button>
              )}
              {selected.status === "pending" && (
                <button onClick={() => setAction("rejected")}>
                  {t("Rechazar")}
                </button>
              )}
              {selected.status === "approved" && (
                <button onClick={() => setAction("revoked")}>
                  {t("Revocar permiso")}
                </button>
              )}
            </>
          ) : (
            <>
              <p>
                {t("Confirmar cambio de permiso")}:{" "}
                {t(
                  {
                    approved: "Aprobar",
                    rejected: "Rechazar",
                    revoked: "Revocar permiso",
                  }[action],
                )}
              </p>
              <label>
                {t("Motivo (opcional)")}
                <textarea
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                disabled={pending}
                onClick={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setPending(true);
                  setError("");
                  try {
                    await reviewProducerRequest(selected.id, action, reason);
                    setSelected(null);
                    setAction(null);
                    setRevision((v) => v + 1);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No se pudo actualizar la solicitud.",
                    );
                  } finally {
                    lock.current = false;
                    setPending(false);
                  }
                }}
              >
                {t("Confirmar")}
              </button>
            </>
          )}
          <button
            disabled={pending}
            onClick={() => {
              setSelected(null);
              setAction(null);
            }}
          >
            {t("Cerrar")}
          </button>
        </div>
      )}
    </section>
  );
}
