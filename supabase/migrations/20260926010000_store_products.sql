-- The storefront catalogue: products, their variants, and the three channels.
--
-- Unlike the gallery, this is not derived from anything. storeProducts was a plain
-- clone of storeProductsSeed in a bare useState — no persistence at all — so the
-- seed is initial content, not a source of truth to stay in step with. A real
-- table is therefore right, and it is seeded once from that data.
--
-- StoreProduct carries an invariant in a comment: priceMinor is "kept in sync with
-- the default (first) variant". Checked against the seed before writing this, it
-- holds for all 22 products across all three channels, and it is always the
-- RETAIL price of the first variant — never the b2b one. A comment cannot enforce
-- that, so a trigger does.

create type public.prod_channel    as enum ('b2c', 'b2b', 'mega');
create type public.store_badge     as enum ('bestseller', 'new', 'seasonal', 'limited');
create type public.store_packaging as enum ('standard', 'gift', 'bulk_case');

create table public.store_products (
  id           uuid primary key default gen_random_uuid(),
  channel      public.prod_channel not null,
  name_en      text not null check (length(trim(name_en)) > 0),
  name_ar      text not null check (length(trim(name_ar)) > 0),
  desc_en      text not null default '',
  desc_ar      text not null default '',
  category_en  text not null default '',
  category_ar  text not null default '',
  -- Maintained by store_products_sync_headline(). Writing it directly is pointless:
  -- the next variant change recomputes it.
  price_minor  bigint not null default 0 check (price_minor >= 0),
  color        text not null default '#4a2c1a',
  image        text,
  badges       public.store_badge[] not null default '{}',
  visible      boolean not null default true,
  -- A CountryCode, or 'all' / null for every market.
  country      text,
  sku          text,
  moq          int check (moq is null or moq > 0),
  net_weight   text,
  shelf_life   text,
  barcode      text,
  notes        text,
  -- StoreComponent[] — {name, qty, unit}. Kept as jsonb rather than a third table
  -- because it is only ever read and written whole, with its product, and is never
  -- queried on its own.
  components   jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(components) = 'array'),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.store_products is 'Storefront catalogue, one row per product per channel.';
comment on column public.store_products.price_minor is 'Headline "from" price. Derived from the first variant''s retail price by trigger — do not set by hand.';

create index store_products_channel_idx on public.store_products (channel);
create index store_products_visible_idx on public.store_products (channel, visible);

create table public.store_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.store_products (id) on delete cascade,
  -- Order matters: the lowest position is the default variant and sets the
  -- product's headline price.
  position            int not null default 0,
  net_weight_g        int not null check (net_weight_g > 0),
  packaging           public.store_packaging not null default 'standard',
  case_qty            int check (case_qty is null or case_qty > 0),
  retail_price_minor  bigint not null check (retail_price_minor >= 0),
  b2b_price_minor     bigint not null check (b2b_price_minor >= 0),
  in_stock            boolean not null default true,
  requires_cold_chain boolean not null default false,
  created_at          timestamptz not null default now(),
  -- caseQty is units per case, so it belongs to a case and nothing else.
  constraint store_variants_case_qty_only_for_cases
    check ((packaging = 'bulk_case') or (case_qty is null))
);

create index store_variants_product_idx on public.store_variants (product_id, position);

-- ---------------------------------------------------------------- headline price
--
-- Recomputed from the default variant on every variant change, so the "from" price
-- on a card can never drift from what the customer is actually charged. A product
-- with no variants left keeps its last headline rather than dropping to zero,
-- which would read as free.

create or replace function public.store_products_sync_headline()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target  uuid := coalesce(new.product_id, old.product_id);
  headline bigint;
begin
  select retail_price_minor into headline
    from public.store_variants
   where product_id = target
   order by position, created_at, id
   limit 1;

  if headline is not null then
    update public.store_products
       set price_minor = headline
     where id = target
       and price_minor is distinct from headline;
  end if;

  return null;
end;
$$;

revoke all on function public.store_products_sync_headline() from public, anon, authenticated;

create trigger store_variants_sync_headline
  after insert or update or delete on public.store_variants
  for each row execute function public.store_products_sync_headline();

create trigger store_products_touch before update on public.store_products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.store_products enable row level security;
alter table public.store_variants enable row level security;

-- The storefront is public, so a visitor reads what is on sale. Staff see the
-- whole catalogue, including what is held back.
create policy store_products_select_public on public.store_products
  for select to anon, authenticated
  using (visible = true);

create policy store_products_select_staff on public.store_products
  for select to authenticated
  using (public.is_staff());

create policy store_products_write_content on public.store_products
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());

-- A variant is only as public as its product: otherwise a held-back product's
-- prices would still be readable through its variants.
create policy store_variants_select_public on public.store_variants
  for select to anon, authenticated
  using (exists (
    select 1 from public.store_products p
     where p.id = store_variants.product_id and p.visible = true
  ));

create policy store_variants_select_staff on public.store_variants
  for select to authenticated
  using (public.is_staff());

create policy store_variants_write_content on public.store_variants
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());
