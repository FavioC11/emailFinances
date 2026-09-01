-- A pedido del usuario: los pagos de tarjeta de crédito son movimiento entre
-- cuentas propias, no gasto real — se desactiva la fuente en vez de borrarla,
-- por si más adelante se quiere reactivar.
update sources set active = false where key = 'interbank-pago-tarjeta';
