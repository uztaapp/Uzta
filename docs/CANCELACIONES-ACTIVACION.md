# Cancelaciones — activación de UZTA, 29/10/2026

Autorización expresa del propietario: aplicar únicamente la migración de cancelaciones y publicar tras superar seguridad, integridad y concurrencia. TRUKA permanece independiente.

## Comprobaciones superadas

- 37 pruebas SQL aisladas: comprador/propietario/ajeno/anónimo, plazo, duplicados, stock exacto y rollback por desbordamiento, históricos, avisos, importes/Eusko/comisiones y desactivación sin borrar historial.
- 15 comprobaciones adicionales en PostgreSQL **17.10 real**, con conexiones independientes y espera de bloqueo observada: dos cancelaciones; cancelar frente a recoger en ambos órdenes (cuatro repeticiones por caso); cancelación frente a nueva reserva; rechazo atómico de migración duplicada. Stock, estado, avisos y ventas quedan coherentes. Ninguna prueba utiliza registros ni cuentas reales.
- 7 pruebas específicas de interfaz/proveedor, incluido el instante UTC y la hora repetida de otoño. TypeScript y compilación superados.
- Producción comprobada: PostgreSQL 17.11. Antes faltaban RPC y columnas; el estado admitía Pendiente/Completado. No existe una tabla de historial del CLI; no se ha creado ni se han ejecutado migraciones históricas.

## Recuperación verificada

El panel confirma que el plan gratuito no dispone de copias automáticas. Se exportó una copia local de pedidos, líneas, productos, ventas, restricciones, políticas, triggers y la definición anterior de complete_order, fuera del repositorio, con SHA-256 verificado. Es una copia del alcance afectado, no un respaldo completo de Auth ni Storage.

La migración se ejecutó en una sola transacción con lock_timeout de 5 s y statement_timeout de 30 s. Bloqueos breves y una captura temporal protegida por RLS permitieron comparar todos los históricos, productos, ventas, políticas y triggers antes/después. Todos coincidieron; las nuevas trazas históricas permanecen nulas. El esquema de PostgREST se recargó.

Recuperación funcional ensayada: desactivar cancellationsReady y ejecutar supabase/rollback/disable_reservation_cancellation.sql con autorización operativa. Revoca el RPC, conserva stock/historial y permite confirmar recogidas. No quitar Cancelado ni las columnas tras existir cancelaciones; no restaurar automáticamente la función antigua de completar, que no protege pedidos cancelados. El rollback de una migración fallida se realiza dentro de su transacción.

## Activación y reglas

Migración aplicada: 20261028212455_atomic_reservation_cancellation.sql, únicamente en abgysktjctrxfkcejjwu. Resultado del guard: UZTA_CANCELLATIONS_ACTIVE_HISTORY_STOCK_SALES_RLS_TRIGGERS_UNCHANGED.

El comprador cancela su reserva pendiente antes del inicio de recogida. El propietario vigente puede cancelar una pendiente también después de ese plazo. No se cancelan completadas ni se recogen canceladas. Reintentar no devuelve stock ni genera avisos dos veces. No se realizan pagos ni devoluciones monetarias.

La interfaz existente se habilita con cancellationsReady=true. No se han cancelado reservas reales para probar ni se han alterado diseños o reglas económicas.

Prueba reproducible de concurrencia: instalar embedded-postgres@17.10.0-beta.17 en un directorio de herramientas externo, asignar UZTA_POSTGRES_TEST_RUNTIME a ese directorio y ejecutar node scripts/test-cancellation-concurrency.mjs. Usa un clúster nuevo en 127.0.0.1:54339, contraseña aleatoria, datos ficticios y cierre limpio. No añade dependencias a UZTA.
