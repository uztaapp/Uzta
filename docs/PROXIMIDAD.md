# Proximidad y ubicación pública

Implementado y comprobado en local el 27 de octubre de 2026.

Inicio permite elegir una zona manualmente o solicitar la ubicación con un botón explícito, y filtrar productos y tiendas por radios de 1, 5, 10, 25 o 50 km. Se reutiliza el cálculo Haversine de la referencia de TRUKA, sin ejecutar ni modificar ese proyecto. Las tiendas sin coordenadas quedan fuera de un radio activo. Quitar el filtro restaura el catálogo.

La posición del comprador vive únicamente en el estado de la pantalla: no se escribe en almacenamiento ni se envía a Supabase o al productor. Denegar la ubicación permite seguir introduciendo una zona manualmente. Las respuestas tardías se ignoran después de cancelar o salir.

El productor puede guardar un punto público aproximado, redondeado a dos decimales. Ambos campos deben estar completos o vacíos. La ficha ofrece un enlace explícito a OpenStreetMap con ese punto aproximado; no hay mapa incrustado, agrupación de puntos ni búsqueda por dirección. Las posiciones de las tiendas de demostración son ficticias. Los datos antiguos sin posición no se completan automáticamente.

## Activación de ubicación en la nube

La migración `20261027154041_uzta_public_producer_location.sql` se aplicó el 27/10/2026 con autorización expresa del usuario. Se comprobaron las columnas, sus tres restricciones, RLS y la conservación de productores/productos/pedidos. `producerLocationsReady` está en `true`. Mi tienda sustituye los campos numéricos por un mapa: pulsar, arrastrar el punto, usar el centro o retirar el punto; guardar sigue siendo una acción explícita de Guardar tienda. No se asignó ninguna posición real automáticamente. El historial manual debe conciliarse antes de cualquier envío automático de migraciones.

## Verificación

- 73 pruebas de aplicación y 33 comprobaciones de base de datos aprobadas, incluida validación de coordenadas y redondeo público.
- Compilación y comprobación de separación de proyectos aprobadas.
- En navegador: zona ficticia 43.45 / -1.46, radio 1 km, muestra productos de Urki; quitar el filtro recupera las demás tiendas.

Captura: `../../uzta-proximidad-local.png`.
