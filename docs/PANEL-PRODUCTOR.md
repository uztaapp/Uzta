# Panel del productor

Panel adaptable para cuentas con tienda gestionada. Productos, métricas y pedidos salen del proveedor actual; no hay cifras de ejemplo en la app pública. Formularios de productos y tienda reutilizados, con acceso directo a publicar. Ajustes conserva perfil, idiomas, ayuda, favoritos, ventas y comisiones.

Limitaciones respecto a la maqueta: no existe mensajería ni seguimiento de visitas, por lo que se indican sin cifras y sin simular acciones. No hay nombre del comprador en el modelo de pedidos, ni foto de perfil de vendedor persistida: se mantienen datos mínimos y avatar neutro. No se han creado tablas para cubrir estas carencias. Pedidos abre la gestión existente.

Portadas: migración 20261029003000 aplicada con autorización expresa a abgysktjctrxfkcejjwu. Verificado cover_path, bucket privado y dos políticas. Pedidos/productos antes y después: 1/2. producerCoversReady activado solo en esta candidata. No se subieron fotos ni pedidos ficticios a producción. Validación aislada de permisos realizada previamente; pendiente prueba de subida con foto real elegida por el vendedor.

Pruebas específicas: gestión existente y preferencias 12 correctas; TypeScript/compilación correctos. Vista previa únicamente; producción permanece en main anterior.
