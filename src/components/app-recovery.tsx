import { Component, type ReactNode } from "react";
export function RootRecovery() {
  return (
    <div className="app">
      <main>
        <section className="empty" role="alert">
          <h1>No se pudo abrir UZTA</h1>
          <p>
            Comprueba tu conexión y recarga la aplicación. Tus datos guardados
            no se borran al recargar.
          </p>
          <button className="primary" onClick={() => window.location.reload()}>
            Recargar aplicación
          </button>
          <a className="text-button" href="/">
            Volver al inicio
          </a>
        </section>
      </main>
    </div>
  );
}
export class AppRecovery extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="empty" role="alert">
        <h1>No se pudo mostrar esta pantalla</h1>
        <p>
          Puedes reintentar o usar la navegación inferior. Tus datos guardados
          no se han borrado.
        </p>
        <button
          className="primary"
          onClick={() => this.setState({ failed: false })}
        >
          Reintentar pantalla
        </button>
      </section>
    );
  }
}
