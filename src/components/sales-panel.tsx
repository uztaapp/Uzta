import { ChartNoAxesColumn, Coins, ChevronRight } from "lucide-react";
import { EuskoAdminSummary } from "./eusko";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useUzta } from "../app-context";
import { t, useLanguage, currentLanguage } from "../lib/language";
import { euro } from "../lib/local-model";
import {
  commissionAccess,
  commissionSettings,
  commissionPage,
  commissionSummary,
  commissionAction,
  declareSale,
  saleAmounts,
  percentageBps,
  moneyCents,
  type Sale,
  type CommissionEvent,
  type CommissionSummary,
} from "../lib/commissions";
import config from "../../config/uzta-cloud.public.json";
export function SalesLinks() {
  useLanguage();
  const { mode, userId, managedFarmId } = useUzta();
  const [admin, setAdmin] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (config.commissionsReady && mode === "cloud" && userId)
      void commissionAccess()
        .then((ok) => {
          if (active) setAdmin(ok ? userId : null);
        })
        .catch(() => {
          if (active) setAdmin(null);
        });
    return () => {
      active = false;
    };
  }, [mode, userId]);
  if (mode !== "cloud" || !userId) return null;
  return (
    <>
      {managedFarmId && (
        <Link
          className="profile-row"
          to="/perfil"
          search={{ apartado: "ventas" }}
        >
          <ChartNoAxesColumn aria-hidden="true" />
          <span>{t("Mis ventas")}</span>
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
      {admin === userId && (
        <Link
          className="profile-row"
          to="/perfil"
          search={{ apartado: "comisiones" }}
        >
          <Coins aria-hidden="true" />
          <span>{t("Comisiones")}</span>
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
export function SalesPanel({ adminMode = false }: { adminMode?: boolean }) {
  const { userId } = useUzta();
  return (
    <SalesContent key={String(userId) + adminMode} adminMode={adminMode} />
  );
}
function SalesContent({ adminMode }: { adminMode: boolean }) {
  useLanguage();
  const { userId, mode } = useUzta();
  const [view, setView] = useState<{
      sales: Sale[];
      events: CommissionEvent[];
      summary: CommissionSummary[];
    } | null>(null),
    [options, setOptions] = useState<CommissionSummary[]>([]);
  const [settings, setSettings] = useState<{
    rate_bps: number;
    commercial_reviewed: boolean;
  } | null>(null);
  const [filter, setFilter] = useState({ from: "", to: "", seller: "" }),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const gen = ++generation.current;
    if (!config.commissionsReady || !userId || mode !== "cloud") return;
    setLoading(true);
    setError(false);
    setView(null);
    void (async () => {
      if (adminMode) {
        if (!(await commissionAccess())) throw Error("denied");
        const c = await commissionSettings();
        if (active) setSettings(c);
      }
      const [detail, summary] = await Promise.all([
        commissionPage(filter.from, filter.to, filter.seller, page),
        commissionSummary(filter.from, filter.to, filter.seller),
      ]);
      if (active && gen === generation.current) {
        setView({ ...detail, summary });
        setOptions((old) => [
          ...new Map(
            [...old, ...summary].map((s) => [s.seller_id, s]),
          ).values(),
        ]);
      }
    })()
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [adminMode, userId, mode, filter, page, revision]);
  if (!config.commissionsReady)
    return <p>{t("Control de comisiones pendiente de activación.")}</p>;
  if (!userId || mode !== "cloud")
    return <p>{t("Inicia sesión en UZTA para continuar.")}</p>;
  const refresh = () => setRevision((n) => n + 1);
  return (
    <section>
      <p>
        {t(
          "Recogida completada no significa pago verificado. No se realizan cobros ni facturas.",
        )}
      </p>
      <p>{t("Anular no registra una devolución del dinero cobrado.")}</p>
      {adminMode && settings && <EuskoAdminSummary key={revision} />}
      {adminMode && settings && (
        <RateForm settings={settings} saved={refresh} />
      )}
      <form
        className="uzta-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const from = String(f.get("from")),
            to = String(f.get("to"));
          if (from && to && from > to) {
            setError(true);
            return;
          }
          setPage(0);
          setFilter({ from, to, seller: String(f.get("seller") ?? "") });
        }}
      >
        <label>
          {t("Desde")}
          <input type="date" name="from" />
        </label>
        <label>
          {t("Hasta")}
          <input type="date" name="to" />
        </label>
        {adminMode && (
          <label>
            {t("Vendedor")}
            <select name="seller">
              <option value="">{t("Todos")}</option>
              {options.map((s) => (
                <option key={s.seller_id} value={s.seller_id}>
                  {s.seller_label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button disabled={loading}>{t("Aplicar filtros")}</button>
      </form>
      <button className="text-button" disabled={loading} onClick={refresh}>
        {t("Actualizar")}
      </button>
      {error && (
        <p role="alert">
          {t(
            "No se pudo completar la operación. Revisa los datos y los permisos.",
          )}
        </p>
      )}
      {loading && <p role="status">{t("Cargando operaciones…")}</p>}
      {view && (
        <>
          <h3>{t("Totales del filtro")}</h3>
          {!view.summary.length && (
            <p>{t("No hay operaciones registradas todavía.")}</p>
          )}
          {view.summary.map((s) => (
            <div className="info-panel" key={s.seller_id}>
              <strong>
                {s.seller_label} · {s.currency}
              </strong>
              <p>
                {t("Reservas completadas")}: {s.completed_count} ·{" "}
                {t("Ventas declaradas")}: {s.declared_count}
              </p>
              <p>
                {t("Importe de operaciones no anuladas")}: {euro(s.gross_cents)}
              </p>
              <p>
                {t("Comisiones calculadas")}: {euro(s.calculated_cents)}
              </p>
              <p>
                {t("Pendiente de cobro")}: {euro(s.pending_cents)}
              </p>
              <p>
                {t("Cobros registrados manualmente")}: {euro(s.collected_cents)}
              </p>
            </div>
          ))}
          {view.sales.map((s) => (
            <SaleRow
              key={s.id}
              sale={s}
              events={view.events}
              adminMode={adminMode}
              saved={refresh}
            />
          ))}
          <div className="segmented">
            <button
              disabled={loading || page === 0}
              onClick={() => setPage((n) => n - 1)}
            >
              {t("Anterior")}
            </button>
            <span>{page + 1}</span>
            <button
              disabled={loading || view.sales.length < 50}
              onClick={() => setPage((n) => n + 1)}
            >
              {t("Siguiente")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function RateForm({
  settings,
  saved,
}: {
  settings: { rate_bps: number; commercial_reviewed: boolean };
  saved: () => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const locked = useRef(false);
  return (
    <form
      className="uzta-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (locked.current) return;
        const form = e.currentTarget;
        locked.current = true;
        setPending(true);
        setError(false);
        try {
          await commissionSettings(
            percentageBps(String(new FormData(form).get("rate"))),
          );
          saved();
        } catch {
          setError(true);
        } finally {
          locked.current = false;
          setPending(false);
        }
      }}
    >
      <label>
        {t("Porcentaje general")}
        <input
          key={settings.rate_bps}
          name="rate"
          type="text"
          inputMode="decimal"
          defaultValue={String(settings.rate_bps / 100)}
          required
        />
      </label>
      <p>{t("Los cambios solo afectan a futuras recogidas completadas.")}</p>
      {!settings.commercial_reviewed && (
        <p>
          {t(
            "Tarifa superior al 0 % bloqueada hasta revisar condiciones y obligaciones en Francia y España.",
          )}
        </p>
      )}
      <button disabled={pending}>{t("Guardar tarifa")}</button>
      {error && (
        <p role="alert">
          {t(
            "No se pudo completar la operación. Revisa los datos y los permisos.",
          )}
        </p>
      )}
    </form>
  );
}
function SaleRow({
  sale: s,
  events,
  adminMode,
  saved,
}: {
  sale: Sale;
  events: CommissionEvent[];
  adminMode: boolean;
  saved: () => void;
}) {
  const totals = saleAmounts(s, events);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(false);
  const locked = useRef(false),
    retry = useRef<{ key: string; id: string } | null>(null);
  async function action(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (locked.current) return;
    const data = new FormData(e.currentTarget);
    locked.current = true;
    setPending(true);
    setError(false);
    try {
      const kind = String(data.get("kind")),
        amount = kind === "void" ? 0 : moneyCents(String(data.get("amount"))),
        reference = String(data.get("reference"));
      const key = JSON.stringify([kind, amount, reference]);
      if (retry.current?.key !== key)
        retry.current = { key, id: crypto.randomUUID() };
      await commissionAction(retry.current.id, s.id, kind, amount, reference);
      retry.current = null;
      saved();
    } catch {
      setError(true);
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <article className="info-panel">
      <Link to="/pedidos" search={{ pedido: s.order_id, vista: "productor" }}>
        {t("Reserva")} #{s.order_id.slice(0, 8)}
      </Link>
      <p>
        {new Intl.DateTimeFormat(currentLanguage(), {
          dateStyle: "medium",
        }).format(new Date(s.completed_at))}{" "}
        · {s.currency}
      </p>
      <p>
        {t("Importe de productos")}: {euro(s.gross_cents)}
      </p>
      <p>
        {t("Comisión aplicada")}: {s.rate_bps / 100} % ·{" "}
        {euro(s.commission_cents)}
      </p>
      <p>
        {t("Importe restante para el vendedor")}: {euro(totals.net)}
      </p>
      <p>
        {t("Pendiente de cobro")}: {euro(totals.pending)} ·{" "}
        {t("Cobros registrados manualmente")}: {euro(totals.collected)}
      </p>
      <p>
        {totals.voided
          ? t("Operación anulada")
          : s.declared_at
            ? t("Venta declarada por el vendedor")
            : t("Reserva completada; venta todavía no declarada")}
      </p>
      {!adminMode && !s.declared_at && !totals.voided && (
        <button
          disabled={pending}
          onClick={async () => {
            if (locked.current) return;
            locked.current = true;
            setPending(true);
            try {
              await declareSale(s.id);
              saved();
            } catch {
              setError(true);
            } finally {
              locked.current = false;
              setPending(false);
            }
          }}
        >
          {t("Declarar venta")}
        </button>
      )}
      {adminMode && !totals.voided && (
        <form className="uzta-form" onSubmit={action}>
          <label>
            {t("Acción administrativa")}
            <select name="kind">
              <option value="collect">{t("Registrar cobro")}</option>
              <option value="adjust">{t("Corrección de comisión")}</option>
              <option value="void">{t("Anular operación")}</option>
            </select>
          </label>
          <label>
            {t("Importe (EUR)")}
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={(totals.pending / 100).toFixed(2)}
            />
          </label>
          <label>
            {t("Referencia o motivo")}
            <input name="reference" maxLength={300} />
          </label>
          <button disabled={pending}>{t("Registrar acción manual")}</button>
        </form>
      )}
      {events
        .filter((e) => e.sale_id === s.id)
        .map((e) => (
          <p key={e.id}>
            {t(
              (
                {
                  collect: "Registrar cobro",
                  adjust: "Corrección de comisión",
                  void: "Anular operación",
                } as const
              )[e.kind],
            )}{" "}
            · {euro(e.amount_cents)} ·{" "}
            {new Intl.DateTimeFormat(currentLanguage(), {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(e.created_at))}{" "}
            · {e.reference}
          </p>
        ))}
      {error && (
        <p role="alert">
          {t(
            "No se pudo completar la operación. Revisa los datos y los permisos.",
          )}
        </p>
      )}
    </article>
  );
}
