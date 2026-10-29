# Mercados y ferias — preparado para revisión, 29/10/2026

Rama feature/markets-fairs. **Activación autorizada el 29/10/2026.** Migración aplicada con respaldo y controles transaccionales; 67 mercados publicados, 69 reglas y ninguna participación externa. marketsReady=true; datos servidos por Supabase. Una sola interfaz y las reservas existentes, sin segundo carrito ni sistema de entregas.

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

## Activación autorizada — 29/10/2026
- Propietario autorizó expresamente migración, publicación de los 67 mercados verificados y activación en Vercel. Los 32 candidatos pendientes no se han importado.
- Respaldo local fuera de Git: `../uzta-recovery/20261029-markets`, con datos afectados, columnas, políticas, ocho funciones y hashes. Se ha comprobado su lectura y se han conservado definiciones recuperables.
- Solo se aplicó `20261029190537_markets_and_fairs.sql`, en una transacción con bloqueo acotado y comprobaciones previas/posteriores. Históricos, productos, stock y funciones de cancelación/recogida no cambiaron. No había registro `supabase_migrations.schema_migrations`; queda recibo de activación y hash local sin crear un esquema adicional.
- Catálogo importado por la RPC existente con la cuenta administradora ya autorizada: 67 mercados publicados, 69 reglas y 0 participaciones. Lectura pública contrastada por API sin exponer `created_by`. No se crearon reservas de prueba en producción.
- Verificación previa: 40 comprobaciones SQL aisladas, 9 pruebas de concurrencia PostgreSQL; después de activar: 19 pruebas específicas de catálogo, recurrencias y vistas, TypeScript y compilación correctos.
- Recuperación: desactivar marketsReady y, con autorización, aplicar `supabase/rollback/disable_markets.sql`. Conserva tablas, stock e históricos y permite gestionar las reservas ya existentes. No restaurar automáticamente funciones antiguas ni borrar datos.
