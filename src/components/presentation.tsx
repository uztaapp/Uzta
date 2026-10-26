import {
  useRef,
  useEffect,
  useId,
  type ReactNode,
  type CSSProperties,
} from "react";
export function Photo({
  crop,
  className = "",
  label,
}: {
  crop: number[];
  className?: string;
  label: string;
}) {
  const [x, y, width, height] = crop;
  if (width <= 0 || height <= 0)
    return (
      <div
        role="img"
        aria-label={`Sin foto: ${label}`}
        className={`photo photo-placeholder ${className}`}
      >
        <span aria-hidden="true">♧</span>
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
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Cerrar diálogo" onClick={close}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
