-- Status deixa de ser uma lista fixa no código e vira uma tabela configurável no admin.

create table if not exists status_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null default '#10B981',
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table status_tipos enable row level security;

create policy "status_tipos_select_public" on status_tipos
  for select using (true);

create policy "status_tipos_insert_auth" on status_tipos
  for insert to authenticated with check (true);

create policy "status_tipos_update_auth" on status_tipos
  for update to authenticated using (true) with check (true);

create policy "status_tipos_delete_auth" on status_tipos
  for delete to authenticated using (true);

-- Seed com os 3 status que já existiam
insert into status_tipos (nome, cor, ordem) values
  ('CREDENCIADA', '#10B981', 1),
  ('PRÉ CREDENCIADA', '#3B82F6', 2),
  ('SUSPENSA', '#EF4444', 3)
on conflict (nome) do nothing;

-- Garante que toda concessionária aponte para um status existente na tabela.
-- on update cascade: renomear um status atualiza automaticamente quem o usa.
-- on delete restrict (padrão): impede excluir um status que ainda está em uso.
alter table concessionarias
  add constraint concessionarias_status_fkey
  foreign key (status) references status_tipos(nome) on update cascade;
