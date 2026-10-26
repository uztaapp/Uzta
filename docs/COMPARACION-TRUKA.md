# Comparación de mejoras: TRUKA → UZTA

Revisión en modo lectura autorizada por el usuario. Referencia local saneada de `SkaCristian/reusa5`, rama `feature/home-rescue-card`, commit `9be8d847dfe51044219563acb6a57ea847a01b88`. Se comprobó que la rama existe mediante GitHub y se leyó su `roadmap.md` actual, coincidente con la copia. No se afirma haber auditado todos los cambios remotos posteriores a ese commit. No se ejecutó TRUKA ni se accedió a sus cuentas, bases, credenciales o despliegues.

Se inspeccionaron rutas, bibliotecas y documentación. Tener código o una casilla marcada en TRUKA no demuestra que su producción esté verificada: el propio roadmap deja pendientes recorridos autenticados. Esta tabla distingue la existencia de la mejora en las fuentes de su implementación real en UZTA.

| Mejora encontrada | Referencia en TRUKA | Situación de UZTA |
|---|---|---|
| Español, francés, inglés y euskera; selección manual/automática | `src/lib/i18n`, `docs/language-selection.md` | Pendiente. UZTA solo tiene español; el selector informa de ello. No se copian traducciones de objetos e intercambios a textos agrícolas sin adaptación. |
| Fotos optimizadas, miniaturas y eliminación de EXIF/GPS | `src/lib/image-optimize.ts` | Pendiente de integrar carga, almacenamiento propio y permisos. UZTA usa imágenes de maqueta o marcadores neutros. |
| Ampliación de fotografías | `src/components/image-lightbox.tsx` | Pendiente; no se presenta como implementada. |
| Compartir enlace público y alternativa de copia | `src/components/share-publication.tsx` | Adaptado en local para tiendas reales. Destino fijo UZTA; no incluye parámetros de sesión o vistas previas. Cancelar el menú no dispara otra acción. No se envían mensajes automáticamente. |
| Ayuda y guía inicial | `src/components/first-visit-guide.tsx`, `docs/first-visit-guide.md` | Guía comprador/productor adaptada en local, accesible desde Ayuda y soporte. No hay todavía recorrido interactivo de primera visita. |
| Recuperación ante errores de pantalla | `src/routes/__root.tsx` | Protección de pantalla añadida en local, con reintento y navegación conservando datos. Sin telemetría externa. |
| Registro, sesión y perfil | `src/lib/auth-validation.ts`, `src/routes/auth.tsx` | UZTA tiene registro confirmado y perfil real; recuperación de sesión y fallos de cierre probados. Recuperación de contraseña y cambio de correo siguen pendientes. |
| Favoritos persistentes con error de guardado honesto | `src/lib/favorites.ts`, `docs/auditoria-2026-10-13.md` | Ya implementado con datos propios en UZTA, separado por cuenta. |
| Mapas, radios, agrupación de puntos y privacidad de ubicación | `src/lib/map-items.ts`, `docs/mapa-util.md` | Pendiente de adaptación. UZTA no calcula distancias reales; las distancias ficticias solo se muestran en demostración. |
| Ubicación confirmada al publicar | `src/lib/publication-location.ts`, commit de referencia | Pendiente: UZTA guarda localidad escrita, no un punto confirmado. |
| Chat y coordinación privada de recogida | `src/routes/chats.tsx`, `chat.$id.tsx` | Pendiente. El mensaje de reserva de UZTA no es un chat. |
| Búsquedas guardadas, alertas y contador de no vistos | `src/lib/alerts.ts`, `docs/alertas-fiables.md` | Pendiente. No hay push, campana ni alertas implementadas en UZTA. |
| Recogidas conjuntas y reglas transaccionales | `docs/compartir-y-recogidas.md` | Adaptación parcial: cesta de un productor, reserva atómica, stock y reintentos ya implementados; cancelaciones y acuerdos privados no están. |
| Perfil público de confianza y distintivos | `src/lib/public-profile.ts`, `docs/perfil-confianza.md` | Pendiente. Perfil personal y ficha de tienda de UZTA no equivalen al sistema de confianza. No se inventan contribuciones. |
| Moderación y administración | `src/routes/moderacion.tsx`, `admin.tsx`, `docs/truka-admin.md` | Pendiente de diseñar permisos propios de UZTA; jamás reutilizar propietarios o roles del otro proyecto. |
| Bloqueos y denuncias | `src/lib/moderation.ts` | Pendiente de adaptar al acceso a tiendas y reservas. |
| Solicitud de eliminación de cuenta y aceptación legal | `src/routes/eliminar-cuenta.tsx`, `src/lib/legal-acceptance.ts` | Pendiente. La información provisional de UZTA no sustituye condiciones legales revisadas ni un flujo de eliminación. |
| Limpieza de fotos retiradas | `src/lib/photo-cleanup.server.ts`, documentación de limpieza | Pendiente, junto con fotografías. No trasladar tareas programadas o reglas de borrado ajenas. |
| Historial y estados de publicaciones | Rutas de perfil, edición y biblioteca de datos | UZTA tiene productos publicados/ocultos, stock, pedidos y recogidas. Revisar el resto de estados al ampliar las reservas. |
| Rescatar objetos de la calle, préstamos de barrio, microfavores, regalos e intercambios | `rescatar.tsx`, `prestamos.tsx`, bibliotecas de rescates/préstamos/favores | No se trasladan: son funcionalidades de otro producto y no forman parte de las cinco pantallas agrícolas aprobadas. |
| Reconocimiento de objetos y traducción automática de anuncios | Bibliotecas de reconocimiento y traducción | No se activa sin alcance explícito: cambia el producto y puede requerir servicios y costes externos. |

## Orden de recuperación

1. Compartir, ayuda y recuperación: adaptados en este bloque, en local.
2. Fotografías completas: procesamiento, vista previa, almacenamiento propio, permisos, sustitución y manejo de fallos. No dar por terminada la función con un botón de subida aislado.
3. Idiomas de las cinco pantallas y formularios, con claves de negocio estables y conservación del contenido del usuario.
4. Ubicación y descubrimiento: no pedir permisos automáticamente ni fabricar distancias reales.
5. Comunicación, alertas, confianza, administración y cuenta/legal: requieren contratos y permisos propios y validación de extremo a extremo.

## Evidencia del primer bloque

46 pruebas de aplicación correctas, TypeScript y compilación correctos; aislamiento correcto. Pruebas nuevas de enlace fijo y rechazo de IDs ficticios, copia fallida, cancelación del menú nativo, separación de ejemplos, recuperación de pantalla sin borrar almacenamiento y guía adaptada. Revisión en navegador local de ayuda y del aviso al compartir una tienda ficticia; sin errores de consola observados. Menú nativo real y portapapeles se probaron con simulación, sin enviar mensajes.

Trabajo agrupado en local. No se han hecho publicaciones en Vercel ni cambios de datos en Supabase durante esta comparación.
