-- Reemplaza la lista fija que vivía en el código (ver historial de ingest.ts):
-- ZiPago es un gateway que solo mueve la tarjeta de crédito y el dinero
-- vuelve; TUCAMBISTA se excluyó a pedido explícito del usuario.
insert into exclusions (pattern, note) values
  ('zipago', 'Gateway que solo mueve la tarjeta de crédito; el dinero vuelve, no es gasto real'),
  ('tucambista', 'A pedido del usuario');
