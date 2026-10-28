import { PasswordRecovery } from "./components/password-recovery";
import { t } from "./lib/language";
import { z } from "zod";
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
  const [recoveryUser, setRecoveryUser] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);
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
    let receivedAuthEvent = false;
    const client = cloudClient();
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        if (error) throw error;
        setSession(data.session);
        setInitialized(true);
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return;
        setError(
          "No se pudo recuperar la sesión. Comprueba tu conexión y pulsa Reintentar.",
        );
        setBusy(false);
      });
    const { data: subscription } = client.auth.onAuthStateChange(
      (event, next) => {
        if (active) {
          setRecoveryUser((previous) =>
            event === "PASSWORD_RECOVERY"
              ? (next?.user.id ?? null)
              : !next || (previous && previous !== next.user.id)
                ? null
                : previous,
          );
          receivedAuthEvent = true;
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
  }, [sessionAttempt]);
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
    if (command.type === "favorite" || command.type === "sellerFavorite") {
      if (saving.current || busy) return false;
      const actor = user.current;
      if (!actor) {
        show("Inicia sesión en UZTA para continuar.");
        return false;
      }
      const before = current.current;
      const field =
        command.type === "favorite" ? "favorites" : "sellerFavorites";
      const savedIds = before[field];
      const generation = ++epoch.current;
      saving.current = true;
      setBusy(true);
      update({
        ...before,
        [field]: savedIds.includes(command.id)
          ? savedIds.filter((id) => id !== command.id)
          : [...savedIds, command.id],
      });
      try {
        await persistCloudCommand(before, command, actor, managedFarmId);
        return (
          alive.current &&
          generation === epoch.current &&
          actor.id === user.current?.id
        );
      } catch (e) {
        if (
          alive.current &&
          generation === epoch.current &&
          actor.id === user.current?.id
        ) {
          update({ ...current.current, [field]: savedIds });
          show(cloudMessage(e));
        }
        return false;
      } finally {
        saving.current = false;
        if (alive.current && generation === epoch.current) setBusy(false);
      }
    }
    if (command.type === "session") {
      if (!command.active) await signOut();
      return false;
    }
    if (saving.current || busy) return false;
    saving.current = true;
    setBusy(true);
    const generation = ++epoch.current;
    const actor = user.current;
    const own = managedFarmId;
    let saved = false;
    try {
      await persistCloudCommand(current.current, command, actor, own);
      saved = true;
      if (actor?.id !== user.current?.id) return false;
      const loaded = await loadCloudData(actor);
      if (
        !alive.current ||
        actor?.id !== user.current?.id ||
        generation !== epoch.current
      )
        return false;
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
      if (alive.current && generation === epoch.current) setBusy(false);
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
  async function requestPasswordReset(email: string) {
    const checked = z.email().max(200).parse(email.trim());
    const result = await cloudClient().auth.resetPasswordForEmail(checked, {
      redirectTo: authReturnUrl(),
    });
    if (result.error) throw Error("Password reset unavailable");
  }
  async function updateRecoveredPassword(password: string) {
    if (password.length < 8 || password.length > 128)
      throw Error("Invalid password");
    const verified = await cloudClient().auth.getUser();
    if (
      verified.error ||
      !verified.data.user ||
      verified.data.user.id !== recoveryUser
    )
      throw Error("Invalid recovery session");
    const result = await cloudClient().auth.updateUser({ password });
    if (result.error) throw Error("Password change unavailable");
    setRecoveryUser(null);
    show(t("Contraseña actualizada."));
  }
  async function signOut() {
    setBusy(true);
    try {
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
    } catch {
      show(
        "No se pudo cerrar la sesión. Comprueba tu conexión e inténtalo de nuevo.",
      );
      setBusy(false);
    }
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
        requestPasswordReset,
      }}
    >
      {error ? (
        <div role="alert" className="storage-error">
          {error}
          <button
            className="text-button"
            onClick={() => {
              if (initialized) void refresh();
              else {
                setError("");
                setBusy(true);
                setSessionAttempt((n) => n + 1);
              }
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {busy ? (
        <p role="status" className="loading-status">
          Actualizando UZTA…
        </p>
      ) : null}
      {recoveryUser && session?.user.id === recoveryUser && (
        <PasswordRecovery
          key={recoveryUser}
          close={() => setRecoveryUser(null)}
          save={updateRecoveredPassword}
        />
      )}
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
