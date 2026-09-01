-- Equivalente en soles de un movimiento en otra moneda, cuando el propio correo
-- lo trae (p.ej. un consumo con tarjeta en US$ que muestra también el cargo en
-- S/). Permite una futura vista "todo en soles" sin pedir tipo de cambio.
-- Null para movimientos en soles o cuando el correo no incluye la conversión.
alter table transactions add column amount_pen numeric(12,2);
