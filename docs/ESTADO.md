# Estado de UZTA · 26/10/2026

Actualización: la base real de UZTA ya está creada y verificada en el proyecto `abgysktjctrxfkcejjwu`. Véase SUPABASE-REAL.md. La interfaz todavía usa guardado en el navegador; su integración autenticada es el siguiente trabajo pendiente. Las notas sobre Docker de este informe solo afectan al entorno de Supabase local, que sigue sin estar instalado.

## Implementación local

Las cinco pantallas mantienen la maqueta aprobada y ahora utilizan un modelo propio con validación, persistencia y gestión de errores.
La gestión del productor dispone de formularios para tienda, productos y franjas de recogida. Se permite ocultar productos sin borrarlos. Los precios se calculan en céntimos enteros.
Una reserva comprueba productor, stock y fecha, guarda líneas con su precio original, descuenta existencias y vacía la cesta en una única escritura local. Los pedidos ilustrativos se distinguen de las reservas creadas.
Los cambios de precio o la retirada de una franja no alteran el detalle de pedidos ya guardados.
Si falla el guardado, no se presenta una reserva como confirmada. Si los datos guardados no se pueden leer/validar, no se sobrescriben.

## Base de datos independiente

Migración propia para perfiles, productores, productos, recogidas, pedidos, líneas y favoritos. RLS y permisos explícitos en las siete tablas. Las reservas de base de datos calculan precios en el servidor y usan bloqueos de inventario e identificadores de petición para evitar duplicados.
Probada exclusivamente en PostgreSQL en memoria. No está conectada a la interfaz y no se ha ejecutado sobre una base real.

## Evidencia

Resultado final: 15 pruebas de aplicación correctas y 21 comprobaciones de PostgreSQL correctas. TypeScript/Vite, aislamiento y formato verificados. Auditoría npm completa (incluidas herramientas de desarrollo): cero vulnerabilidades conocidas el 26/10/2026, después de actualizar Vite a 8.3.5, Vitest a 4.1.12 y Zod a 4.6.7.

- Pruebas de rutas, cálculo, guardado/recarga, perfil, favoritos, gestión de productos/horarios, fallos de almacenamiento, stock y fechas.
- Pruebas PostgreSQL: migraciones desde cero, RLS, privacidad, permisos, reserva, idempotencia, precios históricos y reversión transaccional ante errores.
- Navegador: una franja de recogida local y una reserva de prueba de 14,30 €, conservada al recargar y marcada como recogida desde la vista del productor. Esa prueba permanece en este navegador.
- Compilación TypeScript/Vite y verificación de aislamiento.

## Pendiente y límites

1. Docker no está instalado. Falta arrancar y validar la pila completa de Supabase local (Auth, API, Studio, Storage), incluidos asesores y pruebas de concurrencia con múltiples conexiones.
2. La interfaz sigue usando almacenamiento local. El adaptador de Supabase LOCAL ya está preparado y probado con transporte simulado; faltan las pruebas contra la pila real y su integración con la interfaz. Véase ADAPTADOR-LOCAL.md. No se ha conectado nada en la nube.
3. El perfil local no autentica ni protege usuarios distintos. La aplicación no envía correos, reservas o pagos. Las reservas solo sirven en este navegador.
4. Solo se ofrece Español. No se inventan traducciones, reseñas, textos jurídicos comerciales, servicios de reparto o condiciones de venta.
5. Fotografías de ejemplo reutilizadas de la maqueta y catálogo de demostración. Faltan los recursos y datos reales de productores.
6. La sincronización entre pestañas locales es básica; no sustituye a un servidor multiusuario. No se garantiza concurrencia comercial mediante localStorage.

La publicación y una futura base de datos externa siguen fuera del alcance de esta fase local.

## Siguiente avance: adaptador y comprobaciones de arranque

Añadidas 13 pruebas del adaptador local y comprobaciones de Docker. La comprobación real de este equipo confirma que Docker sigue ausente y bloquea el arranque sin cambios. El adaptador no forma parte del paquete del navegador y no modifica los datos existentes.
