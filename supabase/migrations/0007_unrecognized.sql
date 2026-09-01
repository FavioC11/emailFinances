-- Bandeja de "no reconocidos": correos de una fuente activa que el parser no
-- logró leer (monto nulo por formato nuevo, moneda desconocida, etc.). Antes se
-- descartaban en silencio y el dato se perdía sin aviso — lo que más rápido
-- destruye la confianza en los totales. Ahora se guardan aquí para revisarlos a
-- mano en vez de perderlos.
--
-- Ojo: las EXCLUSIONES (contrapartes que el usuario decidió ignorar) NO entran
-- aquí — ese descarte es intencional. Aquí solo caen los correos que el sistema
-- no supo interpretar.
create table unrecognized (
  id           uuid primary key default gen_random_uuid(),
  source_key   text not null,
  email_id     text not null,
  reason       text not null,            -- p.ej. 'monto_nulo'
  counterparty text,                     -- lo que sí se pudo extraer (si algo)
  snippet      text,                     -- recorte del correo para diagnosticar
  raw          jsonb,                    -- lo que devolvió el parser
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (source_key, email_id)          -- dedup: un correo no reconocido, una fila
);
