import { Component, type ReactNode } from "react";
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
