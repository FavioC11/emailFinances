insert into sources (key, name, platform, from_address, body_match, direction, parser_key) values
  ('yape-egreso', 'Yape (envío)',  'gmail',  'notificaciones@yape.pe', 'Acabas de yapear', 'egreso', 'yape'),
  ('yape-ingreso','Yape (recibo)', 'gmail',  'notificaciones@yape.pe', 'te han yapeado',    'ingreso','yape'),
  ('bcp-tarjeta', 'BCP tarjeta',   'outlook','notificaciones@notificacionesbcp.com.pe', 'Tarjeta de Crédito', 'egreso', 'bcp');

insert into categories (name, keywords) values
  ('Comida',        array['papas','salchipaper','rest','pizza','pollada','food']),
  ('Transporte',    array['uber','cabify','beat','grifo','peaje']),
  ('Servicios',     array['movistar','claro','entel','luz','agua','netflix']),
  ('Compras',       array['plaza','mercado','tienda','oechsle','ripley']),
  ('Sin categoría', array[]::text[]);
