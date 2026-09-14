-- Tabla de justificativos para el Sistema NFC (C.N.S.I.L.)
--
-- Correr UNA sola vez en el proyecto de Supabase:
--   Dashboard -> SQL Editor -> New query -> pegar todo esto -> Run
--
-- Por qué hace falta: Supabase Realtime (broadcast) NO guarda historial. Si el
-- profesor abre la app después de que el alumno envió el justificativo, ese
-- evento ya se perdió. Con una tabla, el justificativo queda guardado y el
-- profesor lo ve aunque entre horas más tarde.
--
-- No hay Auth en este proyecto (es una demo de tesis), así que las políticas
-- permiten al rol anónimo leer/crear/actualizar. La anon key ya es pública por
-- diseño.

create table if not exists public.justificativos (
  id             uuid primary key default gen_random_uuid(),
  student_name   text not null,
  course         text not null,
  reason         text not null,
  has_attachment boolean not null default false,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'denied')),
  created_at     timestamptz not null default now()
);

alter table public.justificativos enable row level security;

drop policy if exists "anon lee justificativos" on public.justificativos;
create policy "anon lee justificativos"
  on public.justificativos for select
  to anon using (true);

drop policy if exists "anon crea justificativos" on public.justificativos;
create policy "anon crea justificativos"
  on public.justificativos for insert
  to anon with check (true);

drop policy if exists "anon actualiza justificativos" on public.justificativos;
create policy "anon actualiza justificativos"
  on public.justificativos for update
  to anon using (true) with check (true);

-- Habilitar que los cambios (altas y cambios de estado) lleguen en tiempo real.
do $$
begin
  alter publication supabase_realtime add table public.justificativos;
exception
  when duplicate_object then null;
end $$;
