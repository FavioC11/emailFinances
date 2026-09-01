-- Se había desactivado interbank-pago-tarjeta para que no contara como gasto.
-- Con el sistema de `tipo` de main (ver 0009), la forma correcta es
-- reactivarla y dejar que el parser marque tipo="transferencia" — así se ve
-- en la tabla pero no suma a los totales, en vez de ocultarse por completo.
update sources set active = true where key = 'interbank-pago-tarjeta';
