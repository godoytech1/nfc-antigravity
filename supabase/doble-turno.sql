-- Doble turno: los mismos alumnos entran a la mañana (07:00) y a la tarde (13:00).
--
-- Correr UNA sola vez en el SQL Editor, después de logica-asistencia.sql,
-- editar-hora-llegada.sql y editar-fecha-llegada.sql.
--
-- Qué cambia:
--   1. configuracion.hora_entrada_tarde (por defecto 13:00). La tolerancia es la misma.
--   2. asistencias.turno ('manana' | 'tarde'): lo decide la BASE por la hora real de la
--      llegada, nunca el celular. Una llegada hasta una hora antes de la entrada de la
--      tarde (12:00 con la configuración por defecto) cuenta como turno mañana; desde
--      ahí, turno tarde.
--   3. puntual / tarde se calcula contra la entrada del turno que corresponde.
--   4. Una llegada por alumno por día POR TURNO (antes era una por día).
--   5. dias_de_clase ahora también dice el turno: un turno cuenta como "hubo clase"
--      si al menos un alumno del curso llegó en ese turno.
--
-- Es compatible hacia atrás: las apps y el panel que no conocen "turno" siguen
-- funcionando (la base lo completa sola).

-- ── 1. Segunda hora de entrada ─────────────────────────────────────────────
alter table public.configuracion
  add column if not exists hora_entrada_tarde time not null default '13:00';

-- ── 2. Columna turno ───────────────────────────────────────────────────────
alter table public.asistencias add column if not exists turno text not null default 'manana';
alter table public.asistencias drop constraint if exists asistencias_turno_check;
alter table public.asistencias add constraint asistencias_turno_check
  check (turno in ('manana', 'tarde'));

-- ── 3. Turno y estado calculados por la base (al registrar y al corregir) ──
create or replace function public.set_asistencia_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cfg        record;
  hora_local time;
  entrada    time;
begin
  if new.scanned_at > now() then
    raise exception 'No se puede registrar una llegada con hora futura.';
  end if;

  select * into cfg from public.configuracion where id = 1;
  new.fecha  := (new.scanned_at at time zone cfg.zona_horaria)::date;
  hora_local := (new.scanned_at at time zone cfg.zona_horaria)::time;

  new.turno := case
    when hora_local >= (cfg.hora_entrada_tarde - interval '1 hour') then 'tarde'
    else 'manana'
  end;
  entrada := case when new.turno = 'tarde' then cfg.hora_entrada_tarde else cfg.hora_entrada end;

  new.status := case
    when hora_local <= entrada + make_interval(mins => cfg.tolerancia_minutos) then 'ontime'
    else 'late'
  end;
  return new;
end;
$$;

create or replace function public.set_asistencia_update_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cfg        record;
  hora_local time;
  entrada    time;
begin
  new.student_id   := old.student_id;
  new.student_name := old.student_name;
  new.course       := old.course;

  if new.scanned_at > now() then
    raise exception 'No se puede poner una hora futura.';
  end if;

  select * into cfg from public.configuracion where id = 1;
  new.fecha  := (new.scanned_at at time zone cfg.zona_horaria)::date;
  hora_local := (new.scanned_at at time zone cfg.zona_horaria)::time;

  new.turno := case
    when hora_local >= (cfg.hora_entrada_tarde - interval '1 hour') then 'tarde'
    else 'manana'
  end;
  entrada := case when new.turno = 'tarde' then cfg.hora_entrada_tarde else cfg.hora_entrada end;

  new.status := case
    when hora_local <= entrada + make_interval(mins => cfg.tolerancia_minutos) then 'ontime'
    else 'late'
  end;
  return new;
end;
$$;

-- ── 4. Una llegada por alumno, por día y por turno ─────────────────────────
drop index if exists public.asistencias_unicas_por_dia;
create unique index if not exists asistencias_unicas_por_turno
  on public.asistencias (student_id, fecha, turno);

-- ── 5. Días de clase con turno ─────────────────────────────────────────────
create or replace view public.dias_de_clase as
  select distinct course, fecha, turno from public.asistencias;

grant select on public.dias_de_clase to authenticated;

-- ── 6. Recalcular lo que ya existía con la regla nueva ─────────────────────
-- (un UPDATE sin cambios dispara el trigger de arriba y completa turno y estado).
update public.asistencias set scanned_at = scanned_at;
