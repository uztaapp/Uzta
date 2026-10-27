# Proximidad y ubicación pública

Implementado y comprobado en local el 27 de octubre de 2026.

Inicio permite elegir una zona manualmente o solicitar la ubicación con un botón explícito, y filtrar productos y tiendas por radios de 1, 5, 10, 25 o 50 km. Se reutiliza el cálculo Haversine de la referencia de TRUKA, sin ejecutar ni modificar ese proyecto. Las tiendas sin coordenadas quedan fuera de un radio activo. Quitar el filtro restaura el catálogo.

La posición del comprador vive únicamente en el estado de la pantalla: no se escribe en almacenamiento ni se envía a Supabase o al productor. Denegar la ubicación permite seguir introduciendo una zona manualmente. Las respuestas tardías se ignoran después de cancelar o salir.

El productor puede guardar un punto público aproximado, redondeado a dos decimales. Ambos campos deben estar completos o vacíos. La ficha ofrece un enlace explícito a OpenStreetMap con ese punto aproximado; no hay mapa incrustado, agrupación de puntos ni búsqueda por dirección. Las posiciones de las tiendas de demostración son ficticias. Los datos antiguos sin posición no se completan automáticamente.

## Activación pendiente en la nube

La migración `20261027154041_uzta_public_producer_location.sql` añade las dos coordenadas y sus restricciones. Está probada localmente, pero no aplicada a la base real. `producerLocationsReady` permanece en `false`: el editor real sigue oculto hasta aplicar y comprobar la migración propia de UZTA. No ejecutar un envío indiscriminado de migraciones: el historial de las migraciones anteriores aplicadas manualmente debe conciliarse primero.

## Verificación

- 73 pruebas de aplicación y 33 comprobaciones de base de datos aprobadas, incluida validación de coordenadas y redondeo público.
- Compilación y comprobación de separación de proyectos aprobadas.
- En navegador: zona ficticia 43.45 / -1.46, radio 1 km, muestra productos de Urki; quitar el filtro recupera las demás tiendas.

Captura: `../../uzta-proximidad-local.png`.
