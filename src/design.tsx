import {
  useState,
  useRef,
  useEffect,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import {
  STORAGE_KEY as LEGACY_STORAGE_KEY,
  readStore,
  transition,
  seedStore,
  type Command,
} from "./lib/local-model";
import { AppContext, useUzta, type AppContextValue } from "./app-context";
const CloudProvider = lazy(() =>
  import("./cloud-provider").then((module) => ({
    default: module.CloudProvider,
  })),
);
import { Modal } from "./components/presentation";
export { Photo, Modal } from "./components/presentation";
export { euro } from "./lib/local-model";
export const useDemo = useUzta;
const STORAGE_KEY =
  import.meta.env.MODE === "test" ? LEGACY_STORAGE_KEY : "uzta.showcase.v1";
function loadBrowserStore() {
  try {
    return readStore(window.localStorage, STORAGE_KEY);
  } catch {
    return {
      value: seedStore(),
      error: "No se pueden leer los datos de demostración; no se sobrescriben.",
    };
  }
}
export function DemoProvider({ children }: { children: ReactNode }) {
  // The public and local app always use Supabase. Fixtures exist only in tests.
  const mode = import.meta.env.MODE === "test" ? "demo" : "cloud";
  const switchMode: AppContextValue["switchMode"] = () => {};
  return mode === "demo" ? (
    <LocalDemoProvider switchMode={switchMode}>{children}</LocalDemoProvider>
  ) : (
    <Suspense
      fallback={
        <p role="status" className="loading-status">
          Abriendo UZTA…
        </p>
      }
    >
      <CloudProvider switchMode={switchMode}>{children}</CloudProvider>
    </Suspense>
  );
}
export function ModeBanner() {
  const { mode } = useDemo();
  return mode === "demo" ? (
    <div className="local-strip">
      Demostración · Datos de ejemplo separados de tu cuenta
    </div>
  ) : null;
}
function LocalDemoProvider({
  children,
  switchMode,
}: {
  children: ReactNode;
  switchMode: AppContextValue["switchMode"];
}) {
  const [loaded] = useState(loadBrowserStore);
  const [data, setData] = useState(loaded.value);
  const current = useRef(data);
  const [storageError, setStorageError] = useState(loaded.error);
  const [notice, show] = useState("");
  async function run(command: Command) {
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
    <AppContext.Provider
      value={{
        data,
        run,
        show,
        storageError,
        mode: "demo",
        busy: false,
        managedFarmId: "urki",
        userId: null,
        switchMode,
        refresh: async () => {},
        signIn: async () => {},
        signUp: async () => "",
        signOut: async () => {
          await run({ type: "session", active: false });
        },
      }}
    >
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
    </AppContext.Provider>
  );
}
