-- Tarjetas NFC reales (MIFARE Classic 1K) vinculadas a alumnos.
--
-- Cada tarjeta tiene un UID único de fábrica (hex, p. ej. 04A31F2B). Esta tabla une
-- ese UID con el alumno dueño. El profesor la llena desde la app (Escanear: al
-- acercar una tarjeta desconocida se elige al alumno y se confirma).
--
-- Reglas:
--  * Una tarjeta pertenece a un solo alumno (uid es clave primaria) y un alumno
--    tiene una sola tarjeta (user_id es único). Para reemplazar una tarjeta perdida
--    se borra el vínculo anterior y se inserta el nuevo (lo hace la app).
--  * Solo el profesor puede ver, crear y borrar vínculos. El alumno no ve nada.
--  * No hay UPDATE: reasignar = borrar + insertar.
--
-- Corrida UNA sola vez: Dashboard -> SQL Editor -> pegar todo -> Run.
-- Requiere public.is_profesor() (de mejoras-calidad.sql).

create table if not exists public.tarjetas_nfc (
  uid        text primary key check (uid ~ '^[0-9A-F]{8,20}$'),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.tarjetas_nfc enable row level security;

drop policy if exists "el profesor lee las tarjetas" on public.tarjetas_nfc;
create policy "el profesor lee las tarjetas"
  on public.tarjetas_nfc for select to authenticated
  using (public.is_profesor());

drop policy if exists "el profesor vincula tarjetas" on public.tarjetas_nfc;
create policy "el profesor vincula tarjetas"
  on public.tarjetas_nfc for insert to authenticated
  with check (public.is_profesor());

drop policy if exists "el profesor desvincula tarjetas" on public.tarjetas_nfc;
create policy "el profesor desvincula tarjetas"
  on public.tarjetas_nfc for delete to authenticated
  using (public.is_profesor());
