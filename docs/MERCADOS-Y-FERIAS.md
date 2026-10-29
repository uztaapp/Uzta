# Mercados y ferias — preparado para revisión, 29/10/2026

Rama feature/markets-fairs. **Sin migraciones ni despliegue de esta función en producción.** marketsReady=false; no se simula que el guardado está activo. Una sola interfaz y las reservas existentes, sin segundo carrito ni sistema de entregas.

## A. Base y calendario
- Ruta /mercados desde Inicio, sin añadir pestañas a la barra inferior. Calendario mensual, lista, fichas, filtros y estados de carga/error/vacío separados. Meses históricos consultables; próximos eventos solo desde hoy.
- Reglas semanales con varios días, mensuales (primer/quinto/último día de la semana), fechas únicas o ferias de varios días, vigencias y excepciones de horario/cancelación. Expansión acotada a 93 días; reservas como máximo a 90 días. No se materializan calendarios indefinidos.
- Horarios no confirmados permanecen vacíos y nunca habilitan recogidas. Europe/Paris y Europe/Madrid usan el motor de fechas existente ampliado de forma compatible. Horas repetidas/inexistentes del cambio estacional se rechazan para reservar.

## B. Participaciones y administración
- Panel Mis mercados: búsqueda de un mercado ya registrado, presencia, recurrencias, fechas adicionales, ausencias, actividad agrícola/artesanal y declaración obligatoria de producción propia sin reventa.
- Se reutiliza la aprobación de productores. Declararse artesano no concede ningún privilegio. La declaración no sustituye la comprobación administrativa; el administrador puede desactivar una participación.
- Administración: crear/editar/desactivar, propuestas pendientes, publicación solo con fuente y licencia, excepciones e incidencias de asistencia, control de participantes. Nadie puede aprobar su propia propuesta sin permisos administrativos existentes.
- Guardado de reglas y excepciones mediante RPCs atómicos, con bloqueos en orden consistente. Propuestas reutilizan la tabla de mercados; no duplican personas ni productos.

## C. Mapa y fuentes
- Mismo componente Leaflet/OSM de Explorar, adaptado con el icono de calendario existente. Agrupación, lista alternativa y filtros comunes. Sin punto confirmado, el evento permanece en la lista.
- Catálogo ampliado el 29/10/2026 en `src/data/markets-initial.json`: **99 candidatos de Iparralde, 67 con programación verificable y 32 pendientes**, en 39 localidades. Se conserva aparte Zerkausia (Tolosa), fuera del recuento de Iparralde. 19 fichas verificadas tienen punto OSM; las demás no se colocan artificialmente en el centro de la localidad.
- Cada ficha conserva clave estable, URL principal, fuentes de contraste y de posición, fecha de comprobación, confianza, provincia y motivo de revisión. La confianza es editorial, no una garantía de celebración. Los horarios desconocidos son nulos. Los eventos estivales y puntuales no se repiten en 2027 sin nueva comprobación.
- Directorios usados para descubrir; datos contrastados manualmente con ayuntamientos, oficinas de turismo y organizadores. Etxaldea no se copia en bloque. Las condiciones de Tourisme64 reservan los derechos sobre textos, fotografías y extracciones: no se replica su catálogo ni sus descripciones. Solo hechos breves contrastados y redactados de nuevo; no se presupone que todo SIRTAQUI sea reutilizable bajo licencia abierta. Véase `src/data/markets-initial.LICENSE.md`.
- Importación administrativa de las 67 fichas verificadas mediante la RPC existente, **como propuestas**, sin sobrescribir ni publicar automáticamente. Las 32 restantes quedan en el catálogo de revisión, excluidas del calendario. El archivo versionado conserva confianza y evidencia sin ampliar el esquema. La prueba SQL importa el lote en una base aislada y bloquea una segunda importación por clave.
- Con `marketsReady=false`, exclusivamente en desarrollo y compilaciones Vercel `preview`, la misma pantalla permite revisar en lectura el catálogo real preparado. Aviso explícito: aún no importado a Supabase y sin reservas. No crea vendedores, participaciones ni franjas. Producción conserva el comportamiento desactivado; un error de Supabase nunca selecciona este catálogo.
- Lista: una ficha por mercado con su siguiente fecha; detalle: resto de fechas. Evita cientos de tarjetas repetidas al cargar una base regional. Calendario, lista, filtros y mapa usan las mismas reglas existentes.
- Pendientes destacados: horarios incompatibles de Sokoburu; ubicación actual de Ustaritz; quincenas de Tardets; cierre a medianoche no representable en el motor; temporadas ambiguas de Bidart/Arcangues; fichas navideñas antiguas o inaccesibles. Las Halles provisionales de Bayonne quedan pendientes por excepciones de festivos y punto exacto del traslado.
- Localidades investigadas: Ahaxe-Alciette-Bascassan, Ahetze, Ainhoa, Anglet, Arbonne, Arcangues, Ascain, Bardos, Bassussarry, Bayonne, Biarritz, Bidache, Bidart, Boucau, Cambo-les-Bains, Came, Ciboure, Espelette, Garris, Guéthary, Hasparren, Hendaye, Hélette, Itxassou, La Bastide-Clairence, Lahonce, Mauléon-Licharre, Osserain-Rivareyte, Saint-Étienne-de-Baïgorry, Saint-Jean-de-Luz, Saint-Jean-le-Vieux, Saint-Jean-Pied-de-Port, Saint-Palais, Saint-Pée-sur-Nivelle, Sare, Tardets-Sorholus, Urrugne, Urt y Ustaritz.
## D. Recogidas y seguridad
- La cesta ofrece las presencias reservables del vendedor; la RPC prepara una franja concreta una sola vez, y la reserva usa una envoltura mínima uzta_reserve_market_order que llama a uzta_reserve_order_payment/uzta_reserve_order, con el mismo stock, precios, idempotencia y confirmación de recogida.
- Los clientes antiguos no pueden confirmar franjas de mercado sin el nuevo flujo explícito; las recogidas ordinarias siguen usando su RPC habitual.
- Ampliación mínima de reserve_order para guardar pickup_slot_id. Un trigger valida participación, horario, plazo y mercado en el servidor y guarda una instantánea del lugar. Un cliente antiguo no puede saltarse estas comprobaciones pasando una franja guardada.
- Cambiar asistencia no cancela ni modifica pedidos existentes. El vendedor debe revisarlos y avisar/cancelar individualmente mediante el sistema vigente. **La función de cancelación no se modifica** (comparación exacta probada).
- RLS: lectura pública solo de mercados publicados y participaciones vigentes; propietario solo gestiona su participación; validación administrativa mediante la lista protegida ya existente. No se expone created_by en el API público.

