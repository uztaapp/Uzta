# Estabilización integrada — 29/10/2026

Se incorporan las correcciones pendientes de fix/lurrama-functional-stability a la versión publicada, conservando las cabeceras, la navegación y las cancelaciones activadas.

- La cesta de visitante se recupera tras verificar la identidad si la cuenta no tiene una cesta o mensaje guardados ni una reserva pendiente de respuesta. No se mezclan tiendas ni se sobrescriben selecciones existentes.
- El traspaso se realiza una sola vez. Los datos ilegibles se conservan y una respuesta antigua después de cerrar sesión no mueve la cesta.
- Se retira el aviso obsoleto de portada/avatar/favoritos pendientes en la información del productor.
- El guion de pruebas utiliza el flujo real de solicitud y aprobación de productores.

Verificación de esta integración: 52 pruebas de proveedor, datos y cancelaciones; 38 comprobaciones integrales SQL/adaptador con compradores y ambos tipos de vendedor; TypeScript y compilación. Datos ficticios únicamente en bases aisladas. Sin migraciones ni cambios de datos en producción.

La activación de cancelaciones y sus pruebas de concurrencia están documentadas en CANCELACIONES-ACTIVACION.md. No se realizaron nuevas reservas, publicaciones de productos ni altas reales para probar esta integración. Las comprobaciones previas con dispositivo Android físico y altas reales siguen siendo distintas de las pruebas automatizadas.
