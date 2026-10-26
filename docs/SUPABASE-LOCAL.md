# Supabase local

Identidad propia: `uzta-local`. CLI fijada en 2.122.0. No hay proyecto enlazado ni credenciales externas.

| Servicio | Puerto |
|---|---:|
| API | 55431 |
| PostgreSQL | 55432 |
| Studio | 55433 |
| Correo local de pruebas | 55434 |
| Base temporal de comparación | 55430 |

Docker no está instalado; la pila aún no puede arrancar. El script verifica Docker, identidad y ausencia de enlace cloud antes de continuar.
Cuando Docker Desktop esté instalado y en marcha:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/supabase-local.ps1 start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/supabase-local.ps1 status
```

La red Docker exclusiva liga los puertos a 127.0.0.1. El arranque inicial descargará imágenes y ocupará recursos locales; no crea proyectos externos.
Studio no incluye claves de IA. Analytics y Edge Runtime están deshabilitados. El correo se captura localmente; no hay SMTP ni OAuth externo configurado.
Para detener los contenedores de UZTA sin pedir borrado de sus datos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/supabase-local.ps1 stop
```

## Migraciones propias

La inicial marca el comienzo independiente. `uzta_core` crea únicamente el modelo de las pantallas aprobadas y sus permisos. `seed.sql` no incluye datos, cuentas o credenciales.
Las migraciones se han ejecutado y comprobado en PostgreSQL desechable mediante `npm.cmd run test:db`. Esta comprobación no valida los contenedores, el API de Supabase, Auth ni el comportamiento de múltiples conexiones concurrentes.

No ejecutar `login`, `link`, `db push`, `db pull` o despliegues. No es necesario reiniciar/borrar bases para usar la aplicación offline.
La interfaz seguirá usando su guardado local después de arrancar Supabase: falta desarrollar el adaptador local y verificarlo antes de cualquier cambio de persistencia.
