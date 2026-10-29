# Auditoría selectiva previa a Lurrama — 29/10/2026

Rama: `fix/lurrama-functional-stability`. Producción sin modificar. Sin migraciones nuevas.

## Encontrado y corregido
- Importante: cesta de visitante ausente tras iniciar sesión. Se recupera únicamente tras verificar la identidad, si la cuenta no tiene una cesta guardada ni una reserva pendiente de respuesta. No se fusionan tiendas ni se sobrescribe una cesta existente. La selección visitante deja de compartirse después del traspaso. Datos ilegibles se conservan y no bloquean el acceso; respuestas de una sesión antigua no traspasan la cesta.
- Menor: la información pública del productor decía que portada, avatar y favoritos seguían pendientes de integración. Retirado el aviso obsoleto.
- Verificación: el guion integral no reconocía el nuevo RPC de aprobación. Ahora utiliza el esquema actual y el recorrido de solicitud y aprobación antes de crear la tienda.

## Comprobado
- 76 pruebas esenciales de aplicación (71 existentes y 5 regresiones nuevas): sesiones, permisos de interfaz, datos, stock, cesta y formularios.
- PostgreSQL desechable: 31 controles de aprobación/RLS; 38 comprobaciones integrales con adaptador real para profesionales y particulares; 11 de disponibilidad; 12 de avatar/RLS.
- Recorrido integral: solicitud/aprobación, tienda, categoría Pan, creación/edición/retirada de producto, mapa, reserva, visibilidad de ambas partes, recogida, duplicados y cancelación aislada. La cancelación usa su migración pendiente solo en la base de pruebas.
- Fotos: pruebas de referencias y errores de subida en el proveedor; lectura real de portada, avatar y producto públicos cargada correctamente. No se subieron fotografías de prueba a producción.
- Navegador en producción, solo lectura: carga del catálogo/productor y sesión propia después de recarga; cabecera de 172 px, un logo, sin campana interna ni desbordamiento a 390 px. Sin errores de consola en las páginas inspeccionadas.
- Compilación y TypeScript correctos. Se mantienen avisos existentes de tamaño del paquete.

## Pendiente antes del uso completo
- Importante: `cancellationsReady=false` en producción. La migración preparada `20261028212455_atomic_reservation_cancellation.sql` no está aplicada. Requiere revisión y autorización específica; no se activa durante esta auditoría.
- No verificado con cuentas nuevas reales: registro y confirmación de correo, nuevo inicio Google, aprobación de una solicitud recién creada y subida desde cámara/galería en Android físico. Las comprobaciones aisladas no sustituyen estos pasos.
- No se hicieron reservas ni se editaron productos reales. La conservación de una cesta de cuenta preexistente tiene prioridad sobre la cesta visitante; no se mezclan selecciones.
- Publicación de estas correcciones pendiente de autorización para este encargo.

## Estado
Apta para una demostración guiada de catálogo, panel y reservas probadas en entorno aislado. No certificar todavía el ciclo completo en producción: falta cerrar las cancelaciones y la prueba manual de alta, foto y reserva entre dos cuentas autorizadas.
