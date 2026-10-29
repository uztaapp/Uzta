# Cancelaciones: preparación de activación — 29/10/2026

Estado: **pendiente de comprobación final de concurrencia multisesión antes de autorizar producción**. Sin riesgo destructivo confirmado. No se ha aplicado ninguna migración ni publicado en producción.

## Causa y alcance

`cancellationsReady=false` protege una instalación todavía incompleta. Comprobación de metadatos en Supabase UZTA, solo lectura: no existe `public.uzta_cancel_order(uuid)`, no existen `cancelled_at/cancelled_by` y el estado admite únicamente Pendiente/Completado. Están presentes los tres triggers existentes de avisos, ventas y aprobación.

Único archivo a aplicar: `supabase/migrations/20261028212455_atomic_reservation_cancellation.sql`. Amplía la restricción de estado, añade dos columnas nulas con autor/fecha, crea el RPC privado de cancelación y su envoltorio público invoker, y sustituye `uzta_private.complete_order` para serializar recogida/cancelación. No añade tablas, triggers ni políticas RLS. Reutiliza avisos, control de disponibilidad y ventas existentes. No reescribe reservas, stock, importes o ventas históricas.

## Reglas ya existentes en el código

- Comprador original: cancelar una reserva Pendiente antes del instante exacto de inicio de recogida.
- Productor propietario vigente: cancelar una Pendiente también después de ese inicio. Administrador ajeno no tiene una excepción para cancelar.
- Completado no puede cancelarse; Cancelado no puede marcarse recogido.
- Reintentar una cancelación ya realizada devuelve éxito sin cambiar stock, autor, fecha ni duplicar avisos.
- Actor sin permiso recibe el mismo error que una reserva inexistente. Los clientes no adquieren UPDATE directo sobre pedidos.
- El stock se devuelve en la misma transacción y en orden de UUID. Se conservan los productos retirados o Próximamente; un Agotado con stock restituido vuelve a la disponibilidad que define el trigger actual. Si la restitución supera 100000 unidades, se rechaza toda la operación; no se recorta ni se devuelve stock parcialmente.
- Tras revocación del vendedor, su acción se rechaza por el guard existente; el comprador conserva su derecho dentro del plazo.

## Correcciones y pruebas específicas

- La interfaz reconstruía el plazo desde la hora local: fallaba en la hora duplicada de otoño. Ahora conserva `pickup_starts_at` original en el pedido (`pickup.startsAt`, opcional para compatibilidad), y lo usa para comparar el plazo. No cambia el instante ni la regla del servidor.
- La restricción de trazabilidad exige ambos datos en Cancelado y ninguno en otros estados; impide trazas parciales.
- `node scripts/test-cancellations.mjs`: 37 comprobaciones sobre PostgreSQL aislado, incluidos históricos anteriores a la migración, permisos, doble llamada, stock, fallo en el segundo producto, retirados/temporada, revocación, avisos, importes/Eusko/comisiones y recuperación sin borrar datos.
- Pruebas de interfaz: cuatro escenarios de plazo y detalle. Prueba del proveedor: conserva los dos instantes UTC distintos que corresponden a 02:30 local.

## Concurrencia y limitación pendiente

Cancelación y recogida bloquean primero la misma fila de pedido `FOR UPDATE`. Cancelar bloquea los productos por UUID, igual que reservar. El reintento toma el bloqueo antes de consultar el estado, de modo que no vuelve a restituir stock. No se detecta inversión de bloqueos entre estos recorridos. Los cambios y los triggers se confirman o revierten juntos.

PGlite ejecuta las pruebas con una sola conexión: **no demuestra una carrera real entre dos sesiones**. No hay Docker ni un servidor PostgreSQL multisesión disponible en este entorno. Antes de activar: en una base de pruebas separada, ejecutar dos cancelaciones del mismo pedido, cancelar frente a marcar recogido y cancelar frente a una nueva reserva del mismo producto. Exigir estado único, stock exacto, ausencia de avisos/ventas duplicados y ausencia de bloqueos mutuos. No usar pedidos reales para esta prueba.

## Activación controlada, solo tras autorización expresa

1. Resolver la prueba multisesión anterior. Obtener un respaldo recuperable de producción y la definición anterior de `complete_order`. Este encargo no ha generado un respaldo de producción.
2. Repetir las consultas de metadatos y obtener recuentos/huellas de pedidos, productos y ventas. Revisar que ninguna otra función nueva esté sustituyendo `complete_order`.
3. Con la interfaz aún desactivada, aplicar **únicamente** la migración indicada dentro de una transacción (`BEGIN`, `lock_timeout=5s`, `statement_timeout=30s`, bloqueo breve de pedidos y productos); notificar `pgrst, reload schema` y confirmar. Ante cualquier error, ROLLBACK; no continuar con el flag.
4. Verificar restricciones, privilegios y recuentos/huellas: los únicos campos nuevos de históricos deben ser nulos. Comprobar que las políticas RLS y los triggers existentes permanecen iguales.
5. Activar `cancellationsReady=true` en una rama de publicación autorizada; revisar ambos papeles y publicar con autorización. No ejecutar migraciones históricas en lote.

## Recuperación

Si falla el DDL dentro de la transacción, ROLLBACK restaura el esquema previo. Tras activar, desactivar el flag y, con autorización operativa, ejecutar `supabase/rollback/disable_reservation_cancellation.sql`: revoca el RPC público y privado a clientes; los pedidos, trazas y stock quedan intactos y sigue disponible marcar recogido.

No borrar columnas ni eliminar Cancelado de la restricción después de existir cancelaciones. No restaurar stock ni estados automáticamente. La recuperación funcional conserva las cancelaciones ya confirmadas. Rehabilitar posteriormente requiere autorización y restaurar los dos GRANT de ejecución a authenticated; no cambia datos.

La rama parte de producción y no incorpora las correcciones pendientes de cesta/perfil de `fix/lurrama-functional-stability`. `cancellationsReady` sigue en false también en la vista previa; no hay cancelaciones reales habilitadas.
