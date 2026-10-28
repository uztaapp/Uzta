# Una sola UZTA — 28/10/2026

## Investigación
Las seis rutas y sus estilos eran compartidos. DemoProvider elegía el proveedor con uzta.view.v1, persistido por los accesos de Acceso y Perfil. La demo aportaba registros y recortes de la maqueta; Supabase utilizaba marcadores neutros cuando faltaban fotografías. No eran dos diseños distintos.

Consulta pública de solo lectura al proyecto abgysktjctrxfkcejjwu: HTTP 200 para productores, productos y horarios; una tienda activa, un producto activo destacado con nueve unidades y un horario activo. El producto existente se llama «Tomates · producto de prueba»; no se convirtió en oferta real ni se borró. La ausencia de más oferta real no se resuelve añadiendo ejemplos. El catálogo público no mostró bloqueo RLS. Pedidos, favoritos y perfil siguen dependiendo de la sesión verificada y las políticas existentes.

## Cambio
La aplicación pública y el desarrollo normal utilizan únicamente Supabase. Los ejemplos quedan disponibles para las pruebas automatizadas mediante MODE=test; no existe ruta ni parámetro público que los active. Se ignora la antigua preferencia del navegador sin borrar datos locales. Se retiran los accesos de demostración de Acceso y Perfil. Se conservan los componentes compartidos y los seis diseños.

Inicio muestra los productos activos aunque no sean destacados. Se conservan búsqueda, categorías, favoritos y radio. Un catálogo vacío ofrece Explorar y Publicar; un error de consulta conserva el aviso con Reintentar y no se presenta como catálogo vacío. Lo mismo se aplica al estado vacío de Explorar. No hay cambio automático al proveedor de prueba.

## Comprobaciones
97 pruebas de aplicación correctas, incluidas selección pública con preferencia demo antigua, ausencia de fallback al fallar Supabase, producto no destacado y estados vacíos. TypeScript/compilación e aislamiento correctos. No cambian consultas, autenticación, reservas, precios, stock, RLS, credenciales o migraciones. TRUKA no se modifica.

## Pendientes reales
El catálogo contiene todavía el registro de prueba anterior. Se necesitan publicaciones genuinas y fotografías aportadas por sus propietarios. productPhotosReady sigue desactivado: requiere la integración de Storage preparada anteriormente, sin activarla ni cambiar políticas dentro de este encargo. No se fabrican fotografías, reseñas, avatares o portadas para llenar la interfaz. Las herramientas no implementadas mantienen sus avisos.

La vista previa usa Supabase para lecturas públicas. No se crearán pedidos o cuentas reales para probarla. El acceso con correo está limitado por authReturnUrl a producción/localhost; no se amplían URLs ni permisos de Auth para la vista previa.
