-- Permite al profesor corregir la HORA de una llegada ya registrada (no
-- solo el status). El estado puntual/tarde se recalcula siempre server-side
-- a partir de esa hora -- nunca lo manda el cliente directamente. Reemplaza
-- la corrección anterior (correccion-manual-asistencia.sql), que solo
-- dejaba tocar el status sin poder ajustar la hora.
--
-- Corrida UNA sola vez: Dashboard -> SQL Editor -> pegar todo -> Run.
-- (Ya se aplicó en producción directamente con la service_role key.)

-- El INSERT sigue siendo intocable para todo lo que no sea una corrección
-- explícita del profesor: un escaneo real (o "marcar llegada ahora") sigue
-- usando SIEMPRE la hora real del servidor. Acá solo se agrega que si en el
-- futuro alguna vez se manda una hora explícita al insertar, no se acepte
-- una fecha futura -- sigue sin poder "adelantarse" a una llegada.
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
  if new.scanned_at > now() then
    raise exception 'No se puede registrar una llegada con hora futura.';
  end if;

  select * into cfg from public.configuracion where id = 1;
  new.fecha  := (new.scanned_at at time zone cfg.zona_horaria)::date;
  hora_local := (new.scanned_at at time zone cfg.zona_horaria)::time;
  limite     := cfg.hora_entrada + make_interval(mins => cfg.tolerancia_minutos);

  new.status := case when hora_local <= limite then 'ontime' else 'late' end;
  return new;
end;
$$;

-- La corrección manual (UPDATE) ahora sí puede tocar scanned_at, pero:
--  - nunca puede reasignar la fila a otro alumno/curso.
--  - no puede mover la llegada a un día distinto al que ya tenía.
--  - no puede ser una hora futura.
--  - el status se recalcula siempre acá, nunca lo manda el cliente.
create or replace function public.set_asistencia_update_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cfg         record;
  hora_local  time;
  limite      time;
  fecha_nueva date;
begin
  new.student_id   := old.student_id;
  new.student_name := old.student_name;
  new.course       := old.course;

  if new.scanned_at > now() then
    raise exception 'No se puede poner una hora futura.';
  end if;

  select * into cfg from public.configuracion where id = 1;
  fecha_nueva := (new.scanned_at at time zone cfg.zona_horaria)::date;

  if fecha_nueva <> old.fecha then
    raise exception 'No se puede mover una llegada a otro día (era el %).', old.fecha;
  end if;

  new.fecha  := fecha_nueva;
  hora_local := (new.scanned_at at time zone cfg.zona_horaria)::time;
  limite     := cfg.hora_entrada + make_interval(mins => cfg.tolerancia_minutos);
  new.status := case when hora_local <= limite then 'ontime' else 'late' end;

  return new;
end;
$$;

drop trigger if exists asistencias_restrict_update on public.asistencias;
create trigger asistencias_restrict_update
  before update on public.asistencias
  for each row execute procedure public.set_asistencia_update_fields();
