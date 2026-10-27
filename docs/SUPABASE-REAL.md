# Supabase real de UZTA · 26/10/2026

Proyecto confirmado en la sesión nueva del navegador:

- Organización: Uzta (`pgmgdhpeckpkdjcipuzn`), plan Free.
- Proyecto: Uzta (`abgysktjctrxfkcejjwu`), eu-west-1, estado Healthy.
- Panel: https://supabase.com/dashboard/project/abgysktjctrxfkcejjwu
- API: https://abgysktjctrxfkcejjwu.supabase.co
- Web autorizada: https://uzta-nu.vercel.app

## Cambios aplicados

Inventario inicial comprobado mediante SQL: cero tablas públicas, cero usuarios Auth y cero objetos Storage.
La migración `20261026171459_uzta_core.sql` se ejecutó en una transacción desde el SQL Editor del proyecto confirmado. Creó siete tablas propias, índices, políticas RLS y funciones transaccionales de reservas/recogidas. No se importaron cuentas ni datos de ejemplo.

Verificación posterior en la base real:

| Tabla | RLS | Políticas |
|---|---|---:|
| uzta_favorites | Activa | 3 |
| uzta_order_items | Activa | 1 |
| uzta_orders | Activa | 1 |
| uzta_pickup_slots | Activa | 3 |
| uzta_producers | Activa | 3 |
| uzta_products | Activa | 3 |
| uzta_profiles | Activa | 3 |

Security Advisor recalculado después de la migración: 0 errores, 0 advertencias y 0 sugerencias mostradas.
Site URL guardada y comprobada: `https://uzta-nu.vercel.app`. Retorno adicional exacto: `http://127.0.0.1:5178/`. No se desactivó la confirmación de correo ni se habilitaron proveedores externos.

## Conexión y pruebas

`config/uzta-cloud.public.json` contiene solo la URL y la clave publicable existente del proyecto, apta para clientes bajo RLS. No se ha revelado ni utilizado ninguna clave secreta, service role, contraseña de base de datos o token de administración.
`server/uzta-cloud.mjs` fija el proyecto autorizado y reutiliza el contrato de datos probado. Rechaza otros destinos y sesiones emitidas por la instancia local.

`npm.cmd run check:cloud` verificó la API real:

- Catálogo público accesible y respuesta compatible con el adaptador.
- Lectura de perfiles rechazada sin sesión.
- Ejecución de reservas rechazada sin sesión, sin crear datos.

Las 16 pruebas automatizadas del adaptador (local y UZTA real con transporte simulado) pasan. El catálogo real permanece vacío.

## Pendiente

Actualización posterior: la interfaz local ya integra Auth y persistencia. Los párrafos inferiores describen el hito anterior; el estado vigente y sus límites están en INTEGRACION-REAL.md. La migración adicional `20261026205213_uzta_product_visibility.sql` también se aplicó desde el SQL Editor y se verificó `featured boolean NOT NULL`. Ambas migraciones requieren reconciliar el historial antes de usar `db push`.

La web publicada y el servidor de desarrollo siguen usando el modelo de demostración en el navegador. Aún no se ha integrado un inicio de sesión real ni la persistencia Supabase de esas pantallas.
No se ha migrado localStorage, creado usuarios reales, enviado correos o insertado pedidos. La integración deberá verificar Auth con usuarios de prueba, permisos de productor/comprador y concurrencia antes de sustituir el guardado actual.

La migración se aplicó manualmente desde el panel, no mediante el conector ni `db push`. No se ha escrito su registro en el historial administrado de Supabase. Antes de usar migraciones CLI en este proyecto hay que reconciliar ese historial; no volver a ejecutar a ciegas los CREATE TABLE sobre las tablas ya existentes.
Las cuentas de los conectores siguen sin autorización para este proyecto; se usó exclusivamente la sesión nueva del navegador.

## Activación autorizada de ubicación — 27/10/2026

Se aplicó únicamente `20261027154041_uzta_public_producer_location.sql` desde el SQL Editor del proyecto confirmado de UZTA. Añade dos campos públicos aproximados, ambos opcionales, y tres restricciones de coherencia/rango. No modifica RLS ni datos de productos/pedidos. Verificación: 1 productor, 1 producto, 1 pedido, stock 9, 0 puntos asignados, RLS activa y 3 políticas de productores conservadas. El propietario colocará su punto desde el mapa; no se asigna una localización inventada.

La operación fue manual y el historial de migraciones aún debe conciliarse antes de usar un envío automático. No volver a aplicar esta migración sin comprobar el esquema. Durante la verificación, el editor conservó una sentencia anterior y una repetición fue rechazada por columna existente; se vació el editor y la consulta posterior de solo lectura confirmó el resultado correcto y los registros conservados.
