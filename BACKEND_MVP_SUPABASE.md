# Backend MVP - PaceUp (Supabase)

## 1) Objetivo

Criar um backend simples, escalavel e seguro para:
- Sincronizar treinos entre dispositivos.
- Persistir historico de corrida, treino de tiro, configuracoes e calibracao.
- Suportar modo offline-first no app, com sincronizacao posterior.

Stack alvo:
- Banco: PostgreSQL (Supabase)
- Auth: Supabase Auth
- API: Supabase REST (PostgREST) + RPC quando necessario
- Funcoes: Supabase Edge Functions (apenas para regras mais complexas)

---

## 2) Regras de negocio principais

1. O app sempre salva local primeiro.
2. Tudo que nao subiu para nuvem fica com sync_status = pending.
3. Ao detectar internet e usuario autenticado, envia pendencias.
4. Conflito simples por updated_at (last-write-wins no MVP).
5. Dados sempre ligados ao user_id autenticado.

---

## 3) Modelo de dados (SQL)

```sql
-- Extensoes uteis
create extension if not exists pgcrypto;

-- Perfis
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sessao de treino (corrida completa)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m numeric(10,2) not null default 0,
  elapsed_seconds integer not null default 0,
  average_pace_min_km numeric(6,3),
  music_file_name text,
  music_mode text check (music_mode in ('follow_music','target_pace')),
  source_device_id text,
  sync_status text not null default 'synced' check (sync_status in ('pending','synced','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_updated on sessions(user_id, updated_at desc);

-- Pontos de rota da sessao
create table if not exists session_points (
  id bigint generated always as identity primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric(8,2),
  speed_ms numeric(8,3),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(session_id, seq)
);

create index if not exists idx_session_points_session_seq on session_points(session_id, seq);

-- Templates de treino de tiro
create table if not exists interval_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  source_device_id text,
  sync_status text not null default 'synced' check (sync_status in ('pending','synced','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interval_templates_user_updated on interval_templates(user_id, updated_at desc);

-- Blocos do template de tiro
create table if not exists interval_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references interval_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,
  name text not null,
  mode text not null check (mode in ('tempo','distancia')),
  value integer not null check (value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, seq)
);

create index if not exists idx_interval_blocks_template_seq on interval_blocks(template_id, seq);

-- Historico de calibracao de passada
create table if not exists calibration_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stride_m numeric(6,4) not null,
  confidence integer check (confidence between 0 and 100),
  source text default 'app',
  source_device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calibration_user_created on calibration_history(user_id, created_at desc);

-- Configuracoes do app por usuario
create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coach_enabled boolean not null default false,
  intro_disabled boolean not null default false,
  preferred_music_mode text check (preferred_music_mode in ('follow_music','target_pace')),
  preferred_rate_control text check (preferred_rate_control in ('manual','auto')),
  preferred_target_pace_min_km numeric(6,3),
  updated_at timestamptz not null default now()
);

-- Trigger de updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger trg_sessions_updated_at
before update on sessions
for each row execute function set_updated_at();

create trigger trg_interval_templates_updated_at
before update on interval_templates
for each row execute function set_updated_at();

create trigger trg_interval_blocks_updated_at
before update on interval_blocks
for each row execute function set_updated_at();

create trigger trg_calibration_updated_at
before update on calibration_history
for each row execute function set_updated_at();

create trigger trg_app_settings_updated_at
before update on app_settings
for each row execute function set_updated_at();
```

---

## 4) Seguranca (RLS)

Aplicar RLS em todas as tabelas com user_id e permitir apenas dono:

```sql
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table session_points enable row level security;
alter table interval_templates enable row level security;
alter table interval_blocks enable row level security;
alter table calibration_history enable row level security;
alter table app_settings enable row level security;

create policy profiles_owner_all on profiles
for all using (id = auth.uid()) with check (id = auth.uid());

create policy sessions_owner_all on sessions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy session_points_owner_all on session_points
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interval_templates_owner_all on interval_templates
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interval_blocks_owner_all on interval_blocks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy calibration_owner_all on calibration_history
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy app_settings_owner_all on app_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

---

## 5) API minima (MVP)

Leitura incremental por updated_at e escrita por upsert.

1. Sessoes
- POST/UPSERT sessions
- GET sessions?updated_at=gt.<last_sync>

2. Pontos da sessao
- POST em lote session_points
- GET session_points?session_id=eq.<id>

3. Templates de tiro
- POST/UPSERT interval_templates
- POST/UPSERT interval_blocks
- GET interval_templates?updated_at=gt.<last_sync>
- GET interval_blocks?template_id=eq.<id>

4. Calibracao
- POST calibration_history
- GET calibration_history?order=created_at.desc&limit=1

5. Configuracoes
- UPSERT app_settings
- GET app_settings (single)

Obs: deletar no MVP preferencialmente via soft delete (sync_status = deleted).

---

## 6) Protocolo de sincronizacao (app)

### Escrita local
- Toda operacao grava no storage local imediatamente.
- Marca item como pending e atualiza updated_at local.

### Upload
- Em background, envia pendentes por tabela.
- Se sucesso, marca como synced localmente.

### Download incremental
- Usa last_sync_at por tabela.
- Busca itens com updated_at > last_sync_at.
- Faz merge local por id.

### Conflito
- Regra MVP: vence maior updated_at.
- Em caso de empate, vence source_device_id lexicograficamente (regra deterministica).

---

## 7) Contratos TypeScript (app)

```ts
export type SyncStatus = 'pending' | 'synced' | 'deleted';

export interface SessionDTO {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  distance_m: number;
  elapsed_seconds: number;
  average_pace_min_km?: number | null;
  music_file_name?: string | null;
  music_mode?: 'follow_music' | 'target_pace' | null;
  source_device_id?: string | null;
  sync_status: SyncStatus;
  updated_at: string;
}

export interface IntervalTemplateDTO {
  id: string;
  user_id: string;
  name: string;
  notes?: string | null;
  sync_status: SyncStatus;
  updated_at: string;
}
```

---

## 8) Fases de implementacao

### Fase 1 (1-2 dias)
- Provisionar Supabase projeto.
- Executar schema SQL + RLS.
- Integrar Auth anonimo/email (conforme necessidade).

### Fase 2 (2-4 dias)
- Implementar cliente de sync no app para sessions, points e settings.
- Garantir retry com backoff para falhas de rede.

### Fase 3 (2-3 dias)
- Integrar templates e blocos de tiro.
- Integrar calibracao historica.

### Fase 4 (opcional)
- Edge Functions para agregados (estatisticas semanais).
- Ranking social e compartilhamento.

---

## 9) Checklist de pronto para producao (MVP)

- RLS ativo em todas as tabelas.
- Nenhuma operacao CRUD sem auth.uid.
- Soft delete implementado.
- Sync com retry e idempotencia.
- Testes de conflito basicos.
- Monitoramento de erros de sync.

---

## 10) Comando operacional sugerido

Durante desenvolvimento mobile, manter o fluxo:
- npm run android:update

Com Android Studio automatico:
- npm run android:update:open

Isso reduz risco de abrir build antiga no celular.
