# Mapa de Agências

Sistema para localizar agências credenciadas no mapa, filtrando por status e categoria de veículo (carro, moto, alto padrão, blindado), com busca de endereço/CEP e cálculo de rota. Pensado para ser enviado a associados: a tela principal não exige login.

## Rodando localmente

**Pré-requisitos:** Node.js 20+, uma conta [Supabase](https://supabase.com) e uma conta [Mapbox](https://account.mapbox.com/).

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: em Project Settings > API no Supabase.
   - `NEXT_PUBLIC_MAPBOX_TOKEN`: em https://account.mapbox.com/access-tokens/ (token público `pk.`).
3. Rode as migrations em `supabase/migrations/0001_init.sql` no seu projeto Supabase (SQL Editor, ou `supabase db push` se usar a CLI).
4. Crie o primeiro usuário administrador em Supabase > Authentication > Users (e-mail/senha) — é essa conta que faz login em `/admin`.
5. Rode o app:
   ```bash
   npm run dev
   ```

## Estrutura de dados

- `concessionarias`: nome da loja, proprietário, status (credenciada/pré/suspensa), categorias (array: carro, moto, alto_padrao, blindado), endereço completo, lat/lng.
- `contatos`: lista dinâmica de contatos (nome + telefone) vinculada a cada concessionária (1 para N).

## Segurança

- A tela pública (`/`) só lê dados (RLS permite `select` para todos).
- Criar/editar/excluir concessionárias e contatos exige estar autenticado (`/admin`), via Supabase Auth.
- Nenhuma chave (Mapbox, Supabase) fica hardcoded no código — tudo vem de variáveis de ambiente.
