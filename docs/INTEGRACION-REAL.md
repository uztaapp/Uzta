# Integración real de UZTA · 26/10/2026

La versión local y el paquete compilado incorporan registro con confirmación de correo, acceso con contraseña y cierre de sesión. El correo de la cuenta no se modifica desde el formulario de perfil. Solo se utiliza el proyecto `abgysktjctrxfkcejjwu`; la clave incluida es publicable y los permisos se aplican en PostgreSQL. No se han utilizado credenciales privilegiadas.

Inicio y productor leen el catálogo real; perfil, favoritos, tienda, productos, recogidas y pedidos trabajan con la identidad autenticada. Los productos nuevos muestran un marcador neutro sin fotografías ficticias. No se han añadido pagos, envíos ni funciones externas a la maqueta.

La reserva envía identificadores, cantidades y mensaje a la función transaccional: el servidor fija precios y descuenta existencias. Un identificador persistente permite recuperar una confirmación interrumpida sin duplicar la reserva. La cesta se conserva por usuario en este navegador; los pedidos se guardan en Supabase. No hay sincronización de la cesta entre dispositivos.

El botón «Ver demostración» mantiene los ejemplos originales en `uzta.local.v1`, separados de las cuentas y cestas reales. No se han importado esos ejemplos a Supabase, ni creado usuarios, ni enviado correos de prueba. El catálogo real está vacío hasta que un productor publique productos.

## Comprobación

- 29 pruebas de interfaz/modelo/conexión simulada correctas: validación de sesión, cierre, separación de datos, permisos de identidad, horarios de Madrid y recuperación de reservas.
- 21 comprobaciones PostgreSQL en memoria: RLS, precios, stock, reversión y repetición de reservas.
- 16 pruebas de adaptadores correctas.
- API real: catálogo público accesible; perfiles y reservas anónimas bloqueados, sin crear datos.
- TypeScript y compilación correctos; aislamiento correcto; auditoría de dependencias de producción sin vulnerabilidades conocidas.
- Navegador local: catálogo real vacío y acceso visibles; cambio a demostración y regreso sin mezclar los datos.

No se ha realizado una compra autenticada de extremo a extremo con usuarios reales. El usuario debe registrar y confirmar personalmente su cuenta para esa comprobación. Las pruebas de permisos y persistencia autenticada usan identidades simuladas y PostgreSQL desechable.

## Publicación pendiente

La web pública todavía contiene la demostración anterior. La carga de la actualización desde «New Project» fue bloqueada automáticamente por posible duplicación del proyecto. El paquete nuevo está preparado para arrastrarlo en la página del proyecto existente `https://vercel.com/uzta1/uzta`. No se ha creado otro proyecto ni se ha cambiado el dominio.

Queda una advertencia de tamaño de JavaScript (666 kB, 194 kB comprimido); no impide compilar. Las migraciones aplicadas manualmente deben reconciliarse con el historial administrado antes de usar el CLI contra la base real. Docker no está instalado; la base local completa sigue pendiente.
