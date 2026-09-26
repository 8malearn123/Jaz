-- The public catalogue — what a shopper actually sees.
--
-- This is the second half of the catalogue slice, and it exists because of a
-- duplication found in the data rather than planned for: products.ts and
-- storeProductsSeed describe THE SAME fifteen products under different names.
-- products.ts carries the client-approved editorial voice ("Damascena Rose",
-- "Khawlani Coffee", "The Orchard Box"); storeProductsSeed carries operational
-- naming ("Dark chocolate with rose", "Jasmine luxury box"). Zero titles match.
--
-- The editorial copy is the one customers read and the one the client signed off,
-- so it is canonical here. Whether store_products is then retired into this
-- table's per-channel listings is a separate decision and is NOT taken by this
-- migration — these three tables are identical either way.
--
-- One coupling to keep in view: /art derives its twelve commissions from these art
-- cards, keyed `aw-<slug>`, and slice 2's artwork_overrides rows use those ids. The
-- slugs here must therefore stay stable, which is why slug is unique and not
-- regenerated.

create type public.product_type as enum ('bar', 'gift_box', 'bundle', 'collection');
create type public.product_line as enum ('signature', 'seasonal', 'corporate_gifting', 'limited');

create table public.products (
  id            text primary key,
  sku           text not null unique,
  -- The public URL segment, and the key /art hangs its canvases from. Stable.
  slug          text not null unique,
  type          public.product_type not null,
  line          public.product_line not null,
  title_en      text not null check (length(trim(title_en)) > 0),
  title_ar      text not null check (length(trim(title_ar)) > 0),
  flavor_id     text not null,
  cocoa_pct     int check (cocoa_pct is null or (cocoa_pct between 1 and 100)),
  ingredients_en text not null default '',
  ingredients_ar text not null default '',
  story_en      text not null default '',
  story_ar      text not null default '',
  -- Bilingual[] — read and written whole with the product, never queried alone.
  allergens     jsonb not null default '[]'::jsonb
                  check (jsonb_typeof(allergens) = 'array'),
  badges        public.store_badge[] not null default '{}',
  -- The collectible card crediting the painting. Null for a box that carries none.
  art_card      jsonb check (art_card is null or jsonb_typeof(art_card) = 'object'),
  -- Aggregates shown on a card. Kept as columns because they are read far more
  -- often than the reviews behind them, and a seeded product's figures predate any
  -- review row.
  rating        numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count  int not null default 0 check (review_count >= 0),
  pairs_with    text[] not null default '{}',
  occasions     text[] not null default '{}',
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.products is 'The public catalogue. Canonical product identity and copy; store_products holds per-channel commercial listings.';
comment on column public.products.slug is 'Stable: /art keys its commissions aw-<slug>, and artwork_overrides rows reference those ids.';

create index products_type_idx on public.products (type);
create index products_flavor_idx on public.products (flavor_id);

-- ---------------------------------------------------------------- variants
--
-- ProductVariant and StoreVariant are field-for-field the same type — checked, not
-- assumed. They stay in two tables because they hang off two different parents,
-- but the shape and its constraints are deliberately identical, so a later merge is
-- a data move rather than a redesign.

create table public.product_variants (
  id                  text primary key,
  product_id          text not null references public.products (id) on delete cascade,
  position            int not null default 0,
  net_weight_g        int not null check (net_weight_g > 0),
  packaging           public.store_packaging not null default 'standard',
  case_qty            int check (case_qty is null or case_qty > 0),
  retail_price_minor  bigint not null check (retail_price_minor >= 0),
  b2b_price_minor     bigint not null check (b2b_price_minor >= 0),
  in_stock            boolean not null default true,
  requires_cold_chain boolean not null default false,
  constraint product_variants_case_qty_only_for_cases
    check ((packaging = 'bulk_case') or (case_qty is null))
);

create index product_variants_product_idx on public.product_variants (product_id, position);

-- ---------------------------------------------------------------- reviews

create table public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products (id) on delete cascade,
  author_en   text not null default '',
  author_ar   text not null default '',
  rating      int not null check (rating between 1 and 5),
  body_en     text not null default '',
  body_ar     text not null default '',
  -- A verified review is one tied to a real order. Only staff may set it, so it
  -- cannot be claimed by whoever is writing.
  verified    boolean not null default false,
  review_date date not null default current_date,
  created_at  timestamptz not null default now()
);

create index product_reviews_product_idx on public.product_reviews (product_id);

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_reviews  enable row level security;

-- The catalogue is the storefront: everyone reads it. There is no `visible` column
-- here on purpose — whether a product is on sale is a property of its channel
-- listing (store_products.visible), not of the product itself.
create policy products_select_all on public.products
  for select to anon, authenticated using (true);

create policy products_write_content on public.products
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());

create policy product_variants_select_all on public.product_variants
  for select to anon, authenticated using (true);

create policy product_variants_write_content on public.product_variants
  for all to authenticated
  using (public.can_edit_content())
  with check (public.can_edit_content());

create policy product_reviews_select_all on public.product_reviews
  for select to anon, authenticated using (true);

-- A signed-in customer may leave a review, but never mark it verified.
create policy product_reviews_insert_customer on public.product_reviews
  for insert to authenticated
  with check (verified = false);

create policy product_reviews_write_staff on public.product_reviews
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
