# Simplificación de interfaz — 29/10/2026

Inicio y Perfil comparten ubicación aproximada en memoria (dos decimales); solo se conserva en sesión el indicador de solicitud de permiso. No hay geocodificador externo. La localidad orientativa se toma de la tienda pública más cercana hasta 20 km y se indica «Cerca de». Se puede escribir otra localidad. Nunca se guardan coordenadas del comprador en Supabase ni se publica su domicilio. Una localidad personal guardada no se sobrescribe automáticamente; adoptar otra requiere Guardar perfil.

Inicio sin buscador duplicado, legibilidad de tarjetas y productos mejorada, Explorar sin campana/franja, pie repetitivo retirado y privacidad disponible en Perfil/acceso.

Causa de la portada: faltaban campo y permisos, no solo estilos. Integración preparada reutilizando el optimizador y la subida inmutable existentes. Migración mínima 20261029003000_producer_covers.sql: una columna en tiendas y bucket privado con permisos de propietario y lectura de archivos publicados. Reversión en rollback-producer-covers.sql, bloqueada si hay fotos que conservar. Retirar portada elimina su referencia, sin borrar objetos ni otros datos. Enlaces firmados anteriores pueden durar hasta 15 minutos.

Solo se autorizó preparar la migración. NO se ha aplicado a producción; producerCoversReady=false. Para activarla hace falta autorización específica, aplicar solo esta migración y comprobar Storage real. No ejecutar migraciones históricas ni activar cancelaciones pendientes como parte de esta entrega.

Pruebas: 57 comprobaciones específicas de interfaz/ubicación/adaptador/almacenamiento y 12 comprobaciones SQL aisladas para portadas. TypeScript y compilación correctos. Prueba móvil 390 y escritorio 1280 sin desbordamiento; Explorar empieza en y=0, no muestra campana ni pie; Inicio no muestra buscador y los huevos usan nombre 16 px/precio 18 px. No se han subido fotos ni creado datos reales para probar. Pendiente ensayo real de portadas tras autorizar su activación.
