import { useState, useEffect, useRef, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AppContext, type AppContextValue } from "./app-context";
import { cloudClient, authReturnUrl } from "./lib/cloud-client";
import {
  loadCloudData,
  emptyCloudData,
  cartTransition,
  writeCloudCart,
  persistCloudCommand,
  cloudMessage,
} from "./lib/cloud-data";
import type { Command, LocalStore } from "./lib/local-model";
import { Modal } from "./components/presentation";
export function CloudProvider({
  children,
  switchMode,
}: {
  children: ReactNode;
  switchMode: AppContextValue["switchMode"];
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [data, setData] = useState(emptyCloudData);
  const [managedFarmId, setManagedFarmId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, show] = useState("");
  const current = useRef(data);
  const user = useRef<User | null>(null);
  const saving = useRef(false);
  const epoch = useRef(0);
  const alive = useRef(true);
  function update(next: LocalStore) {
    current.current = next;
    setData(next);
  }
  useEffect(() => {
    alive.current = true;
    let active = true;
    const client = cloudClient();
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error)
        setError("No se pudo recuperar la sesión. Vuelve a iniciar sesión.");
      setSession(data.session);
      setInitialized(true);
    });
    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, next) => {
        if (active) {
          setSession(next);
          setInitialized(true);
        }
      },
    );
    return () => {
      active = false;
      alive.current = false;
      epoch.current++;
      subscription.subscription.unsubscribe();
    };
  }, []);
  async function refresh() {
    const generation = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      let verified: User | null = null;
      if (session) {
        const result = await cloudClient().auth.getUser();
        if (
          result.error ||
          !result.data.user ||
          result.data.user.id !== session.user.id
        )
          throw Error(
            "La sesión no es válida. Cierra sesión y vuelve a entrar.",
          );
        verified = result.data.user;
      }
      const loaded = await loadCloudData(verified);
      if (!alive.current || generation !== epoch.current) return;
      user.current = verified;
      setUserId(verified?.id ?? null);
      setManagedFarmId(loaded.managedFarmId);
      update(loaded.data);
    } catch (e) {
      if (alive.current && generation === epoch.current) {
        setError(cloudMessage(e));
        user.current = null;
        setUserId(null);
        setManagedFarmId(null);
        update(emptyCloudData());
      }
    } finally {
      if (alive.current && generation === epoch.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (!initialized) return;
    user.current = null;
    setUserId(null);
    setManagedFarmId(null);
    update(emptyCloudData());
    void refresh();
  }, [initialized, session?.access_token]);
  async function run(command: Command) {
    if (["quantity", "remove", "message"].includes(command.type)) {
      try {
        if (busy) throw Error("Espera a que termine de cargar UZTA.");
        const cart = cartTransition(current.current, command);
        writeCloudCart(user.current?.id ?? null, cart);
        update({ ...current.current, ...cart });
        return true;
      } catch (e) {
        show(cloudMessage(e));
        return false;
      }
    }
    if (command.type === "session") {
      if (!command.active) await signOut();
      return false;
    }
    if (saving.current || busy) return false;
    saving.current = true;
    setBusy(true);
    const actor = user.current;
    const own = managedFarmId;
    let saved = false;
    try {
      await persistCloudCommand(current.current, command, actor, own);
      saved = true;
      if (actor?.id !== user.current?.id) return false;
      const loaded = await loadCloudData(actor);
      if (!alive.current || actor?.id !== user.current?.id) return false;
      setManagedFarmId(loaded.managedFarmId);
      update(loaded.data);
      return true;
    } catch (e) {
      show(
        saved
          ? "El cambio se guardó, pero no se pudo actualizar la pantalla. Pulsa Actualizar antes de repetir."
          : cloudMessage(e),
      );
      return saved;
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function signIn(email: string, password: string) {
    const result = await cloudClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (result.error)
      throw Error(
        "No se pudo iniciar sesión. Revisa el correo, la contraseña y la confirmación de tu cuenta.",
      );
  }
  async function signUp(name: string, email: string, password: string) {
    const result = await cloudClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authReturnUrl(),
        data: { display_name: name.trim() },
      },
    });
    if (result.error)
      throw Error(
        "No se pudo crear la cuenta. Revisa los datos o inténtalo más tarde.",
      );
    return result.data.session
      ? "Cuenta creada."
      : "Revisa tu correo para confirmar la cuenta antes de iniciar sesión.";
  }
  async function signOut() {
    setBusy(true);
    const result = await cloudClient().auth.signOut({ scope: "local" });
    if (result.error) {
      setBusy(false);
      show("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      return;
    }
    user.current = null;
    epoch.current++;
    setSession(null);
    setUserId(null);
    setManagedFarmId(null);
    update(emptyCloudData());
  }
  return (
    <AppContext.Provider
      value={{
        data,
        run,
        show,
        storageError: error,
        mode: "cloud",
        busy,
        managedFarmId,
        userId,
        switchMode,
        refresh,
        signIn,
        signUp,
        signOut,
      }}
    >
      {error ? (
        <div role="alert" className="storage-error">
          {error}
          <button className="text-button" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      ) : null}
      {busy ? (
        <p role="status" className="loading-status">
          Actualizando UZTA…
        </p>
      ) : null}
      {children}
      {notice ? (
        <Modal title="UZTA" close={() => show("")}>
          <p>{notice}</p>
          <button className="primary" onClick={() => show("")}>
            Entendido
          </button>
        </Modal>
      ) : null}
    </AppContext.Provider>
  );
}
