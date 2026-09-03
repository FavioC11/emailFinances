-- Fuentes BCP para transferencias y pago de tarjeta propia. Antes solo se
-- reconocían los consumos con tarjeta (crédito/débito) y el pago de servicios;
-- estas plantillas de "Constancia" (mismo remitente) quedaban filtradas por el
-- body_match y se perdían en silencio. El parser `bcp` ya lee sus montos
-- ("Monto transferido" / "Monto enviado" / "Total cobrado" / "Monto pagado") y
-- la contraparte ("Enviado a" / "Pagado a").
--
-- Como en 0005: el buzón (gmail/outlook) es preferencia personal de cada
-- usuario y se ajusta desde la pestaña "Fuentes", no con un UPDATE global.
insert into sources (key, name, platform, from_address, body_match, direction, parser_key) values
  ('bcp-pago-tarjeta',     'BCP pago de tarjeta propia',   'gmail', 'notificaciones@notificacionesbcp.com.pe', 'Pago de tarjeta propia BCP',   'egreso', 'bcp'),
  ('bcp-transf-terceros',  'BCP transferencia a terceros', 'gmail', 'notificaciones@notificacionesbcp.com.pe', 'Transferencia a terceros BCP', 'egreso', 'bcp'),
  ('bcp-transf-otros',     'BCP transferencia a otros bancos', 'gmail', 'notificaciones@notificacionesbcp.com.pe', 'Transferencia a otros bancos', 'egreso', 'bcp')
on conflict (key) do nothing;
