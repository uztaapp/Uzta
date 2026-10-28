import { useRef, useState } from "react";
import { t, useLanguage } from "../lib/language";
import { signInGoogle } from "../lib/google-auth";
import config from "../../config/uzta-cloud.public.json";
export function GoogleAccess({
  enabled = config.googleReady,
  disabled = false,
}: {
  enabled?: boolean;
  disabled?: boolean;
}) {
  useLanguage();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const lock = useRef(false);
  return (
    <div>
      <button
        className="primary"
        type="button"
        disabled={!enabled || disabled || pending}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setPending(true);
          setError(false);
          try {
            await signInGoogle(enabled);
          } catch {
            setError(true);
          } finally {
            lock.current = false;
            setPending(false);
          }
        }}
      >
        {t("Continuar con Google")}
      </button>
      {!enabled && (
        <p className="subtle">
          {t("Acceso con Google pendiente de configuración.")}
        </p>
      )}
      {error && (
        <p role="alert">
          {t("No se pudo iniciar el acceso con Google. Inténtalo de nuevo.")}
        </p>
      )}
    </div>
  );
}
