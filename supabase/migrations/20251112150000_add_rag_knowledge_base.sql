-- Enable pgvector extension if not already available
create extension if not exists vector;

-- Knowledge chunks table for RAG pipeline
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id text,
  title text not null,
  body text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Maintain updated_at column
create or replace function public.touch_knowledge_chunks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_knowledge_chunks on public.knowledge_chunks;
create trigger trg_touch_knowledge_chunks
before update on public.knowledge_chunks
for each row
execute function public.touch_knowledge_chunks_updated_at();

-- Helpful uniqueness constraint for preventing duplicate rows per source chunk
alter table public.knowledge_chunks
  add constraint knowledge_chunks_source_unique unique (source, source_id)
  deferrable initially deferred;

-- KNN index for fast similarity search (cosine distance)
create index if not exists knowledge_chunks_embedding_cosine_idx
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Match function used by edge functions to fetch similar chunks
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  source text,
  source_id text,
  title text,
  body text,
  metadata jsonb,
  similarity double precision
)
language plpgsql
stable
as $$
declare
  base_sql text := '
    select
      id,
      source,
      source_id,
      title,
      body,
      metadata,
      1 - (embedding <=> $1) as similarity
    from public.knowledge_chunks
  ';
  has_where boolean := false;
begin
  if filter ? 'source' then
    base_sql := base_sql || ' where source = $2->>''source'' ';
    has_where := true;
  end if;

  if filter ? 'tier' then
    base_sql := base_sql || case when has_where then ' and ' else ' where ' end;
    base_sql := base_sql || ' metadata @> jsonb_build_object(''tier'', $2->>''tier'') ';
    has_where := true;
  end if;

  if filter ? 'tag' then
    base_sql := base_sql || case when has_where then ' and ' else ' where ' end;
    base_sql := base_sql || ' coalesce(metadata->''tags'', ''[]''::jsonb) ? $2->>''tag'' ';
    has_where := true;
  end if;

  base_sql := base_sql || ' order by embedding <=> $1 limit $3 ';

  return query execute base_sql using query_embedding, filter, match_count;
end;
$$;

comment on function public.match_knowledge_chunks is
'Returns the top-k knowledge chunks most similar to the supplied embedding. Optional filters: source, tag, tier.';

