# Eusko — preparación local
Rama `feature/eusko-payments` sobre `feature/sales-commissions`. No publicado ni aplicado en producción. `euskoReady=false`.
- Mi tienda permite declarar billetes y/o Eusko digital; ambos desactivados por defecto. Se muestra el requisito de adhesión/autorización y enlace a Euskal Moneta. La declaración no acredita oficialmente la adhesión.
- Insignias en productos y perfiles y filtro de Explorar. Precios, reservas y comisiones permanecen en EUR; no se añade equivalencia opcional ni logotipo oficial.
- Preferencia EUR/EUSKO durante la reserva; comprobación de aceptación en servidor, instantánea de medios aceptados y preferencia en el pedido. La selección no demuestra un pago. Los pedidos anteriores mantienen preferencia NULL, sin inventar cómo se pagaron. El endpoint anterior sigue disponible sin ambigüedad.
- Aviso sobre céntimos para billetes. Ningún monedero, QR, conexión con Euskal Moneta, transferencia ni confirmación digital.
- El panel Comisiones muestra el número de vendedores que declaran aceptación (no reservas pagadas). Usa la lista privada de administradores de la migración de comisiones, sin ampliar roles del cliente.
- Pendiente de autorización: `20261028183354_eusko_acceptance.sql`, después de comisiones y sus dependencias autorizadas. Verificar cuentas separadas y activar el indicador en vista previa antes de publicar. Reversión `supabase/rollback-eusko.sql` bloqueada si se perderían preferencias o declaraciones sin exportarlas; revertir Eusko antes que comisiones.
- Fuentes oficiales revisadas: https://www.euskalmoneta.org/questions-pratiques/ y https://www.euskalmoneta.org/euskopay-lapplication-de-paiement-en-eusko/ (1 Eusko = 1 euro, medios y céntimos de billetes). Información enlazada; UZTA no verifica pagos.

Verificación final del conjunto: 48 pruebas específicas de interfaz/datos/reservas; 16 comprobaciones SQL de comisiones, 10 de Eusko y 40 de compatibilidad existentes. TypeScript y compilación correctos (aviso no bloqueante del paquete principal). Todas las pruebas de datos son locales. No se han asignado administradores ni activado tarifas.
