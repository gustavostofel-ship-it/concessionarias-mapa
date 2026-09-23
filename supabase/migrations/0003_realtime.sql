-- Habilita o Supabase Realtime nas tabelas públicas, para que o mapa
-- reflita edições feitas no admin na hora, sem precisar recarregar a página.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'concessionarias'
  ) then
    alter publication supabase_realtime add table public.concessionarias;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contatos'
  ) then
    alter publication supabase_realtime add table public.contatos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'status_tipos'
  ) then
    alter publication supabase_realtime add table public.status_tipos;
  end if;
end $$;
