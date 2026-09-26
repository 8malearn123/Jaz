-- store_products becomes a listings table: what a product costs and whether it is
-- on sale in a given channel. Identity and copy live in products.
--
-- Why products wins, with evidence rather than preference. The catalogue records
-- Damascena Rose, Jazan Jasmine, Lavender, Sun Papaya, Jazani Mango and Khawlani
-- Coffee as MILK chocolate — whole milk powder, 38% cacao — while the operational
-- listing names call all six "Dark chocolate with …". "Dark 70% bar" is the
-- catalogue's Single-Origin Dark 72%. So the listing names are not merely a
-- different voice, they are wrong about the base and the percentage, and a milk
-- product labelled dark is an allergen problem, not a copy problem.
--
-- There is no data key joining the two: store_products carries no flavour. The
-- mapping below is therefore authored, spelled out row by row so it can be audited,
-- and deliberately limited to the twelve bars, where the flavour in the listing name
-- makes it unambiguous.
--
-- NOT linked, on purpose:
--   * the three b2c boxes. "Jasmine luxury box" (220 g), "Rose gift box" (260 g) and
--     "Founding Day box" (300 g) are not the catalogue's Orchard / Mountain / Full
--     Library (250 / 250 / 500 g) — different weights, different contents. Whether
--     they are the same products renamed is a question about the client's product
--     line, not something to infer here.
--   * the four b2b and three mega listings. "Hotel amenity bar", "Assorted bar
--     pallet" and the rest have no public product page at all; they are channel-only
--     SKUs and keep their own names.

alter table public.store_products
  add column product_id text references public.products (id) on delete restrict;

comment on column public.store_products.product_id is 'The catalogue entry this listing sells. Null for a channel-only SKU with no public page.';

create index store_products_product_idx on public.store_products (product_id);

-- A linked listing takes its name from the product, so the duplicate is dropped.
alter table public.store_products alter column name_en drop not null;
alter table public.store_products alter column name_ar drop not null;
alter table public.store_products drop constraint if exists store_products_name_en_check;
alter table public.store_products drop constraint if exists store_products_name_ar_check;

-- Every listing must be identifiable: either it points at a product, or it carries
-- its own name. Never neither.
alter table public.store_products
  add constraint store_products_named_or_linked
  check (product_id is not null or (name_en is not null and name_ar is not null));

-- ---------------------------------------------------------------- the mapping

update public.store_products sp set product_id = m.pid
from (values
  ('Dark 70% bar',                        'p-dark'),      -- catalogue: Single-Origin Dark 72%
  ('Dark 60% bar',                        'p-dark60'),
  ('Milk chocolate bar',                  'p-milk'),      -- Signature Milk
  ('Dark chocolate with Arabian jasmine', 'p-jasmine'),   -- Jazan Jasmine — milk, not dark
  ('Dark chocolate with rose',            'p-rose'),      -- Damascena Rose — milk, not dark
  ('Dark chocolate with coffee',          'p-coffee'),    -- Khawlani Coffee — milk, not dark
  ('Dark chocolate with sea salt',        'p-seasalt'),
  ('Dark chocolate with chili',           'p-chili'),
  ('Dark chocolate with lavender',        'p-lavender'),  -- Lavender Milk — milk, not dark
  ('Dark chocolate with mango',           'p-mango'),     -- Jazani Mango — milk, not dark
  ('Dark chocolate with papaya',          'p-papaya'),    -- Sun Papaya — milk, not dark
  ('Dark chocolate with banana',          'p-banana')
) as m(listing_name, pid)
where sp.channel = 'b2c' and sp.name_en = m.listing_name;

-- Now the operational names are redundant for those twelve, and keeping them would
-- let the two drift apart again — which is the whole defect this closes.
update public.store_products
   set name_en = null, name_ar = null,
       desc_en = '', desc_ar = ''
 where product_id is not null;
