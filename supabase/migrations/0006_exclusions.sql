-- Exclusiones de contraparte configurables desde la web.
-- Si el nombre de la contraparte de un movimiento contiene alguno de estos
-- patrones (coincidencia parcial, sin distinguir mayúsculas), el movimiento
-- NO se registra. Reemplaza la antigua lista fija en el código (p.ej. ZiPago,
-- un gateway que solo mueve la tarjeta de crédito y el dinero vuelve).
-- Cada usuario administra su propia lista; por eso la tabla nace vacía.
create table exclusions (
  id         uuid primary key default gen_random_uuid(),
  pattern    text not null,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
