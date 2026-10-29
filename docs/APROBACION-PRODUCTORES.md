# Aprobación de productores

Migración aplicada con autorización expresa el 29/10/2026 en Supabase de UZTA. Activación preparada para publicación.

- Comprador por defecto: solicitud desde Perfil; pendiente, rechazada (permite volver a solicitar), aprobada o revocada.
- Productor: aprobación registrada por servidor, nunca por metadatos editables. Solo gestiona recursos propios. El panel conserva su diseño.
- Administrador: se reutiliza la lista privada de administradores existente. Aprobar no concede administración; ser administrador tampoco concede producción.
- Una tabla de solicitudes, dos operaciones de servidor y controles restrictivos complementan los permisos existentes de tiendas, productos, recogidas, pedidos y almacenamiento.
- La revocación conserva registros y bloquea nueva gestión y reservas. Las ofertas dejan de ser públicas. Los enlaces de imágenes ya firmados pueden durar hasta 900 segundos.
- Estado en Perfil con actualización manual o al recuperar foco; no se reutilizan avisos de pedidos porque requieren una reserva asociada.

## Compatibilidad y activación

Consulta de producción de solo lectura: 2 propietarios productores, 2 tiendas, 1 administrador, 2 productos y 1 pedido. La migración reconoce a los propietarios existentes como aprobados sin editar sus recursos ni pedidos.

Se aplicó únicamente `20261029030000_producer_approval.sql` en `abgysktjctrxfkcejjwu`, dentro de una transacción con bloqueo breve de propietarios durante la adaptación. Se notificó la recarga del esquema de la API. No se ejecutaron migraciones históricas; cancelaciones sigue pendiente.

Resultado: 2 productores existentes aprobados, 2 tiendas, 2 productos, 1 pedido y 1 administrador. Productos y pedidos conservaron sus huellas exactas. La huella de tiendas difería respecto a la consulta previa: se comprobó mediante `xmin` que ambas tiendas se habían escrito antes de la transacción de migración; esta no actualiza ni elimina tiendas. Ningún propietario quedó sin acceso.

## Comprobaciones

31 escenarios de seguridad sobre PostgreSQL aislado (PGlite), más pruebas de interfaz y proveedor real. Los guiones antiguos conservan sus escenarios de compatibilidad excluyendo esta migración; el guion específico `test-producer-approval.mjs` sí la aplica y verifica. Verificación adicional en la base de datos real con roles authenticated/anon y claims de propietario/administrador: RPC de acceso, lectura de solicitudes por propietario y administración, catálogo público y denegación de escrituras directas. Todas sin modificar registros. Las subidas nuevas de imágenes y el envío de solicitudes con cuentas reales no se han simulado en producción. No se han creado registros de prueba en producción.
