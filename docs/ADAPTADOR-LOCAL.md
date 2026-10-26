# Adaptador de Supabase local

`server/local-supabase.mjs` es una capa preparada y aún no conectada a la interfaz. No inicia ningún servicio y no lee credenciales por su cuenta.

## Alcance

- Catálogo de productores, productos y franjas.
- Verificación de identidad a través de Auth local.
- Lectura/edición de perfil, tienda, productos y recogidas mediante las tablas propias de UZTA.
- Favoritos, lectura de pedidos y funciones transaccionales de reserva/recogida.
- Validación de entradas y respuestas. Los precios de una reserva se calculan en PostgreSQL, nunca se aceptan del cliente.

Solo acepta el origen literal `http://127.0.0.1:55431`, una clave publicable y, para operaciones privadas, un token de usuario de ese Auth local. Rechaza claves secretas o de servicio, emisores externos, tokens caducados y redirecciones. El servidor local deberá verificar firma/permisos/RLS: decodificar un token no autentica al usuario.
No se persisten ni registran claves/tokens. Las escrituras no se reintentan automáticamente; el identificador de reserva permite repetir una solicitud sin duplicar stock/pedidos.

## Comprobación

```powershell
npm.cmd run test:adapter
npm.cmd run check:local
```

`test:adapter` prueba el contrato HTTP con transporte simulado, sin abrir conexiones. Incluye restricciones de origen/credenciales, errores, identidad, cuerpo de reserva, idempotencia del cliente y ámbito de favoritos. No sustituye a una prueba de Supabase real.
`check:local` inspecciona configuración y Docker sin iniciar ni detener contenedores. Distingue Docker ausente, motor apagado y contexto externo; no permite motores remotos ni una red preexistente que publique fuera de 127.0.0.1.

## Pendiente antes de activar

1. Instalar y arrancar Docker Desktop; verificar `check:local`.
2. Arrancar exclusivamente la pila UZTA con `scripts/supabase-local.ps1 start` y comprobar migraciones/API/Auth.
3. Crear usuarios locales de prueba y verificar RLS con sesiones reales y múltiples conexiones.
4. Conectar esta capa a un proveedor de datos de la interfaz, manteniendo el modo actual hasta validar el recorrido completo.
5. Preparar una migración explícita de los datos guardados en el navegador; no se copian, sustituyen ni eliminan automáticamente. Los identificadores de demostración no equivalen a UUID de la base.

El modo de la aplicación sigue siendo guardado en navegador. No hay conexión a la nube ni cambios sobre sus datos locales.
