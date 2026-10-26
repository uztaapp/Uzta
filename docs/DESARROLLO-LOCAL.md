# Trabajo continuo en local

El usuario ha pedido agrupar los cambios y dejar de solicitar publicaciones sucesivas en Vercel. La versión local es la versión de trabajo; no pedir «siguiente» para continuar con revisiones y correcciones dentro de las cinco pantallas aprobadas. No añadir funcionalidades comerciales nuevas ni modificar proyectos ajenos.

## Bloque de estabilidad completado

- Buscar, filtrar por categoría o pulsar «Ver todos» encuentra todos los productos publicados, incluidos los que no están destacados. La búsqueda admite mayúsculas y omite diferencias de acentos.
- La cesta bloquea el avance si un producto está retirado o supera las existencias. Se puede reducir o eliminar para corregirla; mientras se guarda o carga se bloquean cambios de cantidades y mensaje. La confirmación requiere una franja que siga disponible.
- Los fallos al recuperar sesión dejan de producir una carga indefinida. Se muestra un aviso y se permite reintentar sin recargar la página.
- Si falla la conexión al cerrar sesión, se conserva la identidad actual y se informa del fallo, sin simular una salida correcta.
- Las respuestas antiguas de lecturas posteriores a un guardado no sustituyen los datos obtenidos tras una actualización de sesión.
- La conexión real se carga en un archivo separado: archivo principal 443,10 kB y módulo de conexión 229,06 kB. La compilación ya no muestra la advertencia de más de 500 kB por archivo.

## Validación

39 pruebas de aplicación correctas; TypeScript, compilación, formato y aislamiento correctos. Se añadieron casos de búsqueda de productos no destacados, cesta con stock insuficiente, recuperación tras fallo de sesión, fallo de cierre, respuesta antigua y fallo de guardado privado. En navegador local se comprobó que «huevos» devuelve también el producto no destacado de Ferme de l’Urki.

No se realizaron despliegues ni se modificaron datos de negocio en Supabase durante este bloque. La comprobación de errores y sesiones usa transporte simulado. Las pruebas PostgreSQL previas no se repitieron porque no cambió el esquema ni las funciones de reservas.

## Trabajo pendiente antes de dar la versión por completa

- Ampliar el recorrido autenticado con comprador y productor de cuentas distintas; hasta ahora la prueba real utilizó una sola cuenta en ambos papeles.
- Comprobar en dispositivos móviles reales el teclado, formularios largos y zonas seguras.
- Sustituir los datos provisionales y aportar fotografías reales antes de usar la tienda como oferta comercial.
- Reconciliar el historial de migraciones aplicadas manualmente antes de utilizar `db push` contra el proyecto real.
- Realizar una única revisión y publicación conjunta de los cambios acumulados cuando corresponda.
