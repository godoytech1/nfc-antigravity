-- Antes, la corrección de una llegada solo dejaba ajustar la HORA dentro del
-- mismo día (se rechazaba moverla a otra fecha). Ahora también se puede
-- cambiar la fecha -- por ejemplo, para cargar una llegada de un día pasado
-- que nunca se escaneó. Sigue sin poder ser una fecha/hora futura, y sigue
-- sin poder reasignarse a otro alumno o curso.
--
-- Corrida UNA sola vez: Dashboard -> SQL Editor -> pegar todo -> Run.
-- (Ya se aplicó en producción directamente con la service_role key.)

create or replace function public.set_asistencia_update_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cfg        record;
  hora_local time;
  limite     time;
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
  limite     := cfg.hora_entrada + make_interval(mins => cfg.tolerancia_minutos);
  new.status := case when hora_local <= limite then 'ontime' else 'late' end;

  return new;
end;
$$;

-- El trigger ya existente (asistencias_restrict_update) sigue apuntando a
-- esta misma función -- no hace falta recrearlo, "create or replace"
-- alcanza. Si el alumno ya tenía otra llegada ese día, el índice único
-- (student_id, fecha) rechaza el cambio -- eso queda a propósito.
