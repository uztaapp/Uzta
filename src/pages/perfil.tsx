import { SheetIcon } from "../components/sheet-icon";
import { Brand } from "../components/brand";
import { SalesLinks, SalesPanel } from "../components/sales-panel";
import { MyFavorites } from "../components/favorites";
import "./perfil.css";
import { t, useLanguage } from "../lib/language";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Settings,
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
          <Link to="/perfil" aria-label="Volver al perfil">
            <ArrowLeft />
          </Link>
          <h1>{t(labels[search.apartado])}</h1>
        </div>
        <Gestion key={search.apartado} section={search.apartado} />
      </>
    );
  return (
    <div className="uzta-profile">
      <Brand variant="footer" decorative />
      <div className="page-title">
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
          <SheetIcon name="location" />
          <span>
            <small>{t("Dirección de entrega / ubicación")}</small>
            {data.profile.location}
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
        <SheetIcon name="heart" />
        <span>{t("Mis favoritos")}</span>
        <ChevronRight />
      </Link>
      <SalesLinks />
      <h2 className="producer-heading">{t("Para productores")}</h2>
      <div className="producer-menu">
        {[
          ["Mi tienda", "tienda", Store],
          ["Productos", "productos", Store],
          ["Pedidos recibidos", "pedidos", FileText],
          ["Horarios y entregas", "horarios", Store],
          ["Estadísticas", "estadisticas", ChartNoAxesColumn],
        ]
          .filter(
            ([, section]) =>
              mode === "demo" || managedFarmId || section === "tienda",
          )
          .map(([label, section, Icon]) => {
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
                {section === "tienda" ? (
                  <SheetIcon name="store" />
                ) : section === "productos" ? (
                  <SheetIcon name="basket" />
                ) : section === "pedidos" || section === "horarios" ? (
                  <SheetIcon name="calendar" />
                ) : (
                  <Symbol />
                )}
                <span>{t(label as string)}</span>
                <ChevronRight />
              </button>
            );
          })}
      </div>
      <div className="profile-bottom">
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
                  required
                  maxLength={200}
                  defaultValue={data.profile.location}
                />
              </label>
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
