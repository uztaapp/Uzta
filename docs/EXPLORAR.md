# Explorar: mapa adaptado de TRUKA

Implementación local del 27 de octubre de 2026. No desplegada ni aplicada a la base real.

Se revisaron en modo lectura `src/routes/mapa.tsx`, `src/components/reusa-map.tsx`, `map-explorer.css`, `map-markers.css` y los auxiliares de agrupación de la copia saneada de TRUKA, además de su mapa público `/mapa`. UZTA adapta ese patrón: cabecera flotante, controles y tipos compactos, zoom lateral, cambio mapa/lista inferior, localización a la derecha y tarjeta inferior cerrable. No se afirma identidad exacta: cambian contenidos, colores y buscador agrícola; las animaciones de unión/separación de TRUKA no se han trasladado.

## Implementado

- Ruta `/explorar` y navegación independiente de `/productor`, que conserva sus enlaces de tienda existentes.
- Leaflet 1.9.4 y OpenStreetMap, la misma tecnología de TRUKA; sin claves cartográficas ni servicios de pago. El motor y la pantalla se descargan al entrar, sin cargar Leaflet en Inicio.
- Desplazamiento, zoom, controles táctiles nativos de Leaflet, marcadores circulares y agrupaciones a 52 px. Agrupación indexada en celdas vecinas para evitar buscar todos los grupos por cada punto.
- Seleccionar un grupo amplía el mapa y ofrece sus tiendas. Desde zoom 16 se separan visualmente grupos de hasta 50 elementos; grupos mayores conservan contador y acceso a lista para evitar miles de nodos superpuestos. Las posiciones visuales desplazadas nunca alteran la distancia ni los datos guardados.
- Búsqueda sin acentos por nombres de productos, categorías, productores y localidades presentes en el catálogo. No es un geocodificador de direcciones o localidades ajenas al catálogo.
- Categorías y radio de 1–50 km cuando existe una zona de búsqueda; sin zona no se aplica distancia ficticia. Mapa y lista usan los mismos resultados. Solo productores cargados por el proveedor actual con productos activos y stock positivo.
- Tarjeta con foto del primer producto disponible si existe, nombre, localidad, distancia aproximada cuando se conoce la zona, productos/precios y enlace a la tienda. Sin foto real, marcador neutro.
- La lista conserva productores sin coordenadas cuando no hay radio activo. El mapa nunca inventa sus puntos.

## Privacidad y datos pendientes

La geolocalización solo se solicita mediante una acción explícita. La posición de búsqueda vive en memoria de la pantalla y no se guarda ni se envía a Supabase. Al centrar el mapa, el navegador solicita a OpenStreetMap las teselas de esa zona; se informa en Filtros. La atribución permanece visible y no se precargan ni descargan áreas en lote. Si las teselas fallan, la lista continúa disponible.

Los puntos de productores proceden exclusivamente de `Farm.position` y se redondean a dos decimales. La migración ya preparada `20261027154041_uzta_public_producer_location.sql` **sigue sin aplicarse en la nube**, y `producerLocationsReady` sigue en `false`. Debe conciliarse el historial de migraciones aplicado manualmente antes de activarla; no ejecutar un envío indiscriminado de migraciones. La base real puede mostrar tiendas en lista y cero puntos hasta publicar sus ubicaciones aproximadas consentidas.

El esquema actual no distingue profesional/particular ni registra certificación ecológica verificada. Sus filtros están visibles pero desactivados y explicados. El indicador ecológico actual no demuestra certificación y no se usa para simular verificación. Por eso no hay todavía marcadores de segundo color para particulares. Antes de habilitarlo se necesita definir esa clasificación, quién puede validarla y el consentimiento para el punto público aproximado; no se ha alterado el esquema ni los permisos.

No se han creado productores, productos ni pedidos. La demostración utiliza únicamente los ejemplos locales que ya existían y mantiene su aviso. La nube usa solo los datos de UZTA que ya suministra su proveedor, bajo los permisos existentes. No hay conexión de datos con TRUKA.

## Comprobaciones

- Pruebas de búsqueda, productos activos/con stock, ausencia de coordenadas, redondeo y agrupación de 10.000 entradas.
- Pruebas de selección/cierre de tarjeta, coherencia mapa/lista, filtros no disponibles y denegación de geolocalización sin guardar coordenadas.
- Revisión visual a 390 px: mapa, tarjeta y lista. Android/iOS usan los controles táctiles de Leaflet y las zonas seguras CSS; no se ha probado en dispositivos físicos.
- Compilación e independencia de proyectos verificadas. Capturas en la carpeta `outputs` del trabajo.

Fuentes técnicas: [Leaflet 1.9.4](https://leafletjs.com/reference.html), [política de teselas OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).
