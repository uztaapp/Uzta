# Fotografías e idiomas · 27/10/2026

## Fotografías locales

El editor de productos de la demostración permite seleccionar JPG, PNG o WebP, previsualizar, sustituir y retirar una fotografía. Se procesa mediante canvas a WebP, con reducción de dimensiones, límite de 500 kB y sin copiar metadatos EXIF/GPS. El producto mantiene el contenido previo hasta pulsar Guardar producto; cerrar el diálogo cancela la edición. El contenido se valida y conserva en el almacenamiento separado de la demostración.

La imagen guardada se muestra en inicio, tienda, cesta y gestión. Los datos antiguos siguen siendo compatibles. Los formatos no admitidos se rechazan, una imagen fallida tiene marcador neutro y las respuestas tardías del procesado se descartan al cerrar el editor. No se han copiado fotografías a los snapshots históricos de pedidos, evitando duplicar imágenes grandes en cada reserva.

Prueba de navegador: se seleccionó la imagen local de referencia únicamente como archivo técnico. Se verificó WebP decodificado de 1080 × 720 px en la vista previa y después se cerró sin guardar para conservar el producto original. Las pruebas automatizadas cubren persistencia del campo, retirada, error de procesado y cierre con operación pendiente. El guardado real en Supabase Storage no está conectado ni configurado; la interfaz de cuenta real lo indica y no muestra un botón ficticio de subida.

## Idiomas

Se implementó una preferencia propia `uzta.language.v1`, independiente de la cuenta y de sus datos de negocio. Admite español, francés, inglés y euskera, además de Automático por orden de idiomas del navegador. El idioma de la página HTML cambia y la elección manual prevalece al volver a abrir la aplicación; los fallos de almacenamiento no bloquean el selector.

El selector está en Perfil → Idioma y también en la pantalla de acceso sin necesidad de iniciar sesión. Se traducen etiquetas comunes de navegación, inicio, categorías, cesta, pedidos, perfil, gestión de productos/horarios, acceso, fotografías, compartir y guía de uso. Los nombres y descripciones escritos por productores no se traducen. Las categorías, IDs de pestañas, unidades y estados enviados a almacenamiento conservan sus valores originales; solo cambia su presentación.

Las traducciones de avisos detallados y algunas etiquetas dinámicas siguen pendientes, así como una revisión lingüística nativa. La interfaz lo advierte. No se afirma que las cuatro versiones estén terminadas. Una prueba francesa verifica que las compras siguen mostrando todos sus pedidos y que la pestaña de productor filtra correctamente sin traducir los identificadores de estado.

## Verificación y límites

59 pruebas de aplicación correctas después del ajuste final del selector. TypeScript, compilación, formato y aislamiento correctos. Se verificó visualmente el cambio a francés conservando el perfil ficticio de Ana García y los datos de las tiendas. Se añadió recuperación de error en la raíz para fallos de carga inicial, sin exponer detalles internos ni borrar datos.

No hubo despliegue en Vercel, migración de base de datos ni escritura en cuentas ajenas. La vista previa local se reinició en 127.0.0.1:5178 después de detectar que su servidor anterior estaba detenido. Quedan almacenamiento real de fotografías, avisos traducidos y los siguientes bloques del inventario de comparación.
