import { t, useLanguage } from "../lib/language";
import {
  useRef,
  useState,
  useEffect,
  useId,
  type ReactNode,
  type CSSProperties,
} from "react";
import { Sprout, Apple, Flower2, Milk, UserRound, Store } from "lucide-react";
export function Photo({
  crop,
  className = "",
  label,
  src,
}: {
  crop: number[];
  className?: string;
  label: string;
  src?: string | null;
}) {
  useLanguage();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (src && !failed)
    return (
      <img
        className={`photo uploaded-photo ${className}`}
        src={src}
        alt={label}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  const [x, y, width, height] = src && failed ? [0, 0, 0, 0] : crop;
  const Illustration = /manzana/i.test(label)
    ? Apple
    : /miel/i.test(label)
      ? Flower2
      : /queso/i.test(label)
        ? Milk
        : /avatar|productor/i.test(label)
          ? UserRound
          : /tienda|caserío/i.test(label)
            ? Store
            : Sprout;
  if (width <= 0 || height <= 0)
    return (
      <div
        role="img"
        aria-label={`Sin foto: ${label}`}
        className={`photo photo-placeholder ${className}`}
      >
        <Illustration aria-hidden="true" strokeWidth={1.25} />
      </div>
    );
  const style: CSSProperties = {
    backgroundImage: "url(/images/uzta-reference.png)",
    backgroundSize: `${(1536 / width) * 100}% ${(1024 / height) * 100}%`,
    backgroundPosition: `${(x / (1536 - width)) * 100}% ${(y / (1024 - height)) * 100}%`,
  };
  return (
    <div
      role="img"
      aria-label={label}
      className={`photo ${className}`}
      style={style}
    />
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  useLanguage();
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>("input,select,textarea,button,a[href]")
      ?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="notice"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            closeRef.current();
          }
          if (event.key === "Tab") {
            const nodes = Array.from(
              ref.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
              ) ?? [],
            );
            const first = nodes[0],
              last = nodes.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{t(title)}</h2>
          <button aria-label={t("Cerrar diálogo")} onClick={close}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
