# Almacenamiento propio de fotografías

## Código preparado en local

Se reutiliza el procesado de fotografías recuperado de TRUKA, con almacenamiento y permisos nuevos para UZTA. El flujo preparado es: seleccionar → procesar a WebP → subir con un nombre aleatorio nuevo → guardar la referencia del archivo en el producto → solicitar enlace temporal para mostrarlo. La imagen original, el data URL y el enlace firmado no se guardan en la fila del producto.

La migración `20261027152953_uzta_product_photos.sql`, generada con el CLI instalado, añade `photo_path`, el bucket privado `uzta-product-photos`, políticas RLS y validación de referencias. No cambia buckets existentes que tengan otra configuración: aborta si el bucket de ese nombre no es privado, no tiene límite de 500 kB o no está limitado a WebP. Exige que Storage ya tenga RLS activo.

Las rutas incluyen cuenta, productor, producto y un UUID aleatorio. Solo el propietario del productor puede subir. Una referencia guardada debe corresponder a un objeto existente del mismo producto. Las fotos de productos activos de productores activos pueden obtener un enlace de lectura; fotos ocultas y archivos todavía no asociados permanecen accesibles solo al propietario. Los enlaces se emiten con 15 minutos de validez. Un enlace ya emitido puede seguir funcionando hasta caducar aunque se oculte el producto: no se promete revocación instantánea.

No hay sobreescritura ni borrado de archivos desde el cliente. Sustituir crea otro archivo y retirar la foto vacía la referencia del producto. Las versiones anteriores y subidas sin referencia se conservan privadas para evitar pérdidas tras respuestas de red ambiguas; consumen almacenamiento. Queda pendiente una limpieza controlada de archivos sin referencia. No se ha copiado ninguna tarea de borrado de TRUKA.

## Manejo de errores

- Una subida fallida impide guardar metadatos del producto; no se anuncia éxito.
- Un fallo posterior al subir puede dejar un archivo privado sin referencia; no se elimina a ciegas por si la escritura se confirmó sin respuesta.
- Los fallos de firma o enlaces de otros dominios degradan a un marcador neutro, manteniendo el catálogo visible.
- Los enlaces firmados se validan contra el único dominio autorizado de UZTA y su bucket. No se comparten mediante el botón de compartir tienda.
- Las instalaciones con el esquema anterior siguen leyendo el catálogo: los campos de fotografía son opcionales y no se llama a Storage si no hay referencias.

## Activación pendiente

`config/uzta-cloud.public.json` conserva `productPhotosReady: false`. La interfaz real sigue informando de que la carga no está activada; la demostración conserva su editor local completo. No se ha aplicado esta migración en la nube ni se ha creado el bucket real.

Antes de activarlo:

1. Verificar de nuevo el proyecto UZTA `abgysktjctrxfkcejjwu` y reconciliar las migraciones anteriores aplicadas manualmente. No lanzar `db push` a ciegas.
2. Aplicar la migración en una transacción en UZTA y comprobar bucket privado, políticas y columnas. No usar conectores de otras cuentas.
3. Probar con una sesión real de productor y otra de comprador, incluyendo una foto oculta, un fallo de subida y una sustitución. Revisar los asesores de seguridad.
4. Cambiar la bandera propia a `true` solo después de verificar el servicio. Agrupar con los demás cambios para una publicación posterior.

## Validación realizada

67 pruebas de aplicación, 30 comprobaciones PostgreSQL y 16 de adaptadores correctas. TypeScript, compilación y aislamiento correctos. PostgreSQL es desechable en memoria y usa una réplica mínima de los metadatos de Storage; no equivale a haber probado el servicio HTTP real ni sus límites binarios. Las pruebas de SDK usan transporte simulado. No se crearon usuarios, fotos o pedidos de prueba en la nube.
