# Auditoría de UZTA — 27 de octubre de 2026

## Dictamen y alcance

La base existente se conserva: React, TanStack Router, Vite, Tailwind/CSS, validación Zod, proveedor de demostración separado del proveedor Supabase y mapa Leaflet cargado bajo demanda. No se reconstruye la aplicación.

Se revisó el repositorio local, contrastado con `uztaapp/Uzta` en GitHub (`main`, referencia inicial `8cd9d3a`), las seis pantallas locales a 390 × 844 px, el acceso público de la aplicación publicada y los componentes de mapa de la copia saneada de TRUKA. La comparación visual usa `public/images/uzta-reference.png`, las capturas locales y el mapa público de TRUKA consultado en el bloque anterior. Nunca se conectan los datos de ambas aplicaciones.

**La versión publicada no está sincronizada con GitHub.** En la comprobación anónima, `/explorar` muestra «Página no encontrada» y la navegación todavía contiene «Productor». El Inicio público tiene el catálogo real y un producto identificado como prueba de Granja Martinez; no se ha creado ni eliminado ningún registro durante la auditoría.

Esta revisión no certifica la configuración activa de Supabase: no se accedió al panel, no se usaron credenciales privilegiadas ni se repitió un recorrido real con dos cuentas. Las comprobaciones de seguridad de base se ejecutan en PostgreSQL en memoria. No se han realizado reservas reales, envíos, despliegues o cambios de esquema/permisos.

## Problemas reproducidos y corregidos

| Prioridad | Problema y reproducción | Corrección acotada | Evidencia |
|---|---|---|---|
| P2 | Cesta con cantidad 10 y stock reducido a 3: «menos» intentaba pasar a 9, pero la comprobación de stock lo rechazaba. También rechazaba reducir un producto retirado. | Permitir reducir la cantidad existente aunque siga superando el stock o el producto esté retirado. Los incrementos y la confirmación mantienen sus restricciones. Aplicado al modo local y al carrito de cuenta real, sin modificar inventario ni SQL. | Cuatro regresiones nuevas, reproducidas antes del cambio y aprobadas después. |
| P2 | Una foto retirada con `photo: null` reaparecía en los pedidos locales porque la miniatura volvía al recorte antiguo de maqueta. | Respetar la retirada explícita y mostrar el marcador neutro. No altera las líneas, cantidades o precios históricos del pedido. | Regresión de pantalla: «Sin foto: Tomates». |
| P2 | Con ubicación seleccionada, cada cambio de resultados ejecutaba `fitBounds` y restablecía el encuadre/zoom del mapa. | Separar el centrado por ubicación/radio del ajuste inicial de resultados. Cambiar búsqueda o categoría conserva la navegación del usuario. | Prueba del componente real con Leaflet simulado: cambiar resultados no vuelve a centrar; cambiar radio sí. |
| P3 | README describía la web pública como una demostración anterior sin conexión real, contradiciendo el catálogo público comprobado. | Actualizar el estado y enlazar esta auditoría; conservar la documentación histórica como tal. | Comparación navegador/README. |

## Revisión de las seis pantallas y del diseño

No se afirma coincidencia píxel a píxel. El prototipo incluye marcos de teléfono, barra de estado y ejemplos ilustrativos que no deben añadirse como datos reales a producción. Las seis vistas se inspeccionaron a 390 px sin desbordamiento horizontal; las cinco pantallas mantienen la paleta crema/oliva, imágenes y jerarquía aprobadas.

