import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Settings,
  MapPin,
  Globe,
  Store,
  Package,
  FileText,
  Truck,
  ChartNoAxesColumn,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Photo, Modal, useDemo } from "../design";
import { profileSchema } from "../lib/local-model";
import { Gestion } from "./gestion";
export function Perfil() {
  const { data, run, show } = useDemo();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { apartado?: string };
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const labels: Record<string, string> = {
    tienda: "Mi tienda",
    productos: "Productos",
    horarios: "Horarios y entregas",
    estadisticas: "Estadísticas",
  };
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = profileSchema.safeParse({
      ...data.profile,
      name: form.get("name"),
      email: form.get("email"),
      location: form.get("location"),
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    if (run({ type: "profile", value: result.data })) {
      setEditing(false);
      setError("");
    }
  }
  if (!data.sessionActive)
    return (
      <div className="info-panel">
        <h1>Mi perfil</h1>
        <p>
          El perfil local está cerrado. Los datos siguen guardados en este
          navegador.
        </p>
        <p>No hay autenticación ni cuentas compartidas con otros servicios.</p>
        <button
          className="primary"
          onClick={() => run({ type: "session", active: true })}
        >
          Abrir perfil local
        </button>
      </div>
    );
  if (search.apartado && labels[search.apartado])
    return (
      <>
        <div className="page-title">
          <Link to="/perfil" aria-label="Volver al perfil">
            <ArrowLeft />
          </Link>
          <h1>{labels[search.apartado]}</h1>
        </div>
        <Gestion key={search.apartado} section={search.apartado} />
      </>
    );
  return (
    <>
      <div className="page-title">
        <h1>Mi perfil</h1>
        <button
          className="profile-settings"
          aria-label="Editar perfil"
          onClick={() => setEditing(true)}
        >
          <Settings />
        </button>
      </div>
      <section className="profile-card">
        <div className="profile-person">
          <Photo
            className="avatar"
            crop={[1294, 123, 57, 60]}
            label="Avatar de ejemplo"
          />
          <div>
            <h2>{data.profile.name}</h2>
            <p>{data.profile.email}</p>
            <button onClick={() => setEditing(true)}>Editar perfil ›</button>
          </div>
        </div>
        <button className="profile-row" onClick={() => setEditing(true)}>
          <MapPin />
          <span>
            <small>Dirección de entrega / ubicación</small>
            {data.profile.location}
          </span>
          <ChevronRight />
        </button>
        <button
          className="profile-row"
          onClick={() =>
            show(
              "Idioma actual: Español. Los demás idiomas necesitan traducciones revisadas antes de activarse.",
            )
          }
        >
          <Globe />
          <span>
            <small>Idioma</small>
            {data.profile.language}
          </span>
          <ChevronRight />
        </button>
      </section>
      <h2 className="producer-heading">Para productores</h2>
      <div className="producer-menu">
        {[
          ["Mi tienda", "tienda", Store],
          ["Productos", "productos", Package],
          ["Pedidos recibidos", "pedidos", FileText],
          ["Horarios y entregas", "horarios", Truck],
          ["Estadísticas", "estadisticas", ChartNoAxesColumn],
        ].map(([label, section, Icon]) => {
          const Symbol = Icon as typeof Store;
          return (
            <button
              className="profile-row"
              key={label as string}
              onClick={() =>
                section === "pedidos"
                  ? void navigate({
                      to: "/pedidos",
                      search: { vista: "productor" },
                    })
                  : void navigate({
                      to: "/perfil",
                      search: { apartado: section as string },
                    })
              }
            >
              <Symbol />
              <span>{label as string}</span>
              <ChevronRight />
            </button>
          );
        })}
      </div>
      <div className="profile-bottom">
        <button
          className="profile-row"
          onClick={() =>
            show(
              "Los cambios se guardan en este navegador. Para probar una reserva: configura tu tienda y sus franjas de recogida, añade productos a la cesta, elige una fecha y guarda la reserva. Puedes consultarla en Pedidos.",
            )
          }
        >
          <HelpCircle />
          <span>Ayuda y soporte</span>
          <ChevronRight />
        </button>
        <button
          className="profile-row"
          onClick={() =>
            show(
              "Este entorno sirve para desarrollo local y no presta un servicio comercial. No efectúa pagos ni envía reservas. Las condiciones de uso públicas y los textos legales deben definirse antes de publicar UZTA.",
            )
          }
        >
          <FileText />
          <span>Condiciones de uso</span>
          <ChevronRight />
        </button>
        <button
          className="profile-row"
          onClick={() => run({ type: "session", active: false })}
        >
          <LogOut />
          <span>Cerrar sesión local</span>
          <ChevronRight />
        </button>
      </div>
      {editing ? (
        <Modal title="Editar perfil local" close={() => setEditing(false)}>
          <form className="uzta-form" onSubmit={save}>
            <label>
              Nombre
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={data.profile.name}
              />
            </label>
            <label>
              Correo electrónico
              <input
                type="email"
                name="email"
                required
                maxLength={200}
                defaultValue={data.profile.email}
              />
            </label>
            <label>
              Ubicación
              <input
                name="location"
                required
                maxLength={200}
                defaultValue={data.profile.location}
              />
            </label>
            <p className="subtle">
              Se guarda solo en este navegador. Usa datos de prueba.
            </p>
            {error ? <p role="alert">{error}</p> : null}
            <button className="primary">Guardar perfil</button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
