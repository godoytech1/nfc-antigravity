-- Adjuntos (fotos y archivos) de los justificativos.
--
-- Correr UNA sola vez en el SQL Editor del proyecto de Supabase, después de
-- justificativos.sql y profiles.sql (usa public.is_profesor()). Es aditivo: no
-- toca ni borra nada existente, y el panel web sigue funcionando igual (solo
-- ignora la columna nueva).
--
--   1. justificativos.attachments: lista de adjuntos [{path, name, type, size}].
--   2. Bucket privado "justificativos" (máx. 10 MB por archivo, solo imágenes,
--      PDF y Word).
--   3. Políticas: cada alumno sube/ve/borra solo lo de su carpeta (<su id>/...);
--      el profesor ve y borra todo.

alter table public.justificativos
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'justificativos',
  'justificativos',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

drop policy if exists "alumno sube sus adjuntos" on storage.objects;
create policy "alumno sube sus adjuntos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'justificativos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "ver adjuntos propios o profesor" on storage.objects;
create policy "ver adjuntos propios o profesor"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'justificativos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_profesor())
  );

drop policy if exists "borrar adjuntos propios o profesor" on storage.objects;
create policy "borrar adjuntos propios o profesor"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'justificativos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_profesor())
  );
