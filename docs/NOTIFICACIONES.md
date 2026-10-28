# Notificaciones de reservas
- Migración pendiente: `20261028100442_reservation_notifications.sql`. No aplicada.
- Crea avisos transaccionales para comprador y vendedor; RLS de destinatario y lectura por RPC, sin inserciones del cliente. Sin avisos históricos inventados.
- Nueva reserva: vendedor recibe aviso y comprador recibe confirmación de registro. Completado: ambos reciben aviso. Confirmada/Preparada/Cancelada solo producen avisos cuando el flujo real admita esos estados; no se modifican estados ni inventario.
- Campana con contador exacto de pendientes, lista de hasta 50 y enlace al pedido con vista de comprador/vendedor. La lectura se conserva en Supabase.
- Consultas al entrar con sesión, abrir la campana o cambiar los pedidos cargados. Sin sondeo periódico, Realtime, correos, SMS o push.
- Activar `notificationsReady` únicamente tras autorizar, aplicar y verificar la migración. La bandera está desactivada; sin ella no se consulta la tabla nueva.
- Pruebas específicas: `npx vitest run src/components/notification-bell.test.tsx` y `node scripts/test-notifications.mjs`. Los estados futuros se simulan solo en PostgreSQL descartable.
- Sin publicación en producción. Para revertir la interfaz, desactivar la bandera y conservar la tabla; no borrar historial de avisos.