## Archivos y migración
- Cuatro tablas: uzta_markets, uzta_market_rules, uzta_market_exceptions, uzta_market_participations. Se amplían uzta_pickup_slots y uzta_orders con referencias/instantáneas opcionales; históricos no se reescriben.
- Migración preparada: supabase/migrations/20261029190537_markets_and_fairs.sql.
- Pantalla/estilos: src/pages/mercados.*. Formularios: src/components/market-manager.tsx y market-pickup-choices.tsx. Modelo/API/idiomas: src/lib/markets.ts, market-api.ts, market-labels.ts. Se reutilizan mapa, ubicación y panel actuales; cesta/pedidos solo muestran y eligen el nuevo lugar.

## Verificación y activación pendiente
- 71 pruebas de aplicación específicas de calendario, interfaz, adaptador y navegación; 38 comprobaciones SQL/RLS y 9 pruebas con conexiones simultáneas reales. SQL/RLS aislado con datos sintéticos; concurrencia real PostgreSQL 17 con sesiones distintas para preparación duplicada, reserva frente a ausencia/cancelación de mercado y dos vendedores a la vez. Se prueba también la recuperación.
- No se han insertado mercados, vendedores ni pedidos de prueba en producción. El catálogo ampliado está preparado para importación **solo tras revisión**, no publicado automáticamente.
- Antes de activar: revisión final del propietario, respaldo recuperable y copia de la definición vigente de reserve_order; comprobar que coincide con el patrón esperado. Aplicar exclusivamente esta migración dentro de una transacción, nunca un db push de todas las migraciones históricas. La migración se detiene si la función base difiere.
- Después: verificar RLS/privilegios e históricos, activar marketsReady, revisar las propuestas del catálogo y publicar bajo autorización. El formulario permanece deshabilitado en la vista previa mientras falte esa activación.
- Recuperación preparada: desactivar marketsReady y ejecutar supabase/rollback/disable_markets.sql con autorización. Bloquea nuevas recogidas en mercados incluso mediante franjas antiguas; conserva datos, stock y pedidos, que siguen pudiéndose cancelar o marcar recogidos. No borrar tablas ni restaurar automáticamente funciones antiguas después de tener reservas vinculadas.

