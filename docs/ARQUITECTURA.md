# Arquitectura propia de UZTA

## Interfaz

React + TanStack Router + Vite. Rutas separadas para las cinco pantallas; los parámetros `tienda`, `pedido`, `vista` y `apartado` conservan enlaces directos a los detalles.
Formularios con validación; diálogos con foco delimitado, cierre por Escape y retorno del foco. Fuentes, imágenes y estilos locales.

## Datos locales

`src/lib/local-model.ts` define el contrato validado con Zod y las operaciones de cesta, stock, reserva, perfil y gestión.
`src/design.tsx` carga/escribe la clave `uzta.local.v1` y actualiza otras pestañas mediante eventos de almacenamiento. Los datos originales no se sustituyen si no superan la validación.
Los cambios se guardan antes de mostrarse como correctos. La persistencia local está concebida para pruebas en un solo equipo, no como mecanismo multiusuario o de seguridad.
Cada pedido conserva instantáneas de productor, productos, cantidades, precios y recogida. No hay pagos, comisiones, cancelaciones o límites de capacidad añadidos.
La tienda gestionable del perfil de ejemplo es Ferme de l’Urki; las demás fichas son ejemplos de catálogo independientes. Los productos iguales de tiendas distintas tienen identificadores distintos.

## PostgreSQL preparado

Tablas `uzta_profiles`, `uzta_producers`, `uzta_products`, `uzta_pickup_slots`, `uzta_orders`, `uzta_order_items`, `uzta_favorites`.
SQL probado con PGlite en un proceso desechable. El test crea un esquema `auth` y roles simulados, exclusivamente dentro de memoria; no crea cuentas reales.
`uzta_reserve_order` y `uzta_complete_order` son envoltorios públicos sin privilegios elevados. Su implementación privada valida identidad y propiedad, fija search_path y limita permisos. La reserva calcula precios del catálogo, bloquea filas en orden y revierte todo si falla cualquier línea.
Los métodos del navegador aún no llaman estas funciones. La futura integración debe volver a probar el recorrido completo con JWT reales de Supabase LOCAL y múltiples conexiones.

## Diseño

Referencia aprobada: public/images/uzta-reference.png, recuperada del enlace proporcionado por el usuario.
Los recortes se realizan en CSS para reproducir las fotografías mientras no haya imágenes individuales. Todas son de ejemplo.
