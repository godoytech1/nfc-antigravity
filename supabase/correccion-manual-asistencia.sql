-- Permite que el profesor corrija a mano una llegada ya registrada (marcar
-- puntual/tarde) desde la pantalla de Clases, además de poder "hacerla
-- llegar" manualmente si todavía no tiene registro hoy (eso ya funcionaba
-- con un INSERT normal, esto agrega el UPDATE que faltaba).
--
-- Corrida UNA sola vez: Dashboard -> SQL Editor -> pegar todo -> Run.
-- (Ya se aplicó en producción directamente con la service_role key.)

drop policy if exists "el profesor corrige el estado de una asistencia" on public.asistencias;
create policy "el profesor corrige el estado de una asistencia"
  on public.asistencias for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));

-- El profesor ya tiene DELETE completo sobre esta tabla (limpiar datos de
-- prueba), así que darle UPDATE no es un salto de confianza grande — pero
-- igual se acota a SOLO poder tocar el status, nada más: no puede reescribir
-- la hora real de una llegada ni reasignarla a otro alumno.
create or replace function public.restrict_asistencia_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.student_id   := old.student_id;
  new.student_name := old.student_name;
  new.course       := old.course;
  new.scanned_at   := old.scanned_at;
  new.fecha        := old.fecha;
  if new.status not in ('ontime', 'late') then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists asistencias_restrict_update on public.asistencias;
create trigger asistencias_restrict_update
  before update on public.asistencias
  for each row execute procedure public.restrict_asistencia_update();
