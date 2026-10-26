import { useState, type FormEvent } from "react";
import { useUzta } from "../app-context";
export function Access() {
  const { signIn, signUp, switchMode, busy } = useUzta();
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
      <h1>{register ? "Crear cuenta en UZTA" : "Entrar en UZTA"}</h1>
      <p>Accede a tu perfil, guarda tus reservas y gestiona tu tienda.</p>
      <form className="uzta-form" onSubmit={submit}>
        {register ? (
          <label>
            Nombre
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
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
          />
        </label>
        <label>
          Contraseña
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
          {pending ? "Espera…" : register ? "Crear cuenta" : "Iniciar sesión"}
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
        {register ? "Ya tengo cuenta" : "Crear una cuenta"}
      </button>
      <hr />
      <button
        className="text-button"
        disabled={pending}
        onClick={() => switchMode("demo")}
      >
        Ver demostración
      </button>
      <p className="subtle">
        La demostración utiliza ejemplos y no envía reservas.
      </p>
    </section>
  );
}
