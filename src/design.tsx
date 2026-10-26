import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  STORAGE_KEY,
  readStore,
  transition,
  seedStore,
  type LocalStore,
  type Command,
} from "./lib/local-model";
export { euro } from "./lib/local-model";
function loadBrowserStore() {
  try {
    return readStore(window.localStorage);
  } catch {
    return {
      value: seedStore(),
      error:
        "El navegador no permite guardar datos locales. Se muestran ejemplos sin sobrescribir datos.",
    };
  }
}
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
type Demo = {
  data: LocalStore;
  run: (command: Command) => boolean;
  show: (text: string) => void;
  storageError: string;
};
const Context = createContext<Demo | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadBrowserStore);
  const [data, setData] = useState(loaded.value);
  const current = useRef(data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [notice, show] = useState("");
  function run(command: Command) {
    if (loaded.error) {
      show(loaded.error);
      return false;
    }
    try {
      const latest = loadBrowserStore();
      if (latest.error) throw Error(latest.error);
      const next = transition(
        latest.value.revision >= current.current.revision
          ? latest.value
          : current.current,
        command,
      );
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      current.current = next;
      setData(next);
      setStorageError("");
      return true;
    } catch (error) {
      show(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cambio local.",
      );
      return false;
    }
  }
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      const latest = loadBrowserStore();
      if (latest.error) {
        setStorageError(latest.error);
        return;
      }
      current.current = latest.value;
      setData(latest.value);
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return (
    <Context.Provider value={{ data, run, show, storageError }}>
      {storageError ? (
        <div role="alert" className="storage-error">
          {storageError}
        </div>
      ) : null}
      {children}
      {notice ? (
        <Modal title="UZTA local" close={() => show("")}>
          <p>{notice}</p>
          <button className="primary" onClick={() => show("")}>
            Entendido
          </button>
        </Modal>
      ) : null}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw Error("UZTA provider missing");
  return value;
}
