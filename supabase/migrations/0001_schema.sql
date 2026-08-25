-- Fuentes = reglas configurables (el eje es el remitente)
create table sources (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,      -- 'yape-egreso', 'bcp-tarjeta'
  name         text not null,
  platform     text not null check (platform in ('gmail','outlook')),
  from_address text not null,
  body_match   text,                       -- texto que confirma la dirección
  direction    text not null check (direction in ('ingreso','egreso')),
  parser_key   text not null,              -- 'yape' | 'bcp'
  active       boolean not null default true
);

-- Categorías
create table categories (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  keywords text[] default '{}'             -- ['papas','salchipaper','rest'] -> comida
);

-- Transacciones normalizadas
create table transactions (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references auth.users(id) default auth.uid(),
  source_key   text not null,
  direction    text not null check (direction in ('ingreso','egreso')),
  amount       numeric(12,2) not null,
  currency     text not null default 'PEN',
  occurred_at  timestamptz not null,
  counterparty text,
  category     text,
  operation_no text,
  email_id     text,
  origin       text not null default 'auto' check (origin in ('auto','manual')),
  raw          jsonb,
  created_at   timestamptz not null default now(),
  unique (source_key, operation_no)         -- ← DEDUPLICACIÓN
);

-- Estado de sondeo incremental por fuente
create table email_state (
  source_key   text primary key,
  last_seen_at timestamptz not null default '1970-01-01',
  last_email_id text
);

-- RLS: cada usuario solo ve lo suyo (con un solo usuario es trivial, pero queda listo para online)
alter table transactions enable row level security;
create policy "own_tx" on transactions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
