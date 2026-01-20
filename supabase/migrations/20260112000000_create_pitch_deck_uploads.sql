-- Create storage bucket for pitch deck uploads
insert into storage.buckets (id, name, public)
values ('pitch-deck-uploads', 'pitch-deck-uploads', true)
on conflict (id) do nothing;

-- Storage RLS policies
drop policy if exists "Users can upload pitch decks" on storage.objects;
drop policy if exists "Users can read own pitch decks" on storage.objects;
drop policy if exists "Users can delete own pitch decks" on storage.objects;
drop policy if exists "Service role can read pitch decks" on storage.objects;

create policy "Users can upload pitch decks"
on storage.objects for insert
with check (
  bucket_id = 'pitch-deck-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own pitch decks"
on storage.objects for select
using (
  bucket_id = 'pitch-deck-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own pitch decks"
on storage.objects for delete
using (
  bucket_id = 'pitch-deck-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Service role can read pitch decks"
on storage.objects for select
using (
  bucket_id = 'pitch-deck-uploads'
  and auth.role() = 'service_role'
);

-- Create pitch_deck_analyses table
create table if not exists pitch_deck_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  file_name text not null,
  file_size integer,
  storage_path text,
  overall_score numeric(5,2),
  verdict text,
  story_clarity_score numeric(5,2),
  market_opportunity_score numeric(5,2),
  traction_proof_score numeric(5,2),
  business_model_score numeric(5,2),
  team_credibility_score numeric(5,2),
  fundraising_readiness_score numeric(5,2),
  strengths text[] default '{}',
  weaknesses text[] default '{}',
  recommendations text[] default '{}',
  key_insights jsonb default '{}',
  analysis_version text default '1.0',
  user_rating integer check (user_rating >= 1 and user_rating <= 5),
  user_feedback text,
  feedback_submitted_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_pitch_deck_analyses_user_id on pitch_deck_analyses(user_id);
create index if not exists idx_pitch_deck_analyses_created_at on pitch_deck_analyses(created_at desc);

alter table pitch_deck_analyses enable row level security;

drop policy if exists "Users can view own analyses" on pitch_deck_analyses;
drop policy if exists "Users can insert own analyses" on pitch_deck_analyses;
drop policy if exists "Users can update own analyses" on pitch_deck_analyses;

create policy "Users can view own analyses"
on pitch_deck_analyses for select
using (auth.uid() = user_id);

create policy "Users can insert own analyses"
on pitch_deck_analyses for insert
with check (auth.uid() = user_id);

create policy "Users can update own analyses"
on pitch_deck_analyses for update
using (auth.uid() = user_id);

create or replace function update_pitch_deck_analyses_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pitch_deck_analyses_updated_at on pitch_deck_analyses;
create trigger pitch_deck_analyses_updated_at
  before update on pitch_deck_analyses
  for each row
  execute function update_pitch_deck_analyses_updated_at();
