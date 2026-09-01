-- Fase 1 · Consolidar duplicados.
--
-- Hoy solo existe `direction` (ingreso/egreso), que confunde "plata que se
-- gasta" con "plata que solo se mueve". Se agrega `tipo` para distinguir:
--   gasto        → egreso real, SUMA a los egresos
--   ingreso      → ingreso real, SUMA a los ingresos
--   transferencia→ plata que solo cambia de bolsillo (pago a tu tarjeta,
--                  movimiento entre tus cuentas): NO suma a ningún total
--   reembolso    → te devuelven plata para cubrir un gasto: NETEA ese gasto
--                  (baja los egresos), no cuenta como ingreso nuevo
--
-- `vinculado_a` ata un reembolso a su gasto original para trazabilidad.

alter table transactions add column tipo text;

-- Migración segura: los movimientos actuales toman un default sensato según su
-- dirección. Nada se borra ni se recategoriza a mano.
update transactions set tipo = case
  when direction = 'ingreso' then 'ingreso'
  else 'gasto'
end;

alter table transactions
  alter column tipo set not null,
  alter column tipo set default 'gasto',
  add constraint transactions_tipo_check
    check (tipo in ('gasto', 'ingreso', 'transferencia', 'reembolso'));

-- Un reembolso apunta al gasto que netea. on delete set null: si se borra el
-- gasto, el reembolso queda suelto (no se borra en cascada).
alter table transactions
  add column vinculado_a uuid references transactions(id) on delete set null;

create index transactions_vinculado_a_idx on transactions(vinculado_a);
