# UZTA

Actualización: la aplicación local abre el catálogo real de UZTA y permite registro, acceso y gestión autenticada con Supabase. La demostración se abre desde Perfil y conserva su almacenamiento separado. La versión publicada sigue siendo la demostración anterior hasta cargar el paquete `uzta-publicacion-autenticada/uzta.zip` en el proyecto existente. Véase `docs/INTEGRACION-REAL.md`; los apartados de demostración inferiores describen ese modo, no la cuenta real.

Aplicación independiente de productos agrícolas y venta directa, en desarrollo local para Windows. Diseño basado en las cinco pantallas aprobadas: inicio, productor, cesta, pedidos y perfil.

## Abrir

Abre `Iniciar UZTA.cmd`, o ejecuta en esta carpeta:

```powershell
npm.cmd run dev
```

Dirección: http://127.0.0.1:5178. Para detener el servidor, Ctrl+C.
Si aparece un aviso de puerto ocupado, la aplicación probablemente ya está abierta; no cierres otros procesos automáticamente.

Para instalar las dependencias en una copia nueva, usa Node 24 y npm 11:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
```

## Ya funciona en local

- Buscar por nombre, filtrar por categoría y conservar favoritos.
- Abrir cada productor y sus propios productos, información y franjas de recogida.
- Mantener una cesta de un solo productor, cambiar cantidades y comprobar stock.
- Guardar mensaje y reserva local con fecha/hora, total y productos congelados en el momento de reservar.
- Consultar detalle/historial y marcar una recogida desde la vista del productor.
- Editar perfil y ubicación; abrir/cerrar el perfil de prueba sin borrar sus datos.
- Configurar tienda, publicar/ocultar y editar productos, definir recogidas y ver estadísticas locales.

El guardado se realiza en el navegador, con una clave exclusiva de UZTA: `uzta.local.v1`. Permanece tras recargar. No se comparte entre navegadores ni dispositivos. No uses datos sensibles: el perfil local no es autenticación.
Los datos iniciales son ejemplos de la maqueta, no un catálogo ni pedidos reales. Las imágenes se sirven desde archivos locales.

## Probar una reserva

1. Perfil → Horarios y entregas → añadir una fecha futura y franja de recogida.
2. Cesta → Confirmar reserva → seleccionar esa franja → Guardar reserva local.
3. Pedidos → revisar el detalle; en Como productor, marcar recogido.
4. Recargar para comprobar que sigue guardada. Perfil → Estadísticas muestra los resultados locales.

Para pasar a otra tienda, primero termina o vacía la cesta actual. No se combinan productores en una misma reserva.

## Comprobaciones

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run test:db
npm.cmd run test:adapter
npm.cmd run check:isolation
npm.cmd run format:check
```

`test:db` usa PostgreSQL desechable en memoria, no una conexión externa. Consulta [Estado](docs/ESTADO.md), [Supabase local](docs/SUPABASE-LOCAL.md) y [Arquitectura](docs/ARQUITECTURA.md).
La aplicación tiene repositorio, configuración y datos propios. No hay remoto Git, despliegues, credenciales reales ni servicios de nube conectados.

El adaptador local está preparado pero sin activar. `npm.cmd run check:local` comprueba los requisitos sin cambiar nada. Véase [Adaptador local](docs/ADAPTADOR-LOCAL.md).
