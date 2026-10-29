# Perfil y móvil — 29/10/2026

Logo unificado a 128 px (antes el panel lo reducía a 90 px). Campana fuera del flujo vertical, respetando los controles de título; reducidos márgenes superiores de Inicio, acceso, perfil y panel. El mapa mantiene su altura propia.

Móvil incorpora gestión rápida, tarjetas de productos y pedidos recientes del escritorio; lista de productos horizontal y controles táctiles. No se simula mensajería ni visitas.

Foto pública de productor: campo avatar_path, validación de propietario y permiso de lectura de imágenes publicadas, reutilizando el almacenamiento privado de portadas. Migración 20261029021000 aplicada con autorización expresa en abgysktjctrxfkcejjwu. Cambiar/retirar desde Mi tienda, guardar y visualizar en perfil público y panel. No se subió una imagen ficticia para probar en producción; pendiente comprobación con la foto real que elija el propietario.

12 comprobaciones SQL de aislamiento y permisos, pruebas de gestión y publicación específicas y compilación. No se publica el código en producción sin autorización.
