# UZTA 1.0 — consolidación (28/10/2026)

Rama: `release/uzta-1-stabilization`. Candidata para prueba controlada; no declarada versión final. Producción, datos y TRUKA permanecen intactos durante este trabajo.

## Inventario único

| Función | Estado en la candidata | Evidencia o límite |
|---|---|---|
| Registro e inicio | Funciona | Email y Google existentes; recuperación añadida, entrega real de correo pendiente |
| Agricultores | Funciona | Corregida creación de primera tienda; recorrido aislado completo |
| Particulares | Funciona | Mismo recorrido; punto público aproximado y permisos existentes |
| Productos | Funciona | Publicación, propiedad, precios y stock comprobados |
| Fotografías | Parcial | Productos implementados; portada/avatar de vendedor pendientes |
| Explorar | Funciona | Leaflet existente; vendedores públicos y lista compartida |
| Búsquedas/filtros | Parcial | Producto, zona, tipo, distancia, disponibilidad y Eusko; acreditación ecológica no implementada |
| Cesta | Funciona | Existencias y un vendedor por reserva |
| Reservas | Funciona | Precio del servidor, transacción e idempotencia |
| Pedidos | Parcial | Recepción/completar funcionan; cancelación preparada, desactivada hasta migración |
| Notificaciones | Parcial | Nueva reserva/registro/completado y lectura; cancelación requiere migración |
| Valoraciones | Funciona | Reserva completada, duplicados y permisos en servidor |
| Favoritos | Funciona | Productos/vendedores, aislamiento por usuario |
| Temporada | Funciona | Disponible/próximamente/agotado, bloqueo en servidor |
| Métodos/Eusko | Funciona | Preferencia informativa, EUR como precio, pago presencial |
| Comisiones | Funciona | 0 %, registro histórico y cobro manual; tarifas positivas bloqueadas |
| Administración | Parcial | Ventas/comisiones; moderación de comentarios disponible por permisos SQL, sin panel específico |
| Traducciones | Parcial | ES/FR/EU/EN existentes y nuevas cadenas traducidas; algunos avisos antiguos siguen en español |

## Cambios concretos

- Primera tienda: se evita acceder al tipo de vendedor antes de que exista su tienda.
- Recuperación de contraseña con respuesta neutral, enlace al origen autorizado y comprobación de la sesión antes de guardar.
- Producto heredado explícitamente de prueba excluido de Inicio, Explorar, perfiles y favoritos públicos mediante sus identificadores conocidos. Se conserva en gestión e historial, sin alterar datos. La tienda reaparece al publicar un producto nuevo real. No se rellena el catálogo vacío.
- Cancelación preparada con confirmación, autorización comprador/vendedor, límite para comprador anterior a recogida, restitución única de stock y bloqueo de pedidos completados. Sin movimientos de dinero. Desactivada en nube hasta autorización.
- Retirado el control deshabilitado de acreditación ecológica; no se inventa verificación.
- Pruebas antiguas actualizadas a las reglas actuales de disponibilidad y etiquetas accesibles.

## Verificación

- 177 pruebas de interfaz/lógica, todas correctas; TypeScript y compilación correctos.
- 32 comprobaciones del adaptador real sobre PostgreSQL desechable: agricultor y particular publican, catálogo/mapa, cesta, reserva, recepción, recogida, importes, stock y reintentos; cancelación, permisos, plazo, última unidad y reversión ante desbordamiento.
- 111 comprobaciones SQL específicas: núcleo/RLS/fotografías 40, avisos 9, valoraciones 15, favoritos 10, disponibilidad 11, comisiones 16 y Eusko 10.
- No se han creado pedidos, productos, correos de recuperación ni cambios de contraseña reales para probar.
- El transporte del ensayo integrado es un adaptador de pruebas local; no sustituye una prueba multiusuario real contra Auth/API/Storage de Supabase ni demuestra concurrencia entre conexiones.
- Compilación conserva avisos de tamaño del paquete e importación dinámica ineficaz; no impiden compilar y no se ha hecho una refactorización general.

## Activación y pendientes

1. Autorizar antes de aplicar `20261028212455_atomic_reservation_cancellation.sql` en el proyecto UZTA. Sin relleno histórico. Reversión en `supabase/rollback-reservation-cancellations.sql`, bloqueada si ya existen cancelaciones.
2. Activar `cancellationsReady` únicamente tras comprobar esa migración; no ejecutar migraciones históricas indiscriminadamente.
3. Propuesta opcional separada fuera del repositorio para retirar el anuncio heredado de prueba en origen. No ejecutada; sus datos e historial no se borran.
4. Validación controlada con dos cuentas y producto genuino autorizado, incluida recuperación de correo; no utilizar producción para inventar ofertas o pedidos.
5. Portada/avatar, revisión de avisos en cuatro idiomas y condiciones comerciales pendientes. No activar tarifas superiores al 0 % sin revisión comercial/fiscal.
6. Vista previa en rama independiente; publicación definitiva requiere autorización. Reutilizados los patrones TRUKA ya documentados (mapa/distancia/fotos/errores), sin volver a copiar ni acceder a sus servicios.
