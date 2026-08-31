-- 0003_categories_reset.sql
-- Reset de categorías (iteración 1): estructura con grupo + prioridad de match.
--
-- Notas de diseño (por cómo funciona categorize() en src/lib/categorize.ts):
--   * El match es substring: text.includes(keyword). NO es "empieza con".
--   * categorize() devuelve el PRIMER match del array de reglas -> el ORDEN importa.
--     Por eso agregamos `orden` (menor = se evalúa primero = mayor prioridad).
--     REQUIERE cambio en el ingest para ordenar por `orden` (ver PARTE D abajo).
--   * Las keywords se guardan en minúsculas (categorize() y cleanKeywords() lo asumen).
--   * Las keywords SOLO aplican a ingestas FUTURAS. Para recategorizar lo existente,
--     hay que re-ingestar limpio (PARTE C).

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE A · Esquema: grupo + orden
-- ────────────────────────────────────────────────────────────────────────────
alter table categories add column if not exists grupo text;
alter table categories add column if not exists orden int not null default 500;

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE B · Reset de categorías
-- ────────────────────────────────────────────────────────────────────────────
delete from categories;

insert into categories (name, grupo, orden, keywords) values
  -- Prioridad ALTA: específicos que deben ganar a los genéricos ──────────────
  ('Reembolsables',    'Flujos internos', 10,  array['agua','luz','hidrandina','sedalib']),          -- gana a YAPE
  ('Sueldo',           'Ingresos',        20,  array['ntt','abono haberes','planilla']),
  ('Otros ingresos',   'Ingresos',        30,  array['reembolso','devolucion']),
  ('Ahorro/Inversión', 'Flujos internos', 40,  array['ibkr','interactive']),                          -- TODO: agrega el token de tu bróker
  ('Deuda',            'Necesidades',     50,  array[]::text[]),                                       -- TODO: token de tu cuota del terreno en la notif BCP
  ('Tecnología',       'Discrecional',    60,  array['coolbox','hiraoka','mercadolibre','mercado libre','xiaomi','tapo','amazon']), -- antes que Mercado
  ('Transporte',       'Necesidades',     70,  array['uber','cabify','didi','indrive','primax','repsol','petroperu','peaje']),      -- antes que Mascotas (petroperu contiene "pet")
  ('Mascotas',         'Necesidades',     80,  array['pet','veterinaria','bravecto']),                 -- TODO: agrega la marca del alimento
  -- Prioridad MEDIA: marcas / comercios ─────────────────────────────────────
  ('Mercado',          'Necesidades',     90,  array['plaza vea','tottus','metro','wong','makro','mercado','flora']),
  ('Servicios',        'Necesidades',     100, array['movistar','claro','entel','bitel','win','internet']),
  ('Salud',            'Necesidades',     110, array['clinica','inkafarma','mifarma','botica','btl']),
  ('Educación',        'Necesidades',     120, array['udemy','platzi','coursera','cambridge','aws']),
  ('Estacionamiento',  'Necesidades',     130, array['parking']),
  ('Comida',           'Discrecional',    140, array['restaur','pizza','pollada','salchipaper','kfc','bembos','norkys','rappi','pedidosya']),
  ('Compras/Retail',   'Discrecional',    150, array['oechsle','ripley','saga','falabella','promart','sodimac','maestro']),
  ('Ocio',             'Discrecional',    160, array['cineplanet','cinemark','steam','bar']),          -- OJO: "bar" es substring peligroso
  ('Suscripciones',    'Discrecional',    170, array['netflix','spotify','disney','hbo','youtube','claude','github','chatgpt','fitia']),
  ('Viajes',           'Discrecional',    180, array['latam','oltursa','cruz del sur','movil tours','booking','airbnb','despegar']),
  ('Regalos',          'Discrecional',    190, array[]::text[]),                                       -- manual / opcional
  ('Freelance',        'Ingresos',        200, array[]::text[]),                                       -- TODO: tus clientes / medio de cobro
  -- Prioridad BAJA: genéricos de flujo (se evalúan al final) ─────────────────
  ('Transferencias',   'Flujos internos', 900, array['yape','plin','transferencia']),
  ('Efectivo',         'Flujos internos', 910, array['cajero','retiro']),
  -- Fallback ────────────────────────────────────────────────────────────────
  ('Sin categoría',    'Fallback',        9999, array[]::text[]);

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE C · (OPCIONAL, DESTRUCTIVO) Re-ingesta limpia
-- El upsert del ingest usa ignoreDuplicates:true, así que re-ingestar NO
-- recategoriza filas existentes. Para aplicar las nuevas keywords a lo viejo,
-- hay que borrar transacciones + resetear el estado de correo y re-ingestar.
-- Habilitado a pedido ("limpia todo"): borra transacciones y resetea el estado
-- de correo para que la próxima ingesta re-lea TODO y recategorice con las
-- nuevas keywords. (Con `supabase db reset` esto es redundante pero inofensivo.)
-- ────────────────────────────────────────────────────────────────────────────
delete from transactions;
update email_state set last_seen_at = '1970-01-01', last_email_id = null;

-- ────────────────────────────────────────────────────────────────────────────
-- PARTE D · Cambio de código requerido para que `orden` tenga efecto
-- En src/app/api/ingest/route.ts, línea ~37, cambia:
--     const { data: cats } = await db.from("categories").select("name,keywords");
-- por:
--     const { data: cats } = await db.from("categories")
--       .select("name,keywords").order("orden", { ascending: true });
-- (Sin esto, la prioridad AGUA>YAPE y Tecnología>Mercado NO se garantiza.)
