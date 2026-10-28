# Favoritos
Rama `feature/user-favorites`, basada en producción; las valoraciones siguen en su propia rama.
Se reutilizan `uzta_favorites`, el proveedor, Auth, Modal y Access. Productos y vendedores comparten corazón y estado. Se incorpora Perfil → Mis favoritos con dos pestañas. No hay polling ni dependencias nuevas.
Pruebas: 34 de interfaz/proveedor/datos, 10 comprobaciones SQL locales y TypeScript. Compilación final junto con disponibilidad superada.
Pendiente de autorización: `20261028173539_seller_favorites.sql` añade favoritos de vendedores privados por RLS y borrado en cascada de referencias de productos. No se ha aplicado. Activar después `sellerFavoritesReady`; está desactivado para evitar consultas a una tabla aún no creada. Moderación, pedidos y productos existentes no cambian.
No publicado ni enviado a GitHub. Reversión: desactivar indicador; exportar favoritos de vendedores antes de retirar la tabla nueva. La aplicación anterior puede seguir usando los favoritos de productos.
