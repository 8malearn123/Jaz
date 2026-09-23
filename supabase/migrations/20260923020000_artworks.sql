-- The gallery, on the server.
--
-- The overlay model from ArtworksContext is preserved exactly, because it carries
-- an invariant worth keeping: the twelve commissions are DERIVED from the
-- catalogue's art cards, so a painting can never appear on a wrapper and be
-- missing from the wall. Seeding them into a table would break that — the table
-- would drift from the catalogue. So:
--
--   * seeded works stay in code, and the console edits them as a PARTIAL overlay
--     (artwork_overrides): a null column means "not overridden", so a commission's
--     story still follows the catalogue unless someone deliberately replaced it.
--   * a work defined in the console has no catalogue entry behind it, so it is
--     stored whole (artworks).
--
-- Neither table's artwork id can be a foreign key: a seeded id exists only in
-- src/data/artworks.ts. That is intentional, not an omission.

create type public.artwork_status as enum ('available', 'reserved', 'sold');

-- Who may author gallery content. Narrower than is_staff(): a support agent has
-- no business repricing a canvas.
create or replace function public.can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('content_editor', 'admin', 'owner'),
    false
  );
$$;

revoke all on function public.can_edit_content() from public, anon;
grant execute on function public.can_edit_content() to authenticated;

-- ---------------------------------------------------------------- custom works

create table public.artworks (
  id            uuid primary key default gen_random_uuid(),
  title_en      text not null,
  title_ar      text not null,
  artist_en     text not null,
  artist_ar     text not null,
  description_en text not null default '',
  description_ar text not null default '',
  medium_en     text not null default '',
  medium_ar     text not null default '',
  flavor_id     text not null,
  bar_slugs     text[] not null default '{}',
  year          int  not null,
  width_cm      numeric(8,2) not null check (width_cm > 0),
  height_cm     numeric(8,2) not null check (height_cm > 0),
  -- 0 means "priced on request" — never an invented number.
  price_minor   bigint not null default 0 check (price_minor >= 0),
  status        public.artwork_status not null default 'available',
  image         text,
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.artworks is 'Paintings defined in the console. Seeded commissions live in code and are edited through artwork_overrides.';

-- ---------------------------------------------------------------- overlay

create table public.artwork_overrides (
  -- A seeded artwork id from src/data/artworks.ts. No FK by design.
  artwork_id    text primary key,
  title_en      text,
  title_ar      text,
  artist_en     text,
  artist_ar     text,
  description_en text,
  description_ar text,
  medium_en     text,
  medium_ar     text,
  year          int,
  width_cm      numeric(8,2) check (width_cm is null or width_cm > 0),
  height_cm     numeric(8,2) check (height_cm is null or height_cm > 0),
  price_minor   bigint check (price_minor is null or price_minor >= 0),
  status        public.artwork_status,
  image         text,
  hidden        boolean,
  updated_at    timestamptz not null default now()
);

comment on table public.artwork_overrides is 'Partial edits to a seeded commission. A null column means not overridden, so the catalogue still supplies that field.';

-- ---------------------------------------------------------------- requests

create table public.acquisition_requests (
  id          uuid primary key default gen_random_uuid(),
  -- Either a seeded id or an artworks.id, as text. No FK, same reason.
  artwork_id  text not null,
  name        text not null check (length(trim(name)) > 0),
  email       text not null check (position('@' in email) > 1),
  phone       text not null default '',
  note        text not null default '',
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.acquisition_requests is 'A collector asking for an original. Insertable by anyone; readable only by staff, because it carries their contact details.';

create index acquisition_requests_artwork_idx on public.acquisition_requests (artwork_id);
create index acquisition_requests_handled_idx on public.acquisition_requests (handled);

-- ---------------------------------------------------------------- hold the canvas
--
-- Asking for a piece holds it: two collectors must never be told the same
-- one-of-one is available. The visitor doing the asking is usually anonymous and
-- has no write access to either artwork table, so the hold cannot be a second
-- client call — it happens here, definer-side, as part of the insert.

create or replace function public.reserve_on_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_custom boolean;
begin
  -- A custom work's id is a uuid; a seeded one is not, so the shape tells them
  -- apart without a lookup that RLS would filter.
  begin
    perform new.artwork_id::uuid;
    is_custom := true;
  exception when invalid_text_representation then
    is_custom := false;
  end;

  if is_custom then
    update public.artworks
       set status = 'reserved', updated_at = now()
     where id = new.artwork_id::uuid
       and status = 'available';
  else
    insert into public.artwork_overrides (artwork_id, status)
    values (new.artwork_id, 'reserved')
    on conflict (artwork_id) do update
      set status = 'reserved', updated_at = now()
      -- Never walk a sold canvas back to reserved.
      where public.artwork_overrides.status is distinct from 'sold';
  end if;

  return new;
end;
$$;

revoke all on function public.reserve_on_request() from public, anon, authenticated;

create trigger acquisition_requests_reserve
  after insert on public.acquisition_requests
  for each row execute function public.reserve_on_request();

-- ---------------------------------------------------------------- touch updated_at

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger artworks_touch before update on public.artworks
  for each row execute function public.touch_updated_at();
create trigger artwork_overrides_touch before update on public.artwork_overrides
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.artworks             enable row level security;
alter table public.artwork_overrides    enable row level security;
alter table public.acquisition_requests enable row level security;

-- artworks: the gallery is a public page, so a visitor reads what is not held
-- back. Staff see everything, including hidden works. Only content roles write.
create policy artworks_select_public on public.artworks
  for select to anon, authenticated
  using (hidden = false);

create policy artworks_select_staff on public.artworks
  for select to authenticated
  using (public.is_staff());

create policy artworks_write_content on public.artworks
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());

-- overrides: readable by everyone, because the public gallery cannot render a
-- seeded work correctly without them. They hold no personal data.
create policy artwork_overrides_select_all on public.artwork_overrides
  for select to anon, authenticated
  using (true);

create policy artwork_overrides_write_content on public.artwork_overrides
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());

-- requests: anyone may send one — a collector on /art is not signed in. Nobody
-- may read them back except staff, because they carry name, email and phone.
create policy acquisition_requests_insert_anyone on public.acquisition_requests
  for insert to anon, authenticated
  with check (handled = false);

create policy acquisition_requests_select_staff on public.acquisition_requests
  for select to authenticated
  using (public.is_staff());

create policy acquisition_requests_update_staff on public.acquisition_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy acquisition_requests_delete_admin on public.acquisition_requests
  for delete to authenticated
  using (public.is_admin());
