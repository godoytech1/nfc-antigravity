-- Lógica de asistencia profesional — Sistema NFC (C.N.S.I.L.)
--
-- Correr UNA sola vez en el proyecto de Supabase:
--   Dashboard -> SQL Editor -> New query -> pegar todo esto -> Run
--
-- Requiere haber corrido antes: justificativos.sql, profiles.sql, asistencias.sql
--
-- Qué agrega:
--   1. Horario de entrada y tolerancia configurables (tabla configuracion).
--   2. El estado (puntual / tarde) lo calcula la BASE DE DATOS, no el celular
--      — así nadie puede falsear su hora de llegada desde la app.
--   3. Un solo registro de asistencia por alumno por día (sin duplicados).
--   4. Los justificativos justifican una FECHA concreta.
--   5. Los cursos quedan validados contra la lista real del colegio.
--   6. Índices en las columnas por las que siempre se filtra.

-- ── 1. Configuración institucional (una sola fila) ─────────────────────────
create table if not exists public.configuracion (
  id                 smallint primary key default 1 check (id = 1),
  hora_entrada       time    not null default '07:00',
  tolerancia_minutos int     not null default 15,
  zona_horaria       text    not null default 'America/Asuncion'
);

insert into public.configuracion (id) values (1) on conflict (id) do nothing;

alter table public.configuracion enable row level security;

drop policy if exists "todos leen la configuracion" on public.configuracion;
create policy "todos leen la configuracion"
  on public.configuracion for select to authenticated using (true);

drop policy if exists "solo el profesor cambia la configuracion" on public.configuracion;
create policy "solo el profesor cambia la configuracion"
  on public.configuracion for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));

-- ── 2. Normalizar cursos viejos y validarlos ───────────────────────────────
-- Datos creados antes de fijar los 9 cursos reales quedaron con nombres que
-- ya no existen ("3er BTI" en vez de "3ro BTI"), y esos alumnos se volvieron
-- invisibles en las listas. Los normalizamos y después bloqueamos el formato.
update public.profiles       set course = '1ro BTI' where course in ('1er BTI');
update public.profiles       set course = '3ro BTI' where course in ('3er BTI');
update public.profiles       set course = '3ro BTC' where course in ('3er BTC');
update public.asistencias    set course = '1ro BTI' where course in ('1er BTI');
update public.asistencias    set course = '3ro BTI' where course in ('3er BTI');
update public.asistencias    set course = '3ro BTC' where course in ('3er BTC');
update public.justificativos set course = '1ro BTI' where course in ('1er BTI');
update public.justificativos set course = '3ro BTI' where course in ('3er BTI', '3ro BTI ');
update public.justificativos set course = '3ro BTC' where course in ('3er BTC');

alter table public.profiles drop constraint if exists profiles_course_check;
alter table public.profiles add constraint profiles_course_check
  check (
    course is null or course in (
      '1ro BTI', '2do BTI', '3ro BTI',
      '1ro BTC', '2do BTC', '3ro BTC',
      '1ro Sociales', '2do Sociales', '3ro Sociales'
    )
  );

-- ── 3. Asistencias: fecha propia, estado calculado y sin duplicados ────────
alter table public.asistencias add column if not exists fecha date;

-- Ahora también aceptamos 'late' (llegó tarde).
alter table public.asistencias drop constraint if exists asistencias_status_check;
alter table public.asistencias add constraint asistencias_status_check
  check (status in ('ontime', 'late', 'absent'));

-- El estado y la fecha los pone la base, nunca el cliente: la app puede
-- mandar cualquier cosa en "status" y se pisa igual. Esto es lo que hace
-- que la puntualidad no se pueda falsear desde el celular.
create or replace function public.set_asistencia_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cfg        record;
  hora_local time;
  limite     time;
begin
  select * into cfg from public.configuracion where id = 1;

  new.fecha  := (new.scanned_at at time zone cfg.zona_horaria)::date;
  hora_local := (new.scanned_at at time zone cfg.zona_horaria)::time;
  limite     := cfg.hora_entrada + make_interval(mins => cfg.tolerancia_minutos);

  new.status := case when hora_local <= limite then 'ontime' else 'late' end;
  return new;
end;
$$;

drop trigger if exists asistencias_set_fields on public.asistencias;
create trigger asistencias_set_fields
  before insert on public.asistencias
  for each row execute procedure public.set_asistencia_fields();

-- Completar la fecha de los registros que ya existían.
update public.asistencias
   set fecha = (scanned_at at time zone 'America/Asuncion')::date
 where fecha is null;

-- Sacar duplicados viejos (mismo alumno, mismo día) dejando el más temprano,
-- que es la llegada real. Si no, el índice único de abajo no se puede crear.
delete from public.asistencias a
 using public.asistencias b
 where a.student_id = b.student_id
   and a.fecha      = b.fecha
   and (a.scanned_at > b.scanned_at
        or (a.scanned_at = b.scanned_at and a.id > b.id));

alter table public.asistencias alter column fecha set not null;

-- Una llegada por alumno por día.
create unique index if not exists asistencias_unicas_por_dia
  on public.asistencias (student_id, fecha);

create index if not exists asistencias_por_fecha on public.asistencias (fecha desc);
create index if not exists asistencias_por_curso_fecha on public.asistencias (course, fecha desc);

-- ── 4. Justificativos: justifican una fecha concreta ───────────────────────
alter table public.justificativos
  add column if not exists fecha date not null default current_date;

create index if not exists justificativos_por_usuario
  on public.justificativos (user_id, created_at desc);

create index if not exists justificativos_pendientes
  on public.justificativos (status, created_at desc);
