import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Modal, Photo, euro, useDemo } from "../design";
import {
  categories,
  lineTotal,
  localDate,
  futureSlot,
  type Product,
} from "../lib/local-model";
export function Gestion({ section }: { section: string }) {
  const { data, run, show } = useDemo();
  const farm = data.farms.find((f) => f.id === "urki")!;
  const [edit, setEdit] = useState<Product | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  function saveFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      run({
        type: "farm",
        value: {
          ...farm,
          name: String(form.get("name")).trim(),
          location: String(form.get("location")).trim(),
          description: String(form.get("description")).trim(),
          ecological: form.get("ecological") === "on",
        },
      })
    )
      setSaved("Tienda guardada en este equipo.");
  }
  function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit) return;
    const form = new FormData(event.currentTarget);
    const price = Number(String(form.get("price")).replace(",", "."));
    const stock = Number(form.get("stock"));
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setError("Revisa el precio y las existencias.");
      return;
    }
    if (
      run({
        type: "product",
        value: {
          ...edit,
          name: String(form.get("name")).trim(),
          priceCents: Math.round(price * 100),
          unit: String(form.get("unit")) as Product["unit"],
          category: String(form.get("category")) as Product["category"],
          stock,
          active: form.get("active") === "on",
          featured: form.get("featured") === "on",
        },
      })
    ) {
      setEdit(null);
      setSaved("Producto guardado.");
    }
  }
  function addSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {
      id: crypto.randomUUID(),
      date: String(form.get("date")),
      start: String(form.get("start")),
      end: String(form.get("end")),
    };
    if (next.start >= next.end || !futureSlot(next)) {
      setError(
        "Selecciona una franja futura con la hora final posterior a la inicial.",
      );
      return;
    }
    if (
      farm.slots.some(
        (s) => s.date === next.date && next.start < s.end && next.end > s.start,
      )
    ) {
      setError("La franja se solapa con otra de ese día.");
      return;
    }
    if (
      run({
        type: "farm",
        value: {
          ...farm,
          slots: [...farm.slots.filter((s) => futureSlot(s)), next],
        },
      })
    ) {
      event.currentTarget.reset();
      setError("");
      setSaved("Franja de recogida añadida.");
    }
  }
  const ownOrders = data.orders.filter(
    (o) => o.farmId === farm.id && !o.example,
  );
  const completed = ownOrders.filter((o) => o.status === "Completado");
  return (
    <section className="management">
      <p className="subtle">
        Gestión local de {farm.name} · Perfil de prueba del productor
      </p>
      {saved ? (
        <p role="status" className="success">
          {saved}
        </p>
      ) : null}
      {section === "tienda" ? (
        <form className="uzta-form" onSubmit={saveFarm}>
          <h2>Mi tienda</h2>
          <label>
            Nombre de la tienda
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={farm.name}
            />
          </label>
          <label>
            Ubicación
            <input
              name="location"
              required
              maxLength={100}
              defaultValue={farm.location}
            />
          </label>
          <label>
            Descripción
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={farm.description}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              name="ecological"
              defaultChecked={farm.ecological}
            />{" "}
            Producción ecológica (dato local de ejemplo)
          </label>
          <button className="primary">Guardar tienda</button>
          <Link to="/productor" search={{ tienda: farm.id }}>
            Ver la tienda
          </Link>
        </form>
      ) : null}
      {section === "productos" ? (
        <>
          <div className="section-heading">
            <h2>Productos</h2>
            <button
              onClick={() => {
                setError("");
                setEdit({
                  id: crypto.randomUUID(),
                  farmId: farm.id,
                  name: "",
                  priceCents: 100,
                  unit: "kg",
                  stock: 0,
                  category: "Verduras",
                  crop: [25, 328, 111, 75],
                  featured: true,
                  active: true,
                });
              }}
            >
              Añadir producto
            </button>
          </div>
          <div className="producer-products">
            {data.products
              .filter((p) => p.farmId === farm.id)
              .map((p) => (
                <article key={p.id}>
                  <Photo crop={p.crop} label={p.name} />
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {euro(p.priceCents)} / {p.unit} · Stock: {p.stock}
                    </p>
                    <small>{p.active ? "Publicado" : "Oculto"}</small>
                  </div>
                  <button
                    className="edit-button"
                    onClick={() => {
                      setError("");
                      setEdit(p);
                    }}
                  >
                    Editar
                  </button>
                </article>
              ))}
          </div>
        </>
      ) : null}
      {section === "horarios" ? (
        <>
          <h2>Horarios y entregas</h2>
          <p className="subtle">
            Publica fechas y franjas de recogida. No se presuponen horarios ni
            reparto a domicilio.
          </p>
          <ul className="slot-list">
            {farm.slots
              .filter((s) => futureSlot(s))
              .map((s) => (
                <li key={s.id}>
                  <span>
                    {s.date} · {s.start} – {s.end}
                  </span>
                  <button
                    aria-label={`Retirar franja ${s.date} ${s.start}`}
                    onClick={() => {
                      if (
                        run({
                          type: "farm",
                          value: {
                            ...farm,
                            slots: farm.slots.filter(
                              (x) => x.id !== s.id && futureSlot(x),
                            ),
                          },
                        })
                      )
                        setSaved(
                          "Franja retirada. Las reservas existentes conservan su fecha.",
                        );
                    }}
                  >
                    Retirar
                  </button>
                </li>
              ))}
          </ul>
          {!farm.slots.filter((s) => futureSlot(s)).length ? (
            <p>No hay franjas publicadas.</p>
          ) : null}
          <form className="uzta-form" onSubmit={addSlot}>
            <h3>Añadir franja de recogida</h3>
            <label>
              Fecha
              <input type="date" name="date" min={localDate()} required />
            </label>
            <div className="form-columns">
              <label>
                Desde
                <input type="time" name="start" required />
              </label>
              <label>
                Hasta
                <input type="time" name="end" required />
              </label>
            </div>
            {error ? <p role="alert">{error}</p> : null}
            <button className="primary">Añadir franja</button>
          </form>
        </>
      ) : null}
      {section === "estadisticas" ? (
        <>
          <h2>Estadísticas</h2>
          <p className="subtle">
            Solo reservas creadas en este navegador; los ejemplos no cuentan.
          </p>
          <dl className="stats">
            <div>
              <dt>Reservas locales</dt>
              <dd>{ownOrders.length}</dd>
            </div>
            <div>
              <dt>Pendientes</dt>
              <dd>{ownOrders.length - completed.length}</dd>
            </div>
            <div>
              <dt>Recogidas</dt>
              <dd>{completed.length}</dd>
            </div>
            <div>
              <dt>Importe reservado</dt>
              <dd>
                {euro(
                  ownOrders.reduce((sum, o) => sum + lineTotal(o.lines), 0),
                )}
              </dd>
            </div>
          </dl>
          <p>No representa cobros ni facturación.</p>
          <Link to="/pedidos" search={{ vista: "productor" }}>
            Ver pedidos recibidos
          </Link>
        </>
      ) : null}
      {edit ? (
        <Modal
          title={
            data.products.some((p) => p.id === edit.id)
              ? "Editar producto"
              : "Añadir producto"
          }
          close={() => setEdit(null)}
        >
          <form className="uzta-form" onSubmit={saveProduct}>
            <label>
              Nombre
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={edit.name}
              />
            </label>
            <div className="form-columns">
              <label>
                Precio (€)
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  required
                  defaultValue={edit.priceCents / 100}
                />
              </label>
              <label>
                Unidad
                <select name="unit" defaultValue={edit.unit}>
                  <option value="kg">kg</option>
                  <option value="docena">docena</option>
                  <option value="unidad">unidad</option>
                </select>
              </label>
            </div>
            <label>
              Existencias
              <input
                name="stock"
                type="number"
                min="0"
                max="100000"
                step="1"
                required
                defaultValue={edit.stock}
              />
            </label>
            <label>
              Categoría
              <select name="category" defaultValue={edit.category}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                name="active"
                defaultChecked={edit.active}
              />{" "}
              Publicado
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={edit.featured}
              />{" "}
              Mostrar en inicio
            </label>
            <p className="subtle">
              Imagen de ejemplo de la maqueta; no se han añadido fotografías
              reales.
            </p>
            {error ? <p role="alert">{error}</p> : null}
            <button className="primary">Guardar producto</button>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
