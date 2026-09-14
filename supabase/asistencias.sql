-- Historial de asistencia real + limpieza de datos de simulación
-- Sistema NFC (C.N.S.I.L.)
--
-- Correr UNA sola vez en el proyecto de Supabase:
--   Dashboard -> SQL Editor -> New query -> pegar todo esto -> Run
--
-- Requiere haber corrido antes profiles.sql (usa public.profiles).

create table if not exists public.asistencias (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid references auth.users(id) on delete cascade,
  student_name text not null,
  course       text not null,
  subject      text,
  status       text not null default 'ontime' check (status in ('ontime', 'absent')),
  scanned_at   timestamptz not null default now()
);

alter table public.asistencias enable row level security;

drop policy if exists "alumno lee su historial, profesor lee todo" on public.asistencias;
create policy "alumno lee su historial, profesor lee todo"
  on public.asistencias for select
  to authenticated
  using (
    student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor')
  );

-- El que "escanea" es el profesor (su celular hace de lector NFC), así que
-- solo una cuenta de profesor puede insertar un registro de asistencia.
drop policy if exists "solo el profesor registra asistencias" on public.asistencias;
create policy "solo el profesor registra asistencias"
  on public.asistencias for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));

-- Habilitar que las altas lleguen en tiempo real (como con justificativos).
do $$
begin
  alter publication supabase_realtime add table public.asistencias;
exception when duplicate_object then null;
end $$;

-- ── Botón "Limpiar datos de prueba" (app y panel web) ──────────────────────
-- Todo esto es una simulación de tesis: el profesor puede borrar todas las
-- asistencias y justificativos de prueba sin tocar las cuentas (esas se
-- borran a mano desde Authentication -> Users, porque hace falta un permiso
-- que a propósito ningún cliente tiene).
drop policy if exists "el profesor limpia asistencias" on public.asistencias;
create policy "el profesor limpia asistencias"
  on public.asistencias for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));

drop policy if exists "el profesor limpia justificativos" on public.justificativos;
create policy "el profesor limpia justificativos"
  on public.justificativos for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));
