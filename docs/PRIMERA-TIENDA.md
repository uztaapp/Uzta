# Primera tienda y reserva verificadas

26/10/2026. El usuario confirmó personalmente su cuenta y autorizó crear «Granja Martinez», inventando los demás datos. Se usó exclusivamente su sesión abierta en el proyecto propio de UZTA.

## Datos provisionales guardados

- Tienda: Granja Martinez, ID `0925d9f5-8887-4123-855e-8d8f07c0eab7`.
- Ubicación: «Ubicación de prueba · pendiente de confirmar».
- Descripción: tienda de prueba, precios y horarios provisionales; no constituyen oferta real.
- Producto: «Tomates · producto de prueba», 2,50 €/kg, 10 unidades iniciales, categoría Verduras. Sin fotografía ni certificación ecológica inventada.
- Recogida: 7/11/2026, 10:00–12:00, hora de Madrid.

## Comprobación en la web publicada

Se creó una reserva de prueba de 1 kg por 2,50 €, con el mensaje «PRUEBA de funcionamiento autorizada. No preparar ni entregar productos.». Se recuperó tras recargar, se abrió desde la vista del productor y se marcó como completada. ID `0f02ff29-fdb2-42db-95d9-ebce97036c52`.

La cesta terminó vacía y las existencias quedaron en 9. No hubo pago, entrega, correo de prueba ni errores de consola durante este recorrido. No se borró el pedido: permanece identificado como prueba en su mensaje y producto.

La misma cuenta actuó como comprador y propietario. Esto verifica integración y persistencia reales, pero no sustituye una prueba con dos cuentas distintas; el aislamiento entre usuarios está cubierto por los tests de PostgreSQL previos.

## Refuerzo del código

Se reutilizan las validaciones de tienda/producto en la frontera de persistencia real. Todas las nuevas franjas se validan y convierten antes de enviar escrituras, y se insertan juntas. Se comprueban propiedad, duplicados, solapes, precios y existencias. No se afirma atomicidad entre el guardado de tienda y el de horarios: son peticiones separadas.

33 pruebas de aplicación y compilación correctas. Este refuerzo está guardado en el código local; la web publicada sigue en el despliegue anterior, que permitió completar el recorrido descrito. Publicar el refuerzo en la próxima actualización del proyecto existente.

Antes de abrir la tienda al público, sustituir ubicación, producto y horario provisionales por los datos reales y revisar el pedido de prueba al interpretar estadísticas.
