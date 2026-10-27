import { t, useLanguage } from "../lib/language";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Modal, Photo, euro, useDemo } from "../design";
import {
  categories,
  lineTotal,
  localDate,
  futureSlot,
  type Product,
} from "../lib/local-model";
import { CreateStore } from "../components/create-store";
import { ProductPhotoEditor } from "../components/product-photo-editor";
import cloudConfig from "../../config/uzta-cloud.public.json";
import { publicPosition, validPosition } from "../lib/nearby";
const StoreLocationPicker = lazy(
  () => import("../components/store-location-picker"),
);
export function Gestion({ section }: { section: string }) {
  useLanguage();
  const { data, run, show, mode, busy, managedFarmId } = useDemo();
  const farm = data.farms.find((f) => f.id === managedFarmId)!;
  const [edit, setEdit] = useState<Product | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  async function saveFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let position = farm.position;
    if (mode === "demo" || cloudConfig.producerLocationsReady) {
      const lat = String(form.get("publicLatitude") ?? "").trim(),
        lng = String(form.get("publicLongitude") ?? "").trim();
      if (!lat && !lng) position = null;
      else {
        const p = { lat: Number(lat), lng: Number(lng) };
        if (!lat || !lng || !validPosition(p)) {
          setError("Coordenadas no válidas.");
          return;
        }
        position = publicPosition(p);
      }
    }
    if (
      await run({
        type: "farm",
        value: {
          ...farm,
          position,
          name: String(form.get("name")).trim(),
          location: String(form.get("location")).trim(),
          description: String(form.get("description")).trim(),
          ecological: form.get("ecological") === "on",
        },
      })
    )
      setSaved("Tienda guardada.");
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!edit || photoPending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      await run({
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
  async function addSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      await run({
        type: "farm",
        value: {
          ...farm,
          slots: [...farm.slots.filter((s) => futureSlot(s)), next],
        },
      })
    ) {
      formElement.reset();
      setError("");
      setSaved("Franja de recogida añadida.");
    }
  }
  if (!farm) return <CreateStore />;
  const ownOrders = data.orders.filter(
    (o) => o.farmId === farm.id && !o.example,
  );
  const completed = ownOrders.filter((o) => o.status === "Completado");
  return (
    <section className="management">
      <p className="subtle">
        {mode === "demo" ? t("Gestión de demostración") : t("Tu tienda")} ·{" "}
        {farm.name}
      </p>
      {saved ? (
        <p role="status" className="success">
          {saved}
        </p>
      ) : null}
      {section === "tienda" ? (
        <form className="uzta-form" onSubmit={saveFarm}>
          <fieldset disabled={busy}>
            <h2>{t("Mi tienda")}</h2>
            <label>
              {t("Nombre de la tienda")}
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={farm.name}
              />
            </label>
            <label>
              {t("Ubicación")}
              <input
                name="location"
                required
                maxLength={100}
                defaultValue={farm.location}
              />
            </label>
            <label>
              {t("Descripción")}
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={farm.description}
              />
            </label>
            {mode === "demo" || cloudConfig.producerLocationsReady ? (
              <section className="public-location-fields">
                <h3>{t("Ubicación de la tienda")}</h3>
                <Suspense
                  fallback={
                    <>
                      <p>Cargando mapa de ubicación…</p>
                      <input
                        type="hidden"
                        name="publicLatitude"
                        value={farm.position?.lat ?? ""}
                      />
                      <input
                        type="hidden"
                        name="publicLongitude"
                        value={farm.position?.lng ?? ""}
                      />
                    </>
                  }
                >
                  <StoreLocationPicker
                    key={farm.id}
                    initialPosition={farm.position}
                    disabled={busy}
                  />
                </Suspense>
              </section>
            ) : null}
            <label className="check-label">
              <input
                type="checkbox"
                name="ecological"
                defaultChecked={farm.ecological}
              />{" "}
              {t("Producción ecológica")}
            </label>
            <button className="primary">{t("Guardar tienda")}</button>
            <Link to="/productor" search={{ tienda: farm.id }}>
              {t("Ver la tienda")}
            </Link>
          </fieldset>
        </form>
      ) : null}
      {section === "productos" ? (
        <>
          <div className="section-heading">
            <h2>{t("Productos")}</h2>
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
                  crop: mode === "demo" ? [25, 328, 111, 75] : [0, 0, 0, 0],
                  featured: true,
                  active: true,
                });
              }}
            >
              {t("Añadir producto")}
            </button>
          </div>
          <div className="producer-products">
            {data.products
              .filter((p) => p.farmId === farm.id)
              .map((p) => (
                <article key={p.id}>
                  <Photo
                    src={p.photo === undefined ? p.photoUrl : p.photo}
                    crop={p.photo === null ? [0, 0, 0, 0] : p.crop}
                    label={p.name}
                  />
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {euro(p.priceCents)} / {p.unit}
                      {t("· Stock:")}
                      {p.stock}
                    </p>
                    <small>{p.active ? t("Publicado") : t("Oculto")}</small>
                  </div>
                  <button
                    className="edit-button"
                    onClick={() => {
                      setError("");
                      setEdit(p);
                    }}
                  >
                    {t("Editar")}
                  </button>
                </article>
              ))}
          </div>
        </>
      ) : null}
      {section === "horarios" ? (
        <>
          <h2>{t("Horarios y entregas")}</h2>
          <p className="subtle">
            {t(
              "Publica fechas y franjas de recogida. No se presuponen horarios ni reparto a domicilio.",
            )}
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
                    onClick={async () => {
                      if (
                        await run({
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
                    {t("Retirar")}
                  </button>
                </li>
              ))}
          </ul>
          {!farm.slots.filter((s) => futureSlot(s)).length ? (
            <p>{t("No hay franjas publicadas.")}</p>
          ) : null}
          <form className="uzta-form" onSubmit={addSlot}>
            <fieldset disabled={busy}>
              <h3>{t("Añadir franja de recogida")}</h3>
              <label>
                {t("Fecha")}
                <input type="date" name="date" min={localDate()} required />
              </label>
              <div className="form-columns">
                <label>
                  {t("Desde")}
                  <input type="time" name="start" required />
                </label>
                <label>
                  {t("Hasta")}
                  <input type="time" name="end" required />
                </label>
              </div>
              {error ? <p role="alert">{error}</p> : null}
              <button className="primary">{t("Añadir franja")}</button>
            </fieldset>
          </form>
        </>
      ) : null}
      {section === "estadisticas" ? (
        <>
          <h2>{t("Estadísticas")}</h2>
          <p className="subtle">
            {mode === "demo"
              ? t("Solo reservas locales; los ejemplos no cuentan.")
              : t("Reservas de tu tienda guardadas en UZTA.")}
          </p>
          <dl className="stats">
            <div>
              <dt>{mode === "demo" ? t("Reservas locales") : t("Reservas")}</dt>
              <dd>{ownOrders.length}</dd>
            </div>
            <div>
              <dt>{t("Pendientes")}</dt>
              <dd>{ownOrders.length - completed.length}</dd>
            </div>
            <div>
              <dt>{t("Recogidas")}</dt>
              <dd>{completed.length}</dd>
            </div>
            <div>
              <dt>{t("Importe reservado")}</dt>
              <dd>
                {euro(
                  ownOrders.reduce((sum, o) => sum + lineTotal(o.lines), 0),
                )}
              </dd>
            </div>
          </dl>
          <p>{t("No representa cobros ni facturación.")}</p>
          <Link to="/pedidos" search={{ vista: "productor" }}>
            {t("Ver pedidos recibidos")}
          </Link>
        </>
      ) : null}
      {edit ? (
        <Modal
          title={
            data.products.some((p) => p.id === edit.id)
              ? t("Editar producto")
              : t("Añadir producto")
          }
          close={() => setEdit(null)}
        >
          <form className="uzta-form" onSubmit={saveProduct}>
            <fieldset disabled={busy}>
              <label>
                {t("Nombre")}
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={edit.name}
                />
              </label>
              <div className="form-columns">
                <label>
                  {t("Precio (€)")}
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
                  {t("Unidad")}
                  <select name="unit" defaultValue={edit.unit}>
                    <option value="kg">kg</option>
                    <option value="docena">{t("docena")}</option>
                    <option value="unidad">{t("unidad")}</option>
                  </select>
                </label>
              </div>
              <label>
                {t("Existencias")}
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
                {t("Categoría")}
                <select name="category" defaultValue={edit.category}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {t(c)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={edit.active}
                />{" "}
                {t("Publicado")}
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={edit.featured}
                />{" "}
                {t("Mostrar en inicio")}
              </label>
              {mode === "demo" || cloudConfig.productPhotosReady ? (
                <ProductPhotoEditor
                  key={edit.id}
                  product={edit}
                  onPending={setPhotoPending}
                  onChange={(photo) =>
                    setEdit((current) =>
                      current ? { ...current, photo } : current,
                    )
                  }
                />
              ) : (
                <p className="subtle">
                  {t(
                    "La carga de fotografías para cuentas reales necesita activar el almacenamiento de UZTA. Puedes continuar editando el producto.",
                  )}
                </p>
              )}
              {error ? <p role="alert">{error}</p> : null}
              <button className="primary" disabled={photoPending}>
                {t("Guardar producto")}
              </button>
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
