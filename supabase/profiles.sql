-- Cuentas de usuario reales (Supabase Auth) para el Sistema NFC (C.N.S.I.L.)
--
-- Correr UNA sola vez en el proyecto de Supabase:
--   Dashboard -> SQL Editor -> New query -> pegar todo esto -> Run
--
-- Además hace falta UN cambio de configuración (no es SQL):
--   Dashboard -> Authentication -> Sign In / Providers -> Email
--   -> apagar "Confirm email"
-- Sin esto, después de crear la cuenta Supabase manda un correo de
-- confirmación y el alumno/profesor no puede entrar hasta hacer clic ahí.
-- Como es una app interna del colegio (no pública), lo más práctico es
-- dejar que entre directo apenas se registra.

-- Tabla con los datos de cada cuenta (nombre, rol, curso). auth.users ya
-- guarda el correo y la contraseña —no hace falta duplicarlos acá.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('alumno', 'profesor')),
  course     text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "usuarios autenticados leen perfiles" on public.profiles;
create policy "usuarios autenticados leen perfiles"
  on public.profiles for select
  to authenticated using (true);

drop policy if exists "el usuario crea su propio perfil" on public.profiles;
create policy "el usuario crea su propio perfil"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

drop policy if exists "el usuario actualiza su propio perfil" on public.profiles;
create policy "el usuario actualiza su propio perfil"
  on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Al crear una cuenta (supabase.auth.signUp con options.data), este trigger
-- copia nombre/curso a public.profiles automáticamente. security definer
-- porque el usuario recién creado todavía no tiene permiso propio para
-- insertar (se lo da la política de arriba, pero el trigger corre antes).
--
-- IMPORTANTE: el rol se fija SIEMPRE en 'alumno' acá adentro, sin mirar lo
-- que mande la app. Si se leyera new.raw_user_meta_data->>'role' tal cual,
-- cualquiera podría autoasignarse 'profesor' con solo tocar un botón distinto
-- en el login y listo — sería un agujero de seguridad, no un detalle de UI.
-- Para que alguien sea profesor hay que promoverlo a mano (ver el UPDATE de
-- ejemplo al final de este archivo).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, course)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'alumno',
    new.raw_user_meta_data->>'course'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Columna para saber de quién es cada justificativo (justificativos.sql la
-- creó sin dueño porque todavía no existían las cuentas).
alter table public.justificativos add column if not exists user_id uuid references auth.users(id);

-- justificativos.sql dejó las políticas abiertas para el rol "anon" (sin
-- login, porque todavía no existían las cuentas). Ahora que hay cuentas
-- reales las reemplazamos por unas que sí respetan quién es cada uno:
-- un alumno ve y crea solo lo suyo, y solo un profesor puede aprobar/rechazar.
drop policy if exists "anon lee justificativos" on public.justificativos;
drop policy if exists "anon crea justificativos" on public.justificativos;
drop policy if exists "anon actualiza justificativos" on public.justificativos;

create policy "alumno lee lo suyo, profesor lee todo"
  on public.justificativos for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor')
  );

create policy "alumno crea su propio justificativo"
  on public.justificativos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "solo el profesor cambia el estado"
  on public.justificativos for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'profesor'));

-- La política de UPDATE de arriba solo chequea que sea SU fila (auth.uid() =
-- id) — no impide que en esa misma llamada mande role:'profesor'. Este
-- trigger ignora cualquier cambio de rol que venga de la propia sesión del
-- usuario (auth.uid() = fila que está tocando). Cuando SOS VOS corriendo un
-- UPDATE desde acá, el SQL Editor, no hay sesión de usuario (auth.uid() es
-- null), así que el promover a alguien a profesor con el ejemplo de abajo
-- sigue funcionando normal.
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role <> old.role and auth.uid() = old.id then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_self_change on public.profiles;
create trigger profiles_prevent_role_self_change
  before update on public.profiles
  for each row execute procedure public.prevent_role_self_change();

-- ── Para convertir una cuenta en profesor ──────────────────────────────────
-- No hay registro de profesores desde la app (a propósito, ver arriba). El
-- primer profesor se crea así: esa persona se registra normalmente como
-- alumno desde la app (con su correo real) y después vos corrés esto una vez,
-- cambiando el correo:
--
--   update public.profiles set role = 'profesor', course = null
--   where id = (select id from auth.users where email = 'profe@cnsil.edu.py');
