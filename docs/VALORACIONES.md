# Valoraciones de vendedores — 28/10/2026

Rama local: `feature/seller-reviews`. Sin publicación ni cambios de datos en producción.

- Formulario en el detalle de reservas completadas del comprador: 1–5 estrellas, comentario opcional de 300 caracteres, una valoración por reserva. No se permite editar ni borrar desde el cliente.
- Validación en PostgreSQL de sesión, comprador, estado completado y vendedor distinto; bloqueo de la reserva durante la escritura y restricción única contra duplicados concurrentes.
- Perfil: media y número total, últimos 10 comentarios no ocultos, estado vacío y error diferenciados. Tarjetas de mapa/lista reutilizan la misma media; Leaflet y filtros no cambian.
- Lectura pública sin comprador, correo ni referencia de reserva. Comentarios tratados como texto por React, sin HTML ejecutable.
- Moderación: el administrador de Supabase puede cambiar únicamente `comment_hidden=true` para ocultar un comentario. No se añade un rol administrador a usuarios ni se usa user_metadata para permisos. La puntuación permanece en la media; ocultar un comentario no borra una valoración.
- Cuatro idiomas. Sin dependencias nuevas, polling ni Realtime.

## Activación pendiente de autorización

1. Esquema real verificado en el SQL Editor de **UZTA / abgysktjctrxfkcejjwu**: 0 tablas de valoraciones existentes. El conector no tiene permiso; la consulta del navegador fue solo lectura.
2. Aplicar exclusivamente `supabase/migrations/20261028172648_seller_reviews.sql`, tras autorización. No ejecutar migraciones históricas.
3. Verificar RLS/RPC con cuentas separadas, habilitar `reviewsReady` en la configuración pública y crear una vista previa antes de autorizar la publicación.
4. Reversión preparada en `supabase/rollback-seller-reviews.sql`. Mantener el indicador desactivado primero; si existen valoraciones, exportarlas antes de revertir porque se eliminaría esa tabla.

## Verificación

- 20 pruebas de interfaz y reservas; 15 comprobaciones específicas PostgreSQL; 40 comprobaciones existentes de base de datos, incluida compatibilidad de todas las migraciones.
- TypeScript y compilación correctos. Aviso no bloqueante del tamaño del paquete principal ya existente.
- Comprobación local aislada a 390 px: ancho del formulario 350 px, sin desbordamiento horizontal, selección y guardado correctos. Sin datos enviados a Supabase; archivos y servidor temporales retirados.
- Pendiente: prueba integrada con Supabase real después de autorizar la migración. No se han creado reseñas ficticias en producción.
