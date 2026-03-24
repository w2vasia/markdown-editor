-- Allow reading storage files for publicly shared documents
create policy "Public document files are readable"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      where d.user_id::text = (storage.foldername(name))[1]
        and d.id::text = split_part(storage.filename(name), '.', 1)
        and d.is_public = true
    )
  );
