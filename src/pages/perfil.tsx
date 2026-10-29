import { BackLink } from "../components/back-link";
import {
  ProducerApplication,
  ProducerRequestsAdmin,
} from "../components/producer-application";
import { CreateStore } from "../components/create-store";
import { canManageProducer } from "../lib/producer-approval";
import { ProducerDashboard } from "../components/producer-dashboard";
import { privacyCopy } from "../lib/privacy-copy";
import {
  useBuyerLocation,
  locateBuyer,
  selectBuyerLocality,
  nearbyLocality,
  localityMatches,
} from "../lib/buyer-location";
import { SalesLinks, SalesPanel } from "../components/sales-panel";
import { MyFavorites } from "../components/favorites";
import "./perfil.css";
import { t, useLanguage } from "../lib/language";
import { useState, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ShieldCheck,
  Settings,
  MapPin,
  Heart,
  Package,
  CalendarDays,
  Globe,
  Store,
  FileText,
  ChartNoAxesColumn,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Photo, Modal, useDemo } from "../design";
import { profileSchema } from "../lib/local-model";
import { Gestion } from "./gestion";
import { Access } from "../components/access";
import { UsageGuide } from "../components/usage-guide";
import { LanguageSelector } from "../components/language-selector";
import { languages, currentLanguage } from "../lib/language";
export function Perfil() {
  useLanguage();
  const { data, run, show, mode, busy, signOut, managedFarmId } = useDemo();
  const buyerLocation = useBuyerLocation(
    data.sessionActive && !busy && !data.profile.location,
  );
  const detectedTown = nearbyLocality(buyerLocation.point, data.farms);
  const profileLocationInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { apartado?: string };
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const labels: Record<string, string> = {
    tienda: "Mi tienda",
    productos: "Productos",
    horarios: "Horarios y entregas",
    estadisticas: "Estadísticas",
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
    if (await run({ type: "profile", value: result.data })) {
      const place = data.farms.find(
        (f) =>
          f.catalogVisible !== false &&
          localityMatches(f.location, result.data.location) &&
          localityMatches(result.data.location, f.location),
      );
      selectBuyerLocality(result.data.location, place?.position);
      setEditing(false);
      setError("");
    }
  }
  if (mode === "cloud" && !data.sessionActive) return <Access />;
  if (!data.sessionActive)
    return (
      <div className="info-panel">
        <h1>{t("Mi perfil")}</h1>
        <p>
          {t(
            "El perfil local está cerrado. Los datos siguen guardados en este navegador.",
          )}
        </p>
        <p>
          {t(
            "No hay autenticación ni cuentas compartidas con otros servicios.",
          )}
        </p>
        <button
          className="primary"
          onClick={() => run({ type: "session", active: true })}
        >
          {t("Abrir perfil local")}
        </button>
      </div>
    );
  const producerAllowed =
    mode === "demo" ? !!managedFarmId : canManageProducer(data, managedFarmId);
  if (search.apartado === "solicitudes") return <ProducerRequestsAdmin />;
  if (
    [
      "panel",
      "nuevo",
      "productos",
      "tienda",
      "horarios",
      "estadisticas",
      "ventas",
    ].includes(search.apartado ?? "") &&
    !producerAllowed
  )
    return (
      <>
        <BackLink to="/perfil" section="cuenta" label="Volver al perfil" />
        <ProducerApplication />
      </>
    );
  if (producerAllowed && !managedFarmId && search.apartado !== "cuenta")
    return <CreateStore />;
  if (
    producerAllowed &&
    managedFarmId &&
    (!search.apartado ||
      [
        "panel",
        "nuevo",
        "productos",
        "tienda",
        "horarios",
        "estadisticas",
      ].includes(search.apartado))
  )
    return <ProducerDashboard section={search.apartado ?? "panel"} />;
  if (search.apartado === "ventas" || search.apartado === "comisiones")
    return (
      <div className="uzta-profile">
        <div className="page-title">
          <Link to="/perfil" aria-label={t("Volver al perfil")}>
            <ArrowLeft />
          </Link>
          <h1>
            {t(search.apartado === "ventas" ? "Mis ventas" : "Comisiones")}
          </h1>
        </div>
        <SalesPanel adminMode={search.apartado === "comisiones"} />
      </div>
    );
  if (search.apartado === "favoritos")
    return (
      <div className="uzta-profile">
        <div className="page-title">
          <Link to="/perfil" aria-label={t("Volver al perfil")}>
            <ArrowLeft />
          </Link>
          <h1>{t("Mis favoritos")}</h1>
        </div>
        <MyFavorites />
      </div>
    );
  if (search.apartado && labels[search.apartado])
    return (
      <>
        <div className="page-title">
          <Link to="/perfil" aria-label={t("Volver al perfil")}>
            <ArrowLeft />
          </Link>
          <h1>{t(labels[search.apartado])}</h1>
        </div>
        <Gestion key={search.apartado} section={search.apartado} />
      </>
    );
  return (
    <div className="uzta-profile">
      <div className="page-title">
        <BackLink compact />
        <h1>{t("Mi perfil")}</h1>
        <button
          className="profile-settings"
          aria-label={t("Editar perfil")}
          onClick={() => setEditing(true)}
        >
          <Settings />
        </button>
      </div>
      <section className="profile-card">
        <div className="profile-person">
          <Photo
            className="avatar"
            src={data.farms.find((f) => f.id === managedFarmId)?.avatarUrl}
            crop={mode === "demo" ? [1294, 123, 57, 60] : [0, 0, 0, 0]}
            label={
              mode === "demo"
                ? "Avatar de demostración"
                : `Avatar de ${data.profile.name}`
            }
          />
          <div>
            <h2>{data.profile.name}</h2>
            <p>{data.profile.email}</p>
            <button onClick={() => setEditing(true)}>
              {t("Editar perfil ›")}
            </button>
          </div>
        </div>
        <button className="profile-row" onClick={() => setEditing(true)}>
          <MapPin aria-hidden="true" />
          <span>
            <small>{t("Dirección de entrega / ubicación")}</small>
            {buyerLocation.locality ||
              data.profile.location ||
              (detectedTown
                ? `${t("Cerca de")} ${detectedTown}`
                : t("Sin localidad configurada"))}
          </span>
          <ChevronRight />
        </button>
        <button className="profile-row" onClick={() => setLanguageOpen(true)}>
          <Globe />
          <span>
            <small>{t("Idioma")}</small>
            {languages.find((l) => l.code === currentLanguage())?.name}
          </span>
          <ChevronRight />
        </button>
      </section>
      <Link
        className="profile-row"
        to="/perfil"
        search={{ apartado: "favoritos" }}
      >
        <Heart aria-hidden="true" />
        <span>{t("Mis favoritos")}</span>
        <ChevronRight />
      </Link>
      <SalesLinks />
      {!producerAllowed && <ProducerApplication />}
      {data.producerAccess?.admin && (
        <Link
          className="profile-row"
          to="/perfil"
          search={{ apartado: "solicitudes" }}
        >
          {t("Solicitudes de productores")}
        </Link>
      )}
      <div className="profile-bottom">
        <Link className="profile-row" to="/privacidad">
          <ShieldCheck aria-hidden="true" />
          <span>{privacyCopy[currentLanguage()].title}</span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <button className="profile-row" onClick={() => setGuideOpen(true)}>
          <HelpCircle />
          <span>{t("Ayuda y soporte")}</span>
          <ChevronRight />
        </button>
        <button
          className="profile-row"
          onClick={() =>
            show(
              "UZTA no procesa pagos. Las condiciones de venta y uso comercial están pendientes de aprobación. No introduzcas datos sensibles mientras se verifica el servicio.",
            )
          }
        >
          <FileText />
          <span>{t("Condiciones de uso")}</span>
          <ChevronRight />
        </button>
        <button className="profile-row" onClick={() => void signOut()}>
          <LogOut />
          <span>
            {mode === "cloud" ? t("Cerrar sesión") : t("Cerrar sesión local")}
          </span>
          <ChevronRight />
        </button>
      </div>
      {languageOpen ? (
        <Modal title={t("Idioma")} close={() => setLanguageOpen(false)}>
          <LanguageSelector />
        </Modal>
      ) : null}
      {guideOpen ? (
        <Modal title={t("Cómo usar UZTA")} close={() => setGuideOpen(false)}>
          <UsageGuide
            demo={mode === "demo"}
            close={() => setGuideOpen(false)}
          />
        </Modal>
      ) : null}
      {editing ? (
        <Modal
          title={
            mode === "cloud" ? t("Editar perfil") : t("Editar perfil local")
          }
          close={() => setEditing(false)}
        >
          <form className="uzta-form" onSubmit={save}>
            <fieldset disabled={busy}>
              <label>
                {t("Nombre")}
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={data.profile.name}
                />
              </label>
              <label>
                {t("Correo electrónico")}
                <input
                  readOnly={mode === "cloud"}
                  type="email"
                  name="email"
                  required
                  maxLength={200}
                  defaultValue={data.profile.email}
                />
              </label>
              <label>
                {t("Ubicación")}
                <input
                  name="location"
                  ref={profileLocationInput}
                  required
                  maxLength={200}
                  defaultValue={buyerLocation.locality || data.profile.location}
                />
              </label>
              <button
                type="button"
                className="text-button"
                disabled={buyerLocation.status === "pending"}
                onClick={() => void locateBuyer()}
              >
                {t("Usar mi ubicación")}
              </button>
              {detectedTown && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    if (profileLocationInput.current)
                      profileLocationInput.current.value = detectedTown;
                  }}
                >
                  {t("Usar localidad detectada")}: {detectedTown}
                </button>
              )}
              <p className="subtle">
                {t(
                  "La localidad del comprador no modifica la ubicación pública de tu tienda.",
                )}
              </p>
              <p className="subtle">
                {mode === "cloud"
                  ? t(
                      "Tu nombre y ubicación se guardan en tu cuenta de UZTA. El correo se gestiona desde el acceso a tu cuenta.",
                    )
                  : t("Se guarda solo en este navegador. Usa datos de prueba.")}
              </p>
              {error ? <p role="alert">{error}</p> : null}
              <button className="primary">{t("Guardar perfil")}</button>
            </fieldset>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
