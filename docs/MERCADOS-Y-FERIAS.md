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
- Catálogo inicial preparado en src/data/markets-initial.json: dos registros reales obtenidos el 29/10/2026 de la API oficial OSM, atribuidos bajo ODbL 1.0: node/10053931962 (mercado de productores locales, Bayonne) y way/40952683 (Zerkausia, Tolosa).
- Solo se ha normalizado la etiqueta explícita Sa 08:00-13:00 del primer registro. **Tolosa no tiene horario/recurrencia confirmados en esta extracción**: deben completarse tras revisión. El punto de un polígono es el centro de su huella pública; hay que comprobar el acceso antes de publicar.
- Importación desde administración como propuestas; claves de origen y coincidencias de nombre/localidad/posición detectan duplicados. Se conservan URL, licencia, fecha original y fecha de verificación. Nunca se sobrescribe automáticamente un mercado existente.
- Overpass estuvo saturado; se utilizaron dos extractos pequeños de la API principal, sin scraping masivo ni tareas periódicas.
- Datos abiertos de Euskadi: se comprobó el catálogo de recintos feriales (CC BY 4.0), pero un recinto no demuestra que exista una feria con fechas. No se importó como calendario. Integración de agenda oficial pendiente de una fuente de eventos adecuada.
- Ayuntamientos/turismo: referencias verificadas para contraste, sin copiar textos/fotos ni automatizar su extracción cuando las condiciones no autorizan claramente su reutilización comercial. Bayonne cambia las Halles por obras: revisar ubicación/fechas, no asumir el horario del edificio antiguo.

Fuentes: https://www.openstreetmap.org/node/10053931962 · https://www.openstreetmap.org/way/40952683 · https://www.openstreetmap.org/copyright · https://datos.gob.es/es/catalogo/a16003011-recintos-feriales-de-euskadi · https://www.bayonne.fr/informations-pratiques/mentions-legales · https://www.visitbayonne.com/votre-sejour/restauration-saveurs-de-bayonne-et-du-pays-basque/les-halles/

## D. Recogidas y seguridad
- La cesta ofrece las presencias reservables del vendedor; la RPC prepara una franja concreta una sola vez, y la reserva sigue usando uzta_reserve_order_payment/uzta_reserve_order, con el mismo stock, precios, idempotencia y confirmación de recogida.
- Ampliación mínima de reserve_order para guardar pickup_slot_id. Un trigger valida participación, horario, plazo y mercado en el servidor y guarda una instantánea del lugar. Un cliente antiguo no puede saltarse estas comprobaciones pasando una franja guardada.
- Cambiar asistencia no cancela ni modifica pedidos existentes. El vendedor debe revisarlos y avisar/cancelar individualmente mediante el sistema vigente. **La función de cancelación no se modifica** (comparación exacta probada).
- RLS: lectura pública solo de mercados publicados y participaciones vigentes; propietario solo gestiona su participación; validación administrativa mediante la lista protegida ya existente. No se expone created_by en el API público.

## Archivos y migración
- Cuatro tablas: uzta_markets, uzta_market_rules, uzta_market_exceptions, uzta_market_participations. Se amplían uzta_pickup_slots y uzta_orders con referencias/instantáneas opcionales; históricos no se reescriben.
- Migración preparada: supabase/migrations/20261029190537_markets_and_fairs.sql.
- Pantalla/estilos: src/pages/mercados.*. Formularios: src/components/market-manager.tsx y market-pickup-choices.tsx. Modelo/API/idiomas: src/lib/markets.ts, market-api.ts, market-labels.ts. Se reutilizan mapa, ubicación y panel actuales; cesta/pedidos solo muestran y eligen el nuevo lugar.

## Verificación y activación pendiente
- 71 pruebas de aplicación específicas de calendario, interfaz, adaptador y navegación; 37 comprobaciones SQL/RLS y 9 pruebas con conexiones simultáneas reales. SQL/RLS aislado con datos sintéticos; concurrencia real PostgreSQL 17 con sesiones distintas para preparación duplicada, reserva frente a ausencia/cancelación de mercado y dos vendedores a la vez. Se prueba también la recuperación.
- No se han insertado mercados, vendedores ni pedidos de prueba en producción. Los dos datos OSM están preparados para importación **solo tras revisión**, no publicados automáticamente.
- Antes de activar: revisión final del propietario, respaldo recuperable y copia de la definición vigente de reserve_order; comprobar que coincide con el patrón esperado. Aplicar exclusivamente esta migración dentro de una transacción, nunca un db push de todas las migraciones históricas. La migración se detiene si la función base difiere.
- Después: verificar RLS/privilegios e históricos, activar marketsReady, revisar las propuestas OSM y publicar bajo autorización. El formulario permanece deshabilitado en la vista previa mientras falte esa activación.
- Recuperación preparada: desactivar marketsReady y ejecutar supabase/rollback/disable_markets.sql con autorización. Bloquea nuevas recogidas en mercados incluso mediante franjas antiguas; conserva datos, stock y pedidos, que siguen pudiéndose cancelar o marcar recogidos. No borrar tablas ni restaurar automáticamente funciones antiguas después de tener reservas vinculadas.
