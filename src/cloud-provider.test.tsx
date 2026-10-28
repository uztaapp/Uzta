import React from "react";
import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { CloudProvider } from "./cloud-provider";
import { useUzta } from "./app-context";
import { Access } from "./components/access";
import { emptyCloudData } from "./lib/cloud-data";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  load: vi.fn(),
  persist: vi.fn(),
  callback: null as null | ((event: string, session: any) => void),
}));
vi.mock("./lib/cloud-client", () => ({
  authReturnUrl: () => "https://uzta-nu.vercel.app/",
  cloudClient: () => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      onAuthStateChange: (callback: any) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  }),
}));
vi.mock("./lib/cloud-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/cloud-data")>();
  return {
    ...actual,
    loadCloudData: mocks.load,
    persistCloudCommand: mocks.persist,
  };
});
const account = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "usuario@example.test",
};
function Probe() {
  const value = useUzta();
  return (
    <>
      <div data-testid="identity">
        {value.data.sessionActive ? value.data.profile.name : "Visitante"}
      </div>
      <button onClick={() => void value.refresh()}>Actualizar datos</button>
      <button
        disabled={value.busy}
        onClick={() =>
          void value.run({
            type: "profile",
            value: {
              ...value.data.profile,
              name: "Nombre guardado",
              location: "Localidad de prueba",
            },
          })
        }
      >
        Guardar nombre
      </button>
      {!value.data.sessionActive ? (
        <Access />
      ) : (
        <button onClick={() => void value.signOut()}>Salir</button>
      )}
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.callback = null;
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: account }, error: null });
  mocks.load.mockImplementation(async (user) => ({
    data: {
      ...emptyCloudData(),
      sessionActive: !!user,
      profile: {
        name: user ? "Persona real" : "",
        email: user?.email ?? "",
        location: "",
        language: "Español",
      },
    },
    managedFarmId: null,
  }));
  mocks.persist.mockResolvedValue(undefined);
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  mocks.signOut.mockImplementation(async () => {
    mocks.callback?.("SIGNED_OUT", null);
    return { error: null };
  });
});
afterEach(() => cleanup());
test("session transport failure stops loading and can be retried without reloading the page", async () => {
  mocks.getSession.mockRejectedValueOnce(Error("offline"));
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "recuperar la sesión",
  );
  expect(screen.queryByText("Actualizando UZTA…")).not.toBeInTheDocument();
  expect(mocks.load).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith(null));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("a sign-out transport failure preserves the current identity and reports the failure", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "fixture", user: account } },
    error: null,
  });
  mocks.signOut.mockRejectedValueOnce(Error("offline"));
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  await screen.findByText("Persona real");
  fireEvent.click(screen.getByRole("button", { name: "Salir" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "No se pudo cerrar la sesión",
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Persona real");
  expect(screen.queryByText("Actualizando UZTA…")).not.toBeInTheDocument();
});

test("a late post-save read cannot overwrite data loaded after an auth refresh", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "fixture", user: account } },
    error: null,
  });
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  await screen.findByText("Persona real");
  let oldRead: (value: any) => void = () => {};
  // A background read has already captured old data, but its response arrives late.
  const original = mocks.load.getMockImplementation()!;
  const oldData = await original(account);
  mocks.load.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        oldRead = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
  await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
  mocks.load.mockImplementationOnce(async () => ({
    ...oldData,
    data: {
      ...oldData.data,
      profile: { ...oldData.data.profile, name: "Nombre guardado" },
    },
  }));
  await act(async () => {
    mocks.callback?.("TOKEN_REFRESHED", {
      access_token: "new-fixture",
      user: account,
    });
  });
  await screen.findByText("Nombre guardado");
  await act(async () => {
    oldRead(oldData);
  });
  expect(screen.getByTestId("identity")).toHaveTextContent("Nombre guardado");
});

test("a failed private save keeps the current data and shows the failure", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "fixture", user: account } },
    error: null,
  });
  mocks.persist.mockRejectedValueOnce(Error("No se pudo guardar el cambio."));
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  await screen.findByText("Persona real");
  fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(
    "No se pudo guardar el cambio",
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Persona real");
});
test("signed-out cloud view never starts with the demonstration identity", async () => {
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).not.toBeDisabled(),
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Visitante");
  expect(screen.queryByText("Ana García")).not.toBeInTheDocument();
  expect(mocks.load).toHaveBeenCalledWith(null);
});
test("an invalid restored session never loads private account data", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "fixture", user: account } },
    error: null,
  });
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "invalid" },
  });
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "sesión no es válida",
  );
  expect(mocks.load).not.toHaveBeenCalled();
  expect(screen.getByTestId("identity")).toHaveTextContent("Visitante");
});
test("a verified session shows its own profile and sign-out removes that identity", async () => {
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "fixture", user: account } },
    error: null,
  });
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  expect(await screen.findByText("Persona real")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Salir" }));
  await waitFor(() =>
    expect(screen.getByTestId("identity")).toHaveTextContent("Visitante"),
  );
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
});
test("registration waits for confirmation and passes only the approved return URL", async () => {
  render(
    <CloudProvider switchMode={() => {}}>
      <Probe />
    </CloudProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Crear una cuenta" }));
  fireEvent.change(screen.getByLabelText("Nombre"), {
    target: { value: "Persona de prueba" },
  });
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "prueba@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "fixture-only-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "confirmar la cuenta",
  );
  expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(
    "https://uzta-nu.vercel.app/",
  );
  expect(screen.getByTestId("identity")).toHaveTextContent("Visitante");
});

test("catalogue failure remains a Supabase error and never offers a demo fallback", async () => {
  mocks.load.mockRejectedValueOnce(new Error("No se pudo cargar el catálogo."));
  const switchMode = vi.fn();
  render(
    <CloudProvider switchMode={switchMode}>
      <Probe />
    </CloudProvider>,
  );
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  expect(
    screen.getByRole("button", { name: "Reintentar" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /demostración/i }),
  ).not.toBeInTheDocument();
  expect(switchMode).not.toHaveBeenCalled();
});

function FavoriteProbe(){const v=useUzta();return <><button disabled={v.busy} onClick={()=>void v.run({type:"favorite",id:"product"})}>Favorito prueba</button><output>{v.data.favorites.includes("product")?"Guardado":"Sin guardar"}</output></>;}
test("favorites update immediately, rollback errors and avoid a catalogue reload",async()=>{
 mocks.getSession.mockResolvedValue({data:{session:{user:account,access_token:"token"}},error:null});
 let reject!:(e:Error)=>void;mocks.persist.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));
 render(<CloudProvider switchMode={()=>{}}><FavoriteProbe/></CloudProvider>);
 await waitFor(()=>expect(screen.getByRole("button",{name:"Favorito prueba"})).toBeEnabled());
 const reads=mocks.load.mock.calls.length;fireEvent.click(screen.getByRole("button",{name:"Favorito prueba"}));
 expect(screen.getByText("Guardado")).toBeInTheDocument();
 await act(async()=>reject(Error("offline")));
 expect(screen.getByText("Sin guardar")).toBeInTheDocument();expect(mocks.load.mock.calls.length).toBe(reads);
});
