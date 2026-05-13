# Guia de Configuração - RL Barbershop

Siga estes passos para colocar seu aplicativo no ar com Supabase e Vercel.

## 1. Configuração do Supabase

### Criar Tabelas
No SQL Editor do Supabase, execute os seguintes comandos:

```sql
-- Tabela de Serviços
create table services (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  price numeric not null,
  created_at timestamptz default now()
);

-- Tabela de Transações
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text check (type in ('income', 'expense')),
  description text not null,
  amount numeric not null,
  date date not null,
  service_id uuid references services(id) on delete set null,
  created_at timestamptz default now()
);

-- Habilitar RLS (Segurança)
alter table services enable row level security;
alter table transactions enable row level security;

-- Políticas de Segurança (O usuário só vê seus próprios dados)
create policy "Users can manage their own services" on services
  for all using (auth.uid() = user_id);

create policy "Users can manage their own transactions" on transactions
  for all using (auth.uid() = user_id);
```

### Obter Credenciais
Vá em **Project Settings > API** e copie:
- `Project URL`
- `API Key (anon public)`

## 2. Configuração no Código

No arquivo `app.js`, você pode substituir as variáveis `SUPABASE_URL` e `SUPABASE_KEY` ou deixá-las como estão para configurar via Vercel (recomendado).

## 3. Hospedagem no Vercel

1. Suba seu código para um repositório no GitHub.
2. No Vercel, clique em **Add New > Project**.
3. Importe o repositório.
4. Em **Environment Variables**, adicione:
   - `URL_DO_SUPABASE`: (Sua Project URL)
   - `KEY_DO_SUPABASE`: (Sua API Key)
5. Clique em **Deploy**.

## 4. Autenticação
No Supabase, vá em **Authentication > Providers** e garanta que o provedor de E-mail está ativo. Você precisará criar um usuário manualmente em **Authentication > Users** ou implementar uma tela de cadastro (opcional, por padrão o app usa Login).

---
**RL Barbershop** - Gestão Financeira Profissional.
