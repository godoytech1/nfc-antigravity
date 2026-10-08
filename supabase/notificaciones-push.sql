-- Notificaciones push al profesor cuando llega (o se reenvía) un justificativo.
--
-- Correr UNA sola vez en el SQL Editor, después de profiles.sql (usa is_profesor()).
-- Es aditivo: no toca nada existente y un fallo al notificar NUNCA bloquea el
-- envío del justificativo.
--
--   1. push_tokens: un token de notificaciones por celular del profesor. Nadie
--      lo lee ni escribe directo (RLS sin políticas): se registra/borra con las
--      funciones registrar_push_token / quitar_push_token, que solo aceptan al profesor.
--   2. Trigger en justificativos: arma el aviso y lo manda al servicio de push de
--      Expo con pg_net (llamada HTTP asíncrona desde la base).

create extension if not exists pg_net;

create table if not exists public.push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;
-- (sin políticas a propósito: solo las funciones de abajo y el trigger acceden)

create or replace function public.registrar_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_profesor() then
    return;
  end if;
  -- Un token es de un celular: si otro profesor entra en el mismo celular, pasa a ser suyo.
  insert into public.push_tokens (token, user_id)
  values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id;
end;
$$;

create or replace function public.quitar_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.registrar_push_token(text) from public, anon;
revoke all on function public.quitar_push_token(text) from public, anon;
grant execute on function public.registrar_push_token(text) to authenticated;
grant execute on function public.quitar_push_token(text) to authenticated;

create or replace function public.notificar_justificativo()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  avisos jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', case when tg_op = 'INSERT' then 'Nuevo justificativo' else 'Justificativo reenviado' end,
           'body', new.student_name || ' (' || new.course || '): ' || left(new.reason, 120),
           'sound', 'default',
           'channelId', 'justificativos',
           'priority', 'high',
           'data', jsonb_build_object('tipo', 'justificativo', 'id', new.id)
         )), '[]'::jsonb)
    into avisos
    from public.push_tokens t;

  if jsonb_array_length(avisos) > 0 then
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := avisos,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
exception when others then
  -- El aviso es secundario: jamás debe impedir que se guarde el justificativo.
  return new;
end;
$$;

-- Justificativo nuevo.
drop trigger if exists justificativos_notificar on public.justificativos;
create trigger justificativos_notificar
  after insert on public.justificativos
  for each row
  execute function public.notificar_justificativo();

-- Reenvío: el alumno reabre uno rechazado y vuelve a 'pending'.
drop trigger if exists justificativos_notificar_reenvio on public.justificativos;
create trigger justificativos_notificar_reenvio
  after update on public.justificativos
  for each row
  when (old.status is distinct from 'pending' and new.status = 'pending')
  execute function public.notificar_justificativo();
