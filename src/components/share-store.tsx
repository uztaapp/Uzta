import { t, useLanguage } from "../lib/language";
import { useState } from "react";
import { Share2, Copy } from "lucide-react";
import { Modal } from "./presentation";
import { producerPublicUrl } from "../lib/public-links";
export function ShareStore({
  id,
  name,
  demo,
}: {
  id: string;
  name: string;
  demo: boolean;
}) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function share() {
    if (pending) return;
    setMessage("");
    if (demo) {
      setOpen(true);
      return;
    }
    const url = producerPublicUrl(id);
    setPending(true);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: name, text: `${name} · UZTA`, url });
          return;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          )
            return;
        }
      }
      setOpen(true);
    } finally {
      setPending(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(producerPublicUrl(id));
      setMessage("Enlace copiado.");
    } catch {
      setMessage(
        "No se pudo copiar. Puedes seleccionar y copiar el enlace manualmente.",
      );
    }
  }
  return (
    <>
      <button
        className="hero-share"
        aria-label={t("Compartir tienda")}
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => void share()}
      >
        <Share2 size={21} />
      </button>
      {open ? (
        <Modal title={t("Compartir tienda")} close={() => setOpen(false)}>
          <p>
            {demo
              ? t(
                  "Esta es una tienda ficticia de la demostración. No tiene un enlace público real.",
                )
              : name}
          </p>
          {!demo ? (
            <div className="uzta-form">
              <label>
                {t("Enlace público")}
                <input
                  readOnly
                  value={producerPublicUrl(id)}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button className="primary" onClick={() => void copy()}>
                <Copy size={17} />
                {t("Copiar enlace")}
              </button>
              <p className="subtle">
                {t(
                  "Solo se comparte el enlace de la tienda. No incluye tu sesión ni tus reservas.",
                )}
              </p>
            </div>
          ) : null}
          {message ? <p role="status">{message}</p> : null}
        </Modal>
      ) : null}
    </>
  );
}
