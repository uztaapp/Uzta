import { t, useLanguage } from "../lib/language";
import { Link } from "@tanstack/react-router";
export function UsageGuide({
  demo,
  close,
}: {
  demo: boolean;
  close: () => void;
}) {
  useLanguage();
  return (
    <div className="usage-guide">
      <p>
        {demo
          ? t(
              "Estás usando ejemplos ficticios. Las acciones de esta vista no envían pedidos reales.",
            )
          : t(
              "Tus productos, favoritos y reservas se guardan en tu cuenta de UZTA.",
            )}
      </p>
      <h3>{t("Comprar al productor")}</h3>
      <ol>
        <li>{t("Busca productos o elige una categoría y abre la tienda.")}</li>
        <li>
          {t(
            "Añade productos a la cesta. Cada reserva reúne productos de un mismo productor.",
          )}
        </li>
        <li>
          {t(
            "Elige una franja de recogida y confirma. Revisa el estado y el detalle en Pedidos.",
          )}
        </li>
      </ol>
      <h3>{t("Gestionar tu tienda")}</h3>
      <ol>
        <li>
          {t(
            "En Mi perfil → Mi tienda, guarda el nombre, la localidad y la descripción.",
          )}
        </li>
        <li>
          {t(
            "En Productos, configura precio, unidad y existencias. Puedes ocultar un producto sin borrarlo.",
          )}
        </li>
        <li>
          {t(
            "Publica franjas en Horarios y entregas. En Pedidos → Como productor, revisa las reservas y marca las recogidas completadas.",
          )}
        </li>
      </ol>
      <p>
        {t(
          "UZTA permite reservar para recoger; todavía no tramita pagos ni reparto a domicilio.",
        )}
      </p>
      <div className="guide-links">
        <Link to="/" onClick={close}>
          {t("Ver productos")}
        </Link>
        <Link to="/pedidos" onClick={close}>
          {t("Ver pedidos")}
        </Link>
        <Link to="/perfil" search={{ apartado: "tienda" }} onClick={close}>
          {t("Mi tienda")}
        </Link>
      </div>
    </div>
  );
}
