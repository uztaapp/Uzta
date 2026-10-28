import { PrivacyLink } from "../pages/privacidad";
import { GoogleAccess } from "./google-access";
import { t, useLanguage } from "../lib/language";
import { useState, type FormEvent } from "react";
import { useUzta } from "../app-context";
import { LanguageSelector } from "./language-selector";
export function Access() {
  useLanguage();
  const { signIn, signUp, busy } = useUzta();
  const [register, setRegister] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (register)
        setMessage(await signUp(String(form.get("name")), email, password));
      else await signIn(email, password);
      formElement.querySelector<HTMLInputElement>(
        'input[name="password"]',
      )!.value = "";
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo acceder a tu cuenta.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="access-panel">
      <h1>{register ? t("Crear cuenta en UZTA") : t("Entrar en UZTA")}</h1>
      <details className="language-access">
        <summary>{t("Idioma")}</summary>
        <LanguageSelector />
      </details>
      <p>
        {t("Accede a tu perfil, guarda tus reservas y gestiona tu tienda.")}
      </p>
      <PrivacyLink />
      <GoogleAccess disabled={busy || pending} />
      <form className="uzta-form" onSubmit={submit}>
        {register ? (
          <label>
            {t("Nombre")}
            <input
              name="name"
              autoComplete="name"
              required
              minLength={1}
              maxLength={100}
            />
          </label>
        ) : null}
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
        <label>
          {t("Contraseña")}
          <input
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 6 : undefined}
            maxLength={128}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        {message ? (
          <p role="status" className="success">
            {message}
          </p>
        ) : null}
        <button className="primary" disabled={pending || busy}>
          {pending
            ? t("Espera…")
            : register
              ? t("Crear cuenta")
              : t("Iniciar sesión")}
        </button>
      </form>
      <button
        className="text-button"
        disabled={pending}
        onClick={() => {
          setRegister(!register);
          setError("");
          setMessage("");
        }}
      >
        {register ? t("Ya tengo cuenta") : t("Crear una cuenta")}
      </button>
    </section>
  );
}