| Pantalla | Verificado | Diferencias o limitaciones reales |
|---|---|---|
| Inicio | Cabecera y logo, ubicación, buscador, categorías, dos columnas, favoritos, productores y navegación. Los filtros siguen usando los datos existentes. | El número de tarjetas depende del catálogo; el productor destacado puede quedar más abajo que en la imagen. Categorías usan emojis, no las ilustraciones exactas. La foto real depende de los datos disponibles. |
| Productor | Portada de 240 px, avatar de 90 px, información, pestañas y productos de 65 px con stock y botón de cesta. Se conservan horarios y enlace a ubicación aproximada. | Portada/avatar reales y favoritos de productores pendientes. Valoración y reseñas ilustrativas solo en demostración, identificadas como tales. No hay reseñas reales integradas. |
| Cesta | Imágenes de 75 px, cantidades, importes en céntimos, eliminar, mensaje y selección de recogida. Una sola explotación por reserva; se rechaza mezclar productores. | Conserva navegación inferior y nombre del productor, ausentes en la tercera referencia. La confirmación queda accesible al desplazarse; no existe pasarela de pago. Corregido bloqueo de reducción de cantidades. |
| Mis pedidos | Compras y recibidos, etiquetas Pendiente/Completado, miniaturas, importes, fecha de creación en tarjeta y recogida en detalle. Conserva la acción de recogida del productor. | Cancelado no existe en el esquema actual; no se simula. No se cargan nombres/contactos adicionales de compradores. Miniatura retirada corregida. |
| Mi perfil | Datos actuales, edición, ubicación, selector es/eu/fr/en, herramientas de la tienda gestionada y acceso a crear tienda, ayuda, condiciones y cierre de sesión. | La ubicación guardada no es un sistema completo de direcciones de entrega. Avatar real no está integrado. Traducciones detalladas y textos nuevos de Explorar siguen incompletos. |
| Explorar | Leaflet/OpenStreetMap, zoom, puntos públicos redondeados, agrupación, tarjeta cerrable, búsqueda de catálogo, categorías, zona/radio y lista común. Sin punto público se mantiene acceso por lista; no se inventan ubicaciones. | La nube aún necesita activar/publicar coordenadas. Clasificación profesional/particular y certificación ecológica no existen en datos: filtros desactivados. Búsqueda por localidad del catálogo, sin geocodificador global. No copia las animaciones de marcadores de TRUKA. Corregido recentrado al filtrar. |

Evidencias locales: `outputs/auditoria-inicio-390.png`, `auditoria-productor-390.png`, `auditoria-cesta-390.png`, `auditoria-pedidos-390.png`, `auditoria-perfil-390.png` y `auditoria-explorar-390.png`, respecto al directorio del trabajo. Las capturas muestran exclusivamente la demostración local identificada, no una prueba autenticada de producción.

## Repositorio, componentes y navegación

- Dependencias fijadas con lockfile. React 19, Vite 8, TanStack Router, Zod 4, supabase-js y Leaflet 1.9.4. No se actualizaron versiones sin necesidad.
- Seis rutas principales más gestión por `apartado`. `/productor?tienda=…` conserva los enlaces públicos existentes; `/explorar` es el destino propio de navegación del mapa.
- `Photo`, `Modal`, formularios, selector de idioma y contexto evitan repetir mecanismos. Los estilos por pantalla están acotados mediante clases propias y `:has()`.
- Hay repetición de colores, acabados de navegación y controles entre CSS de pantallas. No se consolida en esta auditoría: es deuda de mantenimiento, no un fallo funcional demostrado que justifique alterar todas las vistas.
- Los adaptadores `server/` tienen pruebas y restricciones propias, pero la aplicación desplegada usa `cloud-client.ts`/SDK directamente. Su existencia no implica que haya un servidor Node desplegado.
- Documentos anteriores contienen estados históricos; esta auditoría y el README actualizado prevalecen para el estado comprobado actual.

## Autenticación, datos y seguridad

