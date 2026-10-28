import { useEffect, useRef, useState } from "react";
import { useUzta } from "../app-context";
import { t, useLanguage, currentLanguage } from "../lib/language";
import {
  ownReview,
  submitReview,
  reviewSummaries,
  reviewComments,
  type ReviewSummary,
  type ReviewComment,
} from "../lib/reviews";
import config from "../../config/uzta-cloud.public.json";
import "./seller-reviews.css";
export function useReviewSummaries(
  ids: string[],
  enabled = config.reviewsReady,
) {
  const { mode } = useUzta();
  const key = JSON.stringify([...new Set(ids)].sort());
  const [state, setState] = useState<{
    key: string;
    rows: ReviewSummary[];
    error: boolean;
    loading: boolean;
  }>({ key: "", rows: [], error: false, loading: false });
  useEffect(() => {
    let active = true;
    if (!enabled || mode !== "cloud") return;
    setState({ key, rows: [], error: false, loading: true });
    void reviewSummaries(JSON.parse(key))
      .then((rows) => {
        if (active) setState({ key, rows, error: false, loading: false });
      })
      .catch(() => {
        if (active) setState({ key, rows: [], error: true, loading: false });
      });
    return () => {
      active = false;
    };
  }, [key, enabled, mode]);
  return state.key === key && enabled && mode === "cloud"
    ? state
    : { key, rows: [], error: false, loading: false };
}
export function RatingSummary({ value }: { value: ReviewSummary | undefined }) {
  useLanguage();
  return value ? (
    <span className="seller-rating">
      ★{" "}
      {new Intl.NumberFormat(currentLanguage(), {
        maximumFractionDigits: 1,
      }).format(value.average)}{" "}
      / 5 · {value.total} {t("valoraciones")}
    </span>
  ) : null;
}
export function SellerReviews({
  producerId,
  summaries,
  enabled = config.reviewsReady,
}: {
  producerId: string;
  summaries: ReturnType<typeof useReviewSummaries>;
  enabled?: boolean;
}) {
  useLanguage();
  const { mode } = useUzta();
  const [comments, setComments] = useState<{
    id: string;
    rows: ReviewComment[];
    error: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (!enabled || mode !== "cloud") return;
    void reviewComments(producerId)
      .then((rows) => {
        if (active) setComments({ id: producerId, rows, error: false });
      })
      .catch(() => {
        if (active) setComments({ id: producerId, rows: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [producerId, enabled, mode]);
  if (!enabled || mode !== "cloud")
    return <p>{t("Valoraciones pendientes de activación.")}</p>;
  const current = comments?.id === producerId ? comments : null;
  if (summaries.error || current?.error)
    return <p role="alert">{t("No se pudieron cargar las valoraciones.")}</p>;
  if (summaries.loading || !current)
    return <p role="status">{t("Cargando valoraciones…")}</p>;
  const value = summaries.rows[0];
  return (
    <div className="seller-reviews">
      <RatingSummary value={value} />
      {!value && <p>{t("Sin valoraciones todavía")}</p>}
      {current.rows.map((r) => (
        <article key={r.id}>
          <strong>★ {r.rating} / 5</strong>
          <time dateTime={r.created_at}>
            {new Intl.DateTimeFormat(currentLanguage(), {
              dateStyle: "medium",
            }).format(new Date(r.created_at))}
          </time>
          <p>{r.comment}</p>
        </article>
      ))}
    </div>
  );
}
export function ReservationReview({
  orderId,
  userId,
  enabled = config.reviewsReady,
}: {
  orderId: string;
  userId: string;
  enabled?: boolean;
}) {
  // Remounting on order/account changes keeps drafts and async responses isolated.
  return (
    <ReviewForm
      key={orderId + userId}
      orderId={orderId}
      userId={userId}
      enabled={enabled}
    />
  );
}
function ReviewForm({
  orderId,
  userId,
  enabled,
}: {
  orderId: string;
  userId: string;
  enabled: boolean;
}) {
  useLanguage();
  const [rating, setRating] = useState(0),
    [comment, setComment] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saved" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(false);
  const alive = useRef(false),
    locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    if (enabled)
      void ownReview(orderId, userId)
        .then((r) => {
          if (alive.current) {
            if (r) {
              setRating(r.rating);
              setComment(r.comment);
            }
            setStatus(r ? "saved" : "ready");
          }
        })
        .catch(() => {
          if (alive.current) setStatus("error");
        });
    return () => {
      alive.current = false;
    };
  }, [enabled, orderId, userId]);
  if (!enabled) return null;
  if (status === "loading")
    return <p role="status">{t("Cargando valoraciones…")}</p>;
  if (status === "error")
    return <p role="alert">{t("No se pudieron cargar las valoraciones.")}</p>;
  if (status === "saved")
    return (
      <p role="status">
        {t("Tu valoración está guardada.")} ★ {rating} / 5
      </p>
    );
  return (
    <form
      className="reservation-review"
      onSubmit={async (e) => {
        e.preventDefault();
        if (locked.current) return;
        locked.current = true;
        setSaving(true);
        setError(false);
        try {
          await submitReview(orderId, rating, comment);
          if (alive.current) setStatus("saved");
        } catch {
          if (alive.current) setError(true);
        } finally {
          locked.current = false;
          if (alive.current) setSaving(false);
        }
      }}
    >
      <h3>{t("Valorar al vendedor")}</h3>
      <fieldset disabled={saving}>
        <legend>{t("Puntuación de 1 a 5 estrellas")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name="rating"
              value={n}
              checked={rating === n}
              onChange={() => setRating(n)}
            />
            <span aria-hidden="true">★</span>
            <span>{n}</span>
          </label>
        ))}
      </fieldset>
      <label>
        {t("Comentario opcional")}
        <textarea
          maxLength={300}
          value={comment}
          disabled={saving}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <small>{comment.length} / 300</small>
      {error && (
        <p role="alert">
          {t("No se pudo guardar. Actualiza el pedido antes de reintentar.")}
        </p>
      )}
      <button className="primary" disabled={!rating || saving}>
        {t("Guardar valoración")}
      </button>
    </form>
  );
}
