import { useRef, useState, type FormEvent } from "react";
import { t, useLanguage } from "../lib/language";
import { useUzta } from "../app-context";
import { Modal } from "./presentation";
export function PasswordReset({ close }: { close: () => void }) {
  useLanguage();
  const { requestPasswordReset, busy } = useUzta();
  const [pending, setPending] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState(false);
  const lock = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || !requestPasswordReset) return;
    const email = String(new FormData(e.currentTarget).get("email"));
    lock.current = true;
    setPending(true);
    setError(false);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section className="access-panel">
      <h1>{t("Recuperar contraseña")}</h1>
      {sent ? (
        <p role="status">
          {t(
            "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.",
          )}
        </p>
      ) : (
        <form className="uzta-form" onSubmit={submit}>
          <label>
            {t("Correo electrónico")}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
            />
          </label>
          <button
            className="primary"
            disabled={busy || pending || !requestPasswordReset}
          >
            {t("Enviar enlace de recuperación")}
          </button>
        </form>
      )}
      {error && (
        <p role="alert">
          {t("No se pudo enviar la solicitud. Inténtalo de nuevo.")}
        </p>
      )}
      <button className="text-button" onClick={close}>
        {t("Volver al acceso")}
      </button>
    </section>
  );
}
export function PasswordRecovery({
  save,
  close,
}: {
  save: (password: string) => Promise<void>;
  close: () => void;
}) {
  useLanguage();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <Modal title={t("Cambiar contraseña")} close={close}>
      <form
        className="uzta-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current) return;
          const f = new FormData(e.currentTarget),
            password = String(f.get("password"));
          if (
            password.length < 8 ||
            password.length > 128 ||
            password !== f.get("confirm")
          ) {
            setError(
              "Las contraseñas deben coincidir y tener entre 8 y 128 caracteres.",
            );
            return;
          }
          lock.current = true;
          setPending(true);
          setError("");
          try {
            await save(password);
          } catch {
            setError(
              "No se pudo cambiar la contraseña. Solicita otro enlace si ha caducado.",
            );
          } finally {
            lock.current = false;
            setPending(false);
          }
        }}
      >
        <label>
          {t("Nueva contraseña")}
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        <label>
          {t("Repetir contraseña")}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        {error && <p role="alert">{t(error)}</p>}
        <button className="primary" disabled={pending}>
          {t("Guardar contraseña")}
        </button>
      </form>
    </Modal>
  );
}
