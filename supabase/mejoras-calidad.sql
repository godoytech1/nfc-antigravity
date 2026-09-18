-- Mejoras de calidad tras la auditoría del 2026-09-18.
-- Corrida UNA sola vez: Dashboard -> SQL Editor -> pegar todo -> Run.
-- (Ya se aplicó en producción directamente con la service_role key; este
-- archivo queda como historial y para replicarla en otro ambiente.)

-- ── 1. Asistencias: el índice único ya no puede saltarse con NULL ──────────
-- El índice "una llegada por alumno por día" es sobre (student_id, fecha),
-- pero student_id era nullable y en Postgres los NULL nunca chocan entre sí
-- en un índice único. Hoy nunca pasa (siempre se manda un alumno real), pero
-- es justo el hueco que hay que cerrar antes de sumar tarjetas NFC reales.
alter table public.asistencias alter column student_id set not null;

-- ── 2. Profiles: dejar de exponer todos los perfiles a cualquier logueado ──
-- Antes cualquier alumno autenticado podía leer nombre, curso y rol de TODAS
-- las cuentas del colegio (policy "usuarios autenticados leen perfiles" con
-- using(true)). Ahora cada uno ve solo el suyo, y el profesor ve todos.
drop policy if exists "usuarios autenticados leen perfiles" on public.profiles;

create policy "cada uno lee su propio perfil"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

-- OJO: una policy de "profiles" NO puede chequear "profesor" haciendo un
-- exists(select ... from profiles ...) inline -- eso vuelve a evaluar la
-- propia policy de profiles para resolver la subconsulta, y entra en
-- recursión infinita (error 42P17). Por eso el chequeo va en una función
-- security definer: al ejecutarse como dueña de la tabla, esa consulta
-- interna no vuelve a pasar por RLS.
create or replace function public.is_profesor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'profesor'
  );
$$;

create policy "el profesor lee todos los perfiles"
  on public.profiles for select to authenticated
  using (public.is_profesor());

-- ── 3. Justificativos: el cliente ya no decide status/nombre/curso/fecha ───
-- Antes la política de INSERT solo exigía user_id = auth.uid(): un alumno
-- podía mandar su propio justificativo ya como 'approved', o con un
-- nombre/curso/fecha inventados. Ahora un trigger server-side pisa esos
-- campos, igual que set_asistencia_fields ya hace con la hora de llegada.
alter table public.justificativos alter column user_id set not null;

create or replace function public.set_justificativo_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  perfil      record;
  actor_role  text;
begin
  select full_name, course into perfil from public.profiles where id = new.user_id;
  if perfil.full_name is not null then
    new.student_name := perfil.full_name;
  end if;
  if perfil.course is not null then
    new.course := perfil.course;
  end if;

  select role into actor_role from public.profiles where id = auth.uid();

  -- Si quien escribe no es el profesor (el propio alumno creando o
  -- reabriendo su justificativo), el status SIEMPRE vuelve a 'pending', sin
  -- importar lo que haya mandado el cliente. Solo el profesor puede dejarlo
  -- en 'approved'/'denied' (con el UPDATE que ya hace desde su pantalla).
  if actor_role is distinct from 'profesor' then
    new.status := 'pending';
    if new.fecha > current_date then
      new.fecha := current_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists justificativos_set_fields on public.justificativos;
create trigger justificativos_set_fields
  before insert or update on public.justificativos
  for each row execute procedure public.set_justificativo_fields();

-- Un justificativo activo por alumno y fecha (antes se podían mandar dos).
-- Reabrir uno rechazado es un UPDATE sobre la misma fila, no un insert nuevo.
create unique index if not exists justificativos_unico_por_dia
  on public.justificativos (user_id, fecha);

alter table public.justificativos drop constraint if exists justificativos_fecha_no_futura;
alter table public.justificativos add constraint justificativos_fecha_no_futura
  check (fecha <= current_date);

-- El alumno puede reabrir (reenviar) un justificativo que el profesor
-- rechazó, pero solo ese caso puntual -- nunca uno pendiente o ya aprobado.
-- El trigger de arriba se asegura de que vuelva a 'pending' sin excepción,
-- así que esto no le permite auto-aprobarse nada.
drop policy if exists "alumno reabre su justificativo rechazado" on public.justificativos;
create policy "alumno reabre su justificativo rechazado"
  on public.justificativos for update to authenticated
  using (user_id = auth.uid() and status = 'denied')
  with check (user_id = auth.uid());

-- ── 4. Realtime: dos tablas no estaban conectadas ──────────────────────────
-- "profiles" y "configuracion" no estaban en la publicación de Realtime, así
-- que ninguna suscripción sobre esas tablas podía recibir cambios en vivo:
-- afecta la lista de alumnos del profesor y el horario/tolerancia del panel
-- web cuando otra sesión los cambiaba.
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.configuracion;
