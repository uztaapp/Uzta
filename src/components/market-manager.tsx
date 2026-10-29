import initialMarkets from "../data/markets-initial.json";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { useMarkets } from "./market-data";
import { useUzta } from "../app-context";
import { marketRpc, saveMarketException } from "../lib/market-api";
import {
  marketTypes,
  marketTypeLabels,
  localDay,
  marketPresence,
  addDays,
  duplicateMarkets,
  type MarketRule,
  type MarketData,
  type Market,
} from "../lib/markets";
import { categories } from "../lib/local-model";
import { t, useLanguage, currentLanguage } from "../lib/language";
import config from "../../config/uzta-cloud.public.json";
import "../pages/mercados.css";
const Location = lazy(() => import("./store-location-picker"));
type Draft = Pick<
  MarketRule,
  | "frequency"
  | "starts_on"
  | "ends_on"
  | "weekdays"
  | "ordinal"
  | "opens"
  | "closes"
>;
const draft = (): Draft => ({
  frequency: "weekly",
  starts_on: localDay(),
  ends_on: null,
  weekdays: [],
  ordinal: 1,
  opens: null,
  closes: null,
});
export function RuleEditor({
  value,
  onChange,
}: {
  value: Draft[];
  onChange: (r: Draft[]) => void;
}) {
  const change = (i: number, v: Partial<Draft>) =>
    onChange(value.map((r, n) => (i === n ? { ...r, ...v } : r)));
  return (
    <fieldset>
      <legend>{t("Fechas y horarios")}</legend>
      {value.map((r, i) => (
        <div className="market-rule" key={i}>
          <label>
            {t("Repetición")}
            <select
              value={r.frequency}
              onChange={(e) =>
                change(i, {
                  frequency: e.target.value as Draft["frequency"],
                  weekdays: [],
                })
              }
            >
              <option value="once">{t("Fecha concreta o varios días")}</option>
              <option value="weekly">{t("Semanal")}</option>
              <option value="monthly">{t("Mensual")}</option>
            </select>
          </label>
          <div className="market-inline">
            <label>
              {t("Desde")}
              <input
                type="date"
                required
                value={r.starts_on}
                onChange={(e) => change(i, { starts_on: e.target.value })}
              />
            </label>
            <label>
              {t("Hasta")}
              <input
                type="date"
                min={r.starts_on}
                value={r.ends_on ?? ""}
                onChange={(e) => change(i, { ends_on: e.target.value || null })}
              />
            </label>
          </div>
          {r.frequency !== "once" && (
            <div className="market-weekdays">
              {Array.from({ length: 7 }, (_, day) => {
                const date = new Date(Date.UTC(2026, 5, 7 + day));
                return (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={r.weekdays.includes(day)}
                      onChange={(e) =>
                        change(i, {
                          weekdays: e.target.checked
                            ? r.frequency === "monthly"
                              ? [day]
                              : [...r.weekdays, day]
                            : r.weekdays.filter((d) => d !== day),
                        })
                      }
                    />
                    {new Intl.DateTimeFormat(currentLanguage(), {
                      weekday: "short",
                      timeZone: "UTC",
                    }).format(date)}
                  </label>
                );
              })}
            </div>
          )}
          {r.frequency === "monthly" && (
            <label>
              {t("Semana del mes")}
              <select
                value={r.ordinal ?? 1}
                onChange={(e) => change(i, { ordinal: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, -1].map((n) => (
                  <option key={n} value={n}>
                    {n === -1 ? t("Última") : n}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="market-inline">
            <label>
              {t("Apertura")}
              <input
                type="time"
                value={r.opens ?? ""}
                onChange={(e) => change(i, { opens: e.target.value || null })}
              />
            </label>
            <label>
              {t("Cierre")}
              <input
                type="time"
                value={r.closes ?? ""}
                onChange={(e) => change(i, { closes: e.target.value || null })}
              />
            </label>
          </div>
          <small>
            {t("Sin horario confirmado no se habilitan recogidas.")}
          </small>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            {t("Quitar fecha")}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, draft()])}
        disabled={value.length >= 30}
      >
        {t("Añadir fecha o recurrencia")}
      </button>
    </fieldset>
  );
}
function validRules(rules: Draft[]) {
  if (
    !rules.length ||
    rules.some(
      (r) =>
        !r.starts_on ||
        (r.frequency !== "once" && !r.weekdays.length) ||
        !!r.opens !== !!r.closes ||
        (r.opens && r.closes && r.opens >= r.closes),
    )
  )
    throw Error("Revisa las fechas y los horarios.");
}
function ExceptionEditor({
  market,
  part,
  data,
  reload,
}: {
  market: string;
  part: string | null;
  data: MarketData;
  reload: () => void;
}) {
  const [day, setDay] = useState(localDay()),
    [cancelled, setCancelled] = useState(true),
    [opens, setOpens] = useState(""),
    [closes, setCloses] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveMarketException(
        {
          market_id: market,
          participation_id: part,
          day,
          cancelled,
          opens: cancelled ? null : opens || null,
          closes: cancelled ? null : closes || null,
        },
        data.exceptions.find(
          (x) =>
            x.market_id === market &&
            x.participation_id === part &&
            x.day === day,
        )?.id,
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary>{t("Excepciones y días sin asistencia")}</summary>
      <form className="uzta-form" onSubmit={submit}>
        <label>
          {t("Fecha")}
          <input
            type="date"
            required
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={cancelled}
            onChange={(e) => setCancelled(e.target.checked)}
          />
          {t("No se celebra / no asistiré")}
        </label>
        {!cancelled && (
          <>
            <label>
              {t("Apertura")}
              <input
                type="time"
                value={opens}
                onChange={(e) => setOpens(e.target.value)}
              />
            </label>
            <label>
              {t("Cierre")}
              <input
                type="time"
                value={closes}
                onChange={(e) => setCloses(e.target.value)}
              />
            </label>
          </>
        )}
        {error && <p role="alert">{t(error)}</p>}
        <button className="primary" disabled={busy || !config.marketsReady}>
          {t("Guardar excepción")}
        </button>
      </form>
      {data.exceptions
        .filter((e) => e.market_id === market && e.participation_id === part)
        .map((e) => (
          <p key={e.id}>
            {e.day} ·{" "}
            {e.cancelled
              ? t("Cancelado")
              : `${e.opens ?? ""} – ${e.closes ?? ""}`}{" "}
            <button
              onClick={() => {
                setDay(e.day);
                setCancelled(e.cancelled);
                setOpens(e.opens ?? "");
                setCloses(e.closes ?? "");
              }}
            >
              {t("Editar")}
            </button>
          </p>
        ))}
    </details>
  );
}
function MarketForm({
  market,
  data,
  reload,
  admin,
}: {
  market?: Market;
  data: MarketData;
  reload: () => void;
  admin: boolean;
}) {
  const [rules, setRules] = useState<Draft[]>(
    market
      ? data.rules.filter(
          (r) => r.market_id === market.id && !r.participation_id,
        )
      : [draft()],
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      validRules(rules);
      const values = {
        name: String(f.get("name")),
        kind: String(f.get("kind")),
        description: String(f.get("description")),
        locality: String(f.get("locality")),
        address: String(f.get("address")),
        region: String(f.get("region")),
        timezone:
          f.get("region") === "Iparralde" ? "Europe/Paris" : "Europe/Madrid",
        latitude: f.get("publicLatitude")
          ? Number(f.get("publicLatitude"))
          : null,
        longitude: f.get("publicLongitude")
          ? Number(f.get("publicLongitude"))
          : null,
        source_url: String(f.get("source_url")),
        source_key: String(f.get("source_key")),
        source_license: String(f.get("source_license")),
        status: admin ? String(f.get("status")) : "pending",
        categories: f.getAll("category").map(String),
      };
      if (
        data.markets.some(
          (m) =>
            m.id !== market?.id &&
            duplicateMarkets(
              { ...values, source_key: values.source_key || null },
              m,
            ),
        )
      )
        throw Error("Posible mercado duplicado. Revisa los existentes.");
      await marketRpc("uzta_save_market", {
        p_id: market?.id ?? null,
        p_data: values,
        p_rules: rules,
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="uzta-form" onSubmit={submit}>
      <label>
        {t("Nombre")}
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={market?.name}
        />
      </label>
      <label>
        {t("Tipo")}
        <select name="kind" defaultValue={market?.kind ?? "producers"}>
          {marketTypes.map((k) => (
            <option value={k} key={k}>
              {t(marketTypeLabels[k])}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Localidad")}
        <input
          name="locality"
          required
          maxLength={100}
          defaultValue={market?.locality}
        />
      </label>
      <label>
        {t("Dirección")}
        <input name="address" maxLength={250} defaultValue={market?.address} />
      </label>
      <label>
        {t("Territorio")}
        <select name="region" defaultValue={market?.region ?? "Iparralde"}>
          {["Iparralde", "Gipuzkoa", "Bizkaia", "Araba", "Navarra"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        {t("Descripción")}
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={market?.description}
        />
      </label>
      <fieldset>
        <legend>{t("Categorías")}</legend>
        <div className="market-weekdays">
          {[...categories, "Artesanía"].map((c) => (
            <label key={c}>
              <input
                type="checkbox"
                name="category"
                value={c}
                defaultChecked={market?.categories.includes(c)}
              />
              {t(c)}
            </label>
          ))}
        </div>
      </fieldset>
      <Suspense fallback={<p>{t("Cargando mapa…")}</p>}>
        <Location
          context="market"
          initialPosition={
            market?.latitude != null && market.longitude != null
              ? { lat: market.latitude, lng: market.longitude }
              : null
          }
        />
      </Suspense>
      <label>
        {t("Fuente de información")}
        <input
          name="source_url"
          type="url"
          pattern="https://.*"
          defaultValue={market?.source_url ?? ""}
          required={admin}
        />
      </label>
      <label>
        {t("Identificador de origen")}
        <input name="source_key" defaultValue={market?.source_key ?? ""} />
      </label>
      <label>
        {t("Licencia o permiso de reutilización")}
        <input
          name="source_license"
          defaultValue={market?.source_license ?? ""}
          required={admin}
        />
      </label>
      {admin && (
        <label>
          {t("Estado")}
          <select name="status" defaultValue={market?.status ?? "pending"}>
            <option value="pending">{t("Pendiente")}</option>
            <option value="published">{t("Publicado y verificado")}</option>
            <option value="inactive">{t("Inactivo")}</option>
          </select>
        </label>
      )}
      <RuleEditor value={rules} onChange={setRules} />
      {error && <p role="alert">{t(error)}</p>}
      <button className="primary" disabled={busy || !config.marketsReady}>
        {t(admin ? "Guardar mercado" : "Enviar propuesta")}
      </button>
    </form>
  );
}
function ParticipationEditor({
  market,
  data,
  reload,
}: {
  market: Market;
  data: MarketData;
  reload: () => void;
}) {
  const { managedFarmId } = useUzta();
  const existing = data.participants.find(
    (p) => p.market_id === market.id && p.producer_id === managedFarmId,
  );
  const initial = data.rules.filter(
    (r) =>
      r.market_id === market.id &&
      r.participation_id === (existing?.id ?? null),
  );
  const [rules, setRules] = useState<Draft[]>(
    initial.length ? initial : [draft()],
  );
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      validRules(rules);
      if (f.get("own") !== "on")
        throw Error("Solo se admite producción propia, sin reventa.");
      await marketRpc("uzta_save_market_participation", {
        p_market: market.id,
        p_producer: managedFarmId,
        p_active: f.get("active") === "on",
        p_pickup: f.get("pickup") === "on",
        p_cutoff: Number(f.get("cutoff")),
        p_kind: String(f.get("kind")),
        p_rules: rules,
      });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h3>{market.name}</h3>
      <p>
        {market.address} · {market.locality}
      </p>
      <form className="uzta-form" onSubmit={submit}>
        <label>
          {t("Actividad")}
          <select
            name="kind"
            defaultValue={existing?.production_kind ?? "farm"}
          >
            <option value="farm">{t("Productor")}</option>
            <option value="artisan">{t("Artesano")}</option>
          </select>
        </label>
        <label>
          <input type="checkbox" name="own" required />
          {t("Solo se admite producción propia, sin reventa.")}
        </label>
        <label>
          <input
            type="checkbox"
            name="active"
            defaultChecked={existing?.active ?? true}
          />
          {t("Participación activa")}
        </label>
        <label>
          <input
            type="checkbox"
            name="pickup"
            defaultChecked={existing?.pickup_enabled ?? false}
          />
          {t("Permitir recogidas en mi puesto")}
        </label>
        <label>
          {t("Cierre de reservas: minutos antes")}
          <input
            type="number"
            name="cutoff"
            min={0}
            max={10080}
            required
            defaultValue={existing?.cutoff_minutes ?? 60}
          />
        </label>
        <RuleEditor value={rules} onChange={setRules} />
        {error && <p role="alert">{t(error)}</p>}
        <button className="primary" disabled={busy || !config.marketsReady}>
          {t("Guardar participación")}
        </button>
      </form>
      {existing && (
        <ExceptionEditor
          market={market.id}
          part={existing.id}
          data={data}
          reload={reload}
        />
      )}
      <p>
        {t(
          "Cambiar la asistencia no cancela reservas existentes. Revisa los pedidos y avisa a los compradores.",
        )}
      </p>
    </>
  );
}
export function MarketManager({ admin = false }: { admin?: boolean }) {
  useLanguage();
  const state = useMarkets();
  const { data, managedFarmId } = useUzta();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const allowed = admin ? data.producerAccess?.admin : !!managedFarmId;
  if (!data.sessionActive || !allowed)
    return <p>{t("No tienes permiso para gestionar mercados.")}</p>;
  const market = state.data.markets.find((m) => m.id === selected);
  const matches = state.data.markets.filter(
    (m) =>
      (admin || m.status === "published") &&
      (m.name + " " + m.locality).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="markets-page market-manager">
      <h2>{t(admin ? "Administrar mercados" : "Mis mercados")}</h2>
      {!config.marketsReady && (
        <p className="market-notice">
          {t("Mercados pendiente de activación. No se han guardado cambios.")}
        </p>
      )}
      {state.error && (
        <p role="alert">
          {t(state.error)}{" "}
          <button onClick={state.reload}>{t("Reintentar")}</button>
        </p>
      )}
      {state.loading && <p role="status">{t("Cargando mercados…")}</p>}
      <label>
        {t("Buscar mercado por nombre o localidad")}
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <label>
        {t("Selecciona un mercado")}
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">{t("Selecciona un mercado")}</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.locality}{" "}
              {m.status !== "published" ? t("Pendiente") : ""}
            </option>
          ))}
        </select>
      </label>
      {market &&
        (admin ? (
          <>
            <MarketForm
              key={market.id}
              market={market}
              data={state.data}
              reload={state.reload}
              admin
            />
            <ExceptionEditor
              market={market.id}
              part={null}
              data={state.data}
              reload={state.reload}
            />
            <h3>{t("Participaciones")}</h3>
            {state.data.participants
              .filter((p) => p.market_id === market.id)
              .map((p) => (
                <div className="market-card" key={p.id}>
                  <span>
                    {data.farms.find((f) => f.id === p.producer_id)?.name ??
                      t("Vendedor")}{" "}
                    · {t(p.active ? "Activo" : "Inactivo")}
                  </span>
                  <button
                    disabled={!config.marketsReady}
                    onClick={async () => {
                      setNotice("");
                      try {
                        const { cloudClient } =
                          await import("../lib/cloud-client");
                        const r = await cloudClient()
                          .from("uzta_market_participations")
                          .update({ active: !p.active })
                          .eq("id", p.id);
                        if (r.error) throw r.error;
                        state.reload();
                      } catch {
                        setNotice(
                          "No se pudo guardar. Revisa los datos y tus permisos.",
                        );
                      }
                    }}
                  >
                    {t(p.active ? "Desactivar" : "Activar")}
                  </button>
                </div>
              ))}
          </>
        ) : (
          <ParticipationEditor
            key={market.id}
            market={market}
            data={state.data}
            reload={state.reload}
          />
        ))}
      {!admin && (
        <>
          <h3>{t("Mis próximos mercados")}</h3>
          {state.data.participants
            .filter((p) => p.producer_id === managedFarmId)
            .flatMap((p) =>
              marketPresence(
                state.data,
                p,
                localDay(),
                addDays(localDay(), 60),
              ),
            )
            .slice(0, 20)
            .map((o) => (
              <button
                className="market-card"
                key={o.key}
                onClick={() => setSelected(o.market.id)}
              >
                {o.market.name} · {o.day} ·{" "}
                {o.opens ?? t("Horario pendiente de confirmar")}
              </button>
            ))}
        </>
      )}
      {admin && (
        <details>
          <summary>{t("Importación del catálogo verificado")}</summary>
          <p>
            {t(
              "Se importan como propuestas. No se sobrescriben mercados existentes ni se publican automáticamente.",
            )}
          </p>
          {initialMarkets
            .filter((m) => m.review_status === "verified")
            .map((m) => (
              <p key={m.data.source_key}>
                <a href={m.data.source_url} target="_blank" rel="noreferrer">
                  {m.data.name} · {m.data.locality}
                </a>
              </p>
            ))}
          <small>
            {t("Coordenadas OSM: © OpenStreetMap contributors · ODbL 1.0")}
          </small>
          <button
            disabled={!config.marketsReady}
            onClick={async () => {
              try {
                for (const m of initialMarkets) {
                  if (m.review_status !== "verified") continue;
                  if (
                    state.data.markets.some(
                      (x) => x.source_key === m.data.source_key,
                    )
                  )
                    continue;
                  await marketRpc("uzta_save_market", {
                    p_id: null,
                    p_data: m.data,
                    p_rules: m.rules,
                  });
                }
                state.reload();
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            {t("Importar catálogo como propuestas")}
          </button>
        </details>
      )}
      {notice && <p role="alert">{t(notice)}</p>}
      <details>
        <summary>
          {t(admin ? "Crear mercado" : "Proponer un mercado nuevo")}
        </summary>
        <MarketForm
          key={"new" + state.data.markets.length}
          data={state.data}
          reload={state.reload}
          admin={admin}
        />
      </details>
    </div>
  );
}
