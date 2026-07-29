alter table public.demo_studio_projects
  add column if not exists acquisition_source text;

alter table public.demo_studio_demos
  add column if not exists asset_mode text;

alter table public.demo_studio_demos
  drop constraint if exists demo_studio_demos_asset_mode_check;

alter table public.demo_studio_demos
  add constraint demo_studio_demos_asset_mode_check
  check (
    asset_mode is null
    or asset_mode in ('uploaded_screenshots', 'generated_placeholders')
  );

create index if not exists demo_studio_projects_acquisition_source_idx
  on public.demo_studio_projects (acquisition_source)
  where acquisition_source is not null;
