-- Schema inicial: concessionárias + contatos dinâmicos
-- Leitura pública (mapa é enviado para associados, sem login).
-- Escrita só para usuários autenticados (painel /admin via Supabase Auth).

create table if not exists concessionarias (
  id uuid primary key default gen_random_uuid(),
  nome_loja text not null,
  proprietario text,
  status text not null default 'PRÉ CREDENCIADA',
  categorias text[] not null default '{}',
  endereco text not null,
  bairro text,
  cidade text not null,
  regiao text,
  estado text,
  cep text,
  horario_de_funcionamento text,
  informacoes text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contatos (
  id uuid primary key default gen_random_uuid(),
  concessionaria_id uuid not null references concessionarias(id) on delete cascade,
  nome text not null,
  telefone text not null,
  created_at timestamptz not null default now()
);

create index if not exists contatos_concessionaria_id_idx on contatos(concessionaria_id);

alter table concessionarias enable row level security;
alter table contatos enable row level security;

-- Leitura pública (mapa sem login)
create policy "concessionarias_select_public" on concessionarias
  for select using (true);

create policy "contatos_select_public" on contatos
  for select using (true);

-- Escrita apenas para usuários autenticados (painel admin)
create policy "concessionarias_insert_auth" on concessionarias
  for insert to authenticated with check (true);

create policy "concessionarias_update_auth" on concessionarias
  for update to authenticated using (true) with check (true);

create policy "concessionarias_delete_auth" on concessionarias
  for delete to authenticated using (true);

create policy "contatos_insert_auth" on contatos
  for insert to authenticated with check (true);

create policy "contatos_update_auth" on contatos
  for update to authenticated using (true) with check (true);

create policy "contatos_delete_auth" on contatos
  for delete to authenticated using (true);

-- updated_at automático
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger concessionarias_set_updated_at
  before update on concessionarias
  for each row execute function set_updated_at();
