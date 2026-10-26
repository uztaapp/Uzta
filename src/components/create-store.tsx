import { useState, useRef, type FormEvent } from "react";
import { useUzta } from "../app-context";
export function CreateStore() {
  const { run, busy } = useUzta();
  const id = useRef(crypto.randomUUID());
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setError("");
    const ok = await run({
      type: "farm",
      value: {
        id: id.current,
        name: String(f.get("name")).trim(),
        location: String(f.get("location")).trim(),
        description: String(f.get("description")).trim(),
        ecological: f.get("ecological") === "on",
        distance: "",
        slots: [],
      },
    });
    if (!ok)
      setError(
        "No se pudo guardar la tienda. Revisa el aviso y vuelve a intentarlo.",
      );
  }
  return (
    <section className="management">
      <h2>Tu tienda de productor</h2>
      <p>
        Aún no tienes una tienda. Añade sus datos para publicar productos y
        franjas de recogida.
      </p>
      <form className="uzta-form" onSubmit={submit}>
        <label>
          Nombre de la tienda
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Ubicación
          <input name="location" required maxLength={100} />
        </label>
        <label>
          Descripción
          <textarea name="description" maxLength={2000} />
        </label>
        <label className="check-label">
          <input type="checkbox" name="ecological" />
          Producción ecológica
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="primary" disabled={busy}>
          Crear mi tienda
        </button>
      </form>
    </section>
  );
}
