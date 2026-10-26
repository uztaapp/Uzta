# Diseño principal y catálogo ficticio

Se ha aplicado la maqueta aprobada a las cinco pantallas: ancho móvil de 460 px centrado en ordenador, fondo crema, tarjetas claras, dos columnas de productos, botones oliva, ficha de productor con cabecera y avatar, cesta en una columna, pedidos apilados y menú de perfil verde suave. La navegación inferior conserva los cinco destinos e incorpora un contador de cesta.

La demostración contiene 12 productos, 5 vendedores, 4 pedidos y reseñas explícitamente ficticias. Todas las categorías tienen contenido. Se reutilizan las imágenes de la maqueta; los productos sin fotografía tienen ilustraciones neutras. Cada productor tiene descripción, localidad y una franja de recogida de ejemplo. No se han creado cuentas ni insertado estos vendedores o pedidos en Supabase.

La nueva demostración utiliza `uzta.showcase.v1`. Los datos anteriores de `uzta.local.v1` se conservan sin modificación. La cuenta real, Granja Martinez, sus pedidos y sus cestas siguen separados. El modo real continúa siendo el modo inicial de una instalación nueva; Perfil → Ver demostración abre el catálogo completo.

Verificación: revisión visual de inicio, productor, cesta, pedidos y perfil en el navegador local; sin errores de consola en ese recorrido. Comprobación de TypeScript, compilación y 33 pruebas de aplicación. La reserva real no se vuelve a ejecutar para comprobar cambios visuales.

La vista previa está en http://127.0.0.1:5178/. El paquete `outputs/uzta-publicacion-diseno/uzta.zip` está preparado para actualizar el proyecto existente de Vercel. Este cambio todavía no está publicado en la web pública.

Actualización posterior: diseño publicado y verificado en el despliegue `9Ru7dctwGajZs2b5RhPkz6iZD12W` del proyecto existente. Inicio y perfil real cargan sin errores de consola en el recorrido observado.

Se añade en el código local Perfil → «Ver catálogo de demostración» para usuarios autenticados. Cambia a la demostración sin llamar al cierre de sesión de Supabase; el botón «Entrar en mi cuenta de UZTA» restaura la cuenta. Compilación y 33 pruebas correctas. Este pequeño acceso nuevo está pendiente de publicar mediante `outputs/uzta-publicacion-selector/uzta.zip`; conserva el diseño y las validaciones anteriores.
