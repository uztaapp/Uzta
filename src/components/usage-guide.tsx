import { Link } from "@tanstack/react-router";
export function UsageGuide({
  demo,
  close,
}: {
  demo: boolean;
  close: () => void;
}) {
  return (
    <div className="usage-guide">
      <p>
        {demo
          ? "Estás usando ejemplos ficticios. Las acciones de esta vista no envían pedidos reales."
          : "Tus productos, favoritos y reservas se guardan en tu cuenta de UZTA."}
      </p>
      <h3>Comprar al productor</h3>
      <ol>
        <li>Busca productos o elige una categoría y abre la tienda.</li>
        <li>
          Añade productos a la cesta. Cada reserva reúne productos de un mismo
          productor.
        </li>
        <li>
          Elige una franja de recogida y confirma. Revisa el estado y el detalle
          en Pedidos.
        </li>
      </ol>
      <h3>Gestionar tu tienda</h3>
      <ol>
        <li>
          En Mi perfil → Mi tienda, guarda el nombre, la localidad y la
          descripción.
        </li>
        <li>
          En Productos, configura precio, unidad y existencias. Puedes ocultar
          un producto sin borrarlo.
        </li>
        <li>
          Publica franjas en Horarios y entregas. En Pedidos → Como productor,
          revisa las reservas y marca las recogidas completadas.
        </li>
      </ol>
      <p>
        UZTA permite reservar para recoger; todavía no tramita pagos ni reparto
        a domicilio.
      </p>
      <div className="guide-links">
        <Link to="/" onClick={close}>
          Ver productos
        </Link>
        <Link to="/pedidos" onClick={close}>
          Ver pedidos
        </Link>
        <Link to="/perfil" search={{ apartado: "tienda" }} onClick={close}>
          Mi tienda
        </Link>
      </div>
    </div>
  );
}
