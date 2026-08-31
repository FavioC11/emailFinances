-- Fuentes de correo adicionales (defaults). El buzón (gmail/outlook) de cada
-- fuente es una preferencia PERSONAL de cada usuario: se ajusta desde la
-- pestaña "Fuentes" en la web, no con un UPDATE global aquí (eso pisaría la
-- configuración de otros usuarios que reciben el mismo banco en otro buzón).
insert into sources (key, name, platform, from_address, body_match, direction, parser_key) values
  ('io-servicio',      'iO servicio',              'gmail', 'notificaciones@io.pe',                      'El pago de tu servicio se realizó', 'egreso',  'io'),
  ('bcp-servicio',     'BCP pago de servicio',     'gmail', 'notificaciones@notificacionesbcp.com.pe',   'Pago de servicios',                 'egreso',  'bcp'),
  ('bcp-debito',       'BCP tarjeta de débito',    'gmail', 'notificaciones@notificacionesbcp.com.pe',   'Tarjeta de Débito',                 'egreso',  'bcp'),
  ('bbva-servicio',    'BBVA pago de servicio',    'gmail', 'procesos@bbva.com.pe',                       'Pagar servicio',                    'egreso',  'bbva'),
  ('scotiabank-plin',  'Scotiabank Plin',          'gmail', 'bancadigital@scotiabank.com.pe',             'Transferencia Plin',                'egreso',  'scotiabank-plin'),
  ('scotiabank-qr',    'Scotiabank pago QR',       'gmail', 'bancadigital@scotiabank.com.pe',             'Pago con QR',                       'egreso',  'scotiabank-qr'),
  ('interbank-tarjeta','Interbank tarjeta',        'gmail', 'servicioalcliente@netinterbank.com.pe',      'realizaste un consumo',             'egreso',  'interbank-tarjeta'),
  ('yape-egreso-legacy','Yape (envío, redacción antigua)', 'gmail', 'notificaciones@yape.pe',             'Yapeaste',                          'egreso',  'yape');
