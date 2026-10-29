# Aprobación de productores

Preparada en `feature/producer-approval`; sin activar ni aplicar en producción.

- Comprador por defecto: solicitud desde Perfil; pendiente, rechazada (permite volver a solicitar), aprobada o revocada.
- Productor: aprobación registrada por servidor, nunca por metadatos editables. Solo gestiona recursos propios. El panel conserva su diseño.
- Administrador: se reutiliza la lista privada de administradores existente. Aprobar no concede administración; ser administrador tampoco concede producción.
- Una tabla de solicitudes, dos operaciones de servidor y controles restrictivos complementan los permisos existentes de tiendas, productos, recogidas, pedidos y almacenamiento.
- La revocación conserva registros y bloquea nueva gestión y reservas. Las ofertas dejan de ser públicas. Los enlaces de imágenes ya firmados pueden durar hasta 900 segundos.
- Estado en Perfil con actualización manual o al recuperar foco; no se reutilizan avisos de pedidos porque requieren una reserva asociada.

## Compatibilidad y activación pendiente

Consulta de producción de solo lectura: 2 propietarios productores, 2 tiendas, 1 administrador, 2 productos y 1 pedido. La migración reconoce a los propietarios existentes como aprobados sin editar sus recursos ni pedidos.

Tras autorización: volver a comprobar propietarios y cuentas administrativas; aplicar **solo** `20261029030000_producer_approval.sql` en `abgysktjctrxfkcejjwu`, comprobar permisos y conservación de datos, activar `producerApprovalsReady` y preparar publicación autorizada. No ejecutar migraciones históricas en lote (la de cancelación sigue pendiente). Hasta entonces el formulario permite preparar una solicitud pero no enviarla.

## Comprobaciones

31 escenarios de seguridad sobre PostgreSQL aislado (PGlite), más pruebas de interfaz y proveedor real. Los guiones antiguos conservan sus escenarios de compatibilidad excluyendo esta migración; el guion específico `test-producer-approval.mjs` sí la aplica y verifica. La comprobación final con sesiones y almacenamiento de Supabase real queda pendiente de la activación autorizada. No se han creado registros de prueba en producción.