- Se inspeccionó la separación de demostración, carrito por identidad y sesión de UZTA. El cliente comprueba el proyecto permitido y usa clave publicable; no se añadieron secretos al código.
- La sesión recuperada se verifica mediante Auth antes de lecturas privadas; se revisaron guardas frente a respuestas tardías y cambio de cuenta. Hay pruebas de fallos de sesión, guardado y cierre de sesión. No se cerró la sesión real del usuario durante esta auditoría.
- Las siete tablas del núcleo tienen RLS y permisos explícitos. Las políticas acotan perfil, favoritos, productos propios y pedidos del comprador/productor. La reserva calcula precios en servidor, bloquea inventario de forma ordenada y usa identificador idempotente; la recogida se comprueba en servidor.
- Fotos: bucket privado, objetos sin sobrescritura/borrado desde la app, validación de propietario/ruta y referencias publicadas. La activación real sigue pendiente. URLs firmadas ya emitidas tienen caducidad; retirar una foto no revoca instantáneamente una URL emitida. La limpieza de objetos retirados sigue pendiente.
- La posición de búsqueda del mapa permanece en memoria. La cartografía externa recibe solicitudes de teselas de la zona visualizada; las posiciones públicas se redondean a dos decimales. No se deduce una dirección privada del nombre o localidad.
- Recuperación de contraseña, aceptación legal definitiva y eliminación de cuenta no están integradas. No se inventaron procedimientos ni se modificaron políticas para hacer pasar pruebas.
- Referencia técnica consultada: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Se intentó leer el índice de changelog, pero la herramienta rechazó su tipo Markdown; no se cambió ninguna API o función de Supabase basándose en información no verificada.

## Rendimiento y compatibilidad

- Producción compila sin advertencia de tamaño de fragmentos: paquete principal ~492 kB sin comprimir; SDK de nube ~230 kB y mapa ~151 kB en fragmentos separados. Todavía no es una medida de tiempo de carga en un teléfono lento.
- Agrupación probada con 10.000 entradas; no equivale a una prueba de carga del servicio real. Solo se crean marcadores de puntos dentro del área visible ampliada y se limita la expansión de grupos grandes.
- Riesgo de crecimiento: lecturas de catálogo/pedidos sin paginación explícita; dependen de los límites de la API. No se demostró truncamiento en el catálogo real actual, por lo que no se cambió la consulta durante esta auditoría.
- Revisión en navegador a 390 × 844 px y escritorio adaptable. No se ha certificado en dispositivos físicos Android/iOS, lectores de pantalla, redes móviles lentas ni con concurrencia real multicuenta.
- Las barras usan zonas seguras CSS. Las pestañas internas tienen roles accesibles, pero todavía conviene revisar navegación por flechas de teclado; no se hizo una certificación WCAG integral.

## Resultado de comprobaciones

| Comprobación | Resultado |
|---|---|
| Pruebas de aplicación | 87 aprobadas, incluidas 6 regresiones nuevas de esta auditoría |
| PostgreSQL en memoria | 33 aprobadas: permisos, aislamiento, reservas, rollback, fotos y coordenadas |
| Adaptadores locales/nube | 16 aprobadas |
| TypeScript y compilación Vite | Correctos |
| Separación de cuentas/proyectos | Correcta en configuración y comprobación automatizada |
| Dependencias de producción (`npm audit --omit=dev`) | 0 vulnerabilidades conocidas devueltas por el registro al ejecutar la auditoría |
| Navegador local | Seis pantallas revisadas a 390 px; sin desbordamiento horizontal |
| Publicación actual | Desactualizada; `/explorar` no está disponible |

Los 33 ensayos de base simulan roles en PostgreSQL en memoria. No validan por sí mismos PostgREST, Storage, Auth y políticas activas de la instalación real de Supabase; tampoco certifican carreras entre clientes reales.

## Pendientes por orden de impacto

1. Publicar una versión de Vercel correspondiente a la rama `main` verificada. No basta con pulsar redeploy si la fuente sigue siendo una carga antigua sin Git conectado.
2. Conciliar el historial de migraciones aplicado manualmente antes de activar fotos y coordenadas públicas en la base propia de UZTA; verificar después con dos cuentas y un visitante anónimo. No ejecutar un envío indiscriminado de migraciones.
3. Definir clasificación de vendedor, validación ecológica y consentimiento de ubicación antes de habilitar esos filtros. Integrar fotos reales y reseñas sin sustituirlas por ejemplos.
4. Completar traducciones, recuperación de cuenta y condiciones legales; decidir paginación del catálogo al crecer y limpieza de fotos retiradas.

Las correcciones quedan en el código y en GitHub. Nada de lo anterior se ha desplegado ni ha cambiado TRUKA o la base de datos real durante esta auditoría.
