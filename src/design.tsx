import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  STORAGE_KEY,
  readStore,
  transition,
  seedStore,
  type Command,
} from "./lib/local-model";
import { AppContext, useUzta, type AppContextValue } from "./app-context";
import { CloudProvider } from "./cloud-provider";
import { Modal } from "./components/presentation";
export { Photo, Modal } from "./components/presentation";
export { euro } from "./lib/local-model";
export const useDemo = useUzta;
function loadBrowserStore() {
  try {
    return readStore(window.localStorage);
  } catch {
    return {
      value: seedStore(),
      error: "No se pueden leer los datos de demostración; no se sobrescriben.",
    };
  }
}
export function DemoProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"demo" | "cloud">(() => {
    if (import.meta.env.MODE === "test") return "demo";
    try {
      return localStorage.getItem("uzta.view.v1") === "demo" ? "demo" : "cloud";
    } catch {
      return "cloud";
    }
  });
  function switchMode(next: "demo" | "cloud") {
    try {
      localStorage.setItem("uzta.view.v1", next);
    } catch {}
    setMode(next);
  }
  return mode === "demo" ? (
    <LocalDemoProvider switchMode={switchMode}>{children}</LocalDemoProvider>
  ) : (
    <CloudProvider switchMode={switchMode}>{children}</CloudProvider>
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
