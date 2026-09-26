-- Orders and customers.
--
-- The prototype held three DISJOINT order datasets, not three views of one — checked
-- before designing this, and the id overlap is zero:
--
--   * ownerOrdersSeed — 14 operational rows (EX-*, JZ-*) for the console, whose
--     `items` is a bilingual SUMMARY STRING, not line items;
--   * customer.orders — 3 real orders (JAZ-2026-*) for the one demo account, with
--     line items and tracking;
--   * customerOrders — per-customer summaries for 5 of the 10 owner customers.
--
-- One table now serves all three, and the console list and the account list become
-- two queries over it rather than two datasets. Orders that only ever had a summary
-- keep it in items_summary_*; orders with real lines get order_items, and every one
-- of those line items resolves to a real product_variants row — verified, so the
-- foreign key is genuine rather than decorative.
--
-- The tracking timeline is NOT stored. account.ts derives it from the status, so
-- storing it would be a second source of truth for the same fact.

create type public.loyalty_tier  as enum ('basic', 'silver', 'gold', 'elite');
create type public.order_channel as enum ('B2C', 'B2B', 'MEGA');

-- The union of both vocabularies, so neither view loses a state. The console speaks
-- new/confirmed/prod/ready/shipped/done; the account speaks
-- confirmed/processing/shipped/out_for_delivery/delivered/cancelled.
create type public.order_status as enum (
  'new', 'confirmed', 'processing', 'ready',
  'shipped', 'out_for_delivery', 'delivered', 'cancelled'
);

create table public.customers (
  id            text primary key,
  -- Set once this customer has a real sign-in. Until then the row is a record the
  -- owner keeps; it grants nothing.
  profile_id    uuid unique references public.profiles (id) on delete set null,
  name_en       text not null check (length(trim(name_en)) > 0),
  name_ar       text not null check (length(trim(name_ar)) > 0),
  email         text,
  phone         text,
  kind          public.order_channel not null default 'B2C',
  tier          public.loyalty_tier not null default 'basic',
  -- Lifetime spend is the tier axis. Kept as a column because the console lists ten
  -- customers at a time and the orders behind a lifetime figure may predate this
  -- table; it is not derived so it cannot silently disagree with a partial history.
  spend_minor   bigint not null default 0 check (spend_minor >= 0),
  member_since  date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.customers is 'People and organizations that buy. profile_id links one to a real account once it exists.';
comment on column public.customers.spend_minor is 'Lifetime spend, the tier axis. Deliberately stored, not derived — history may predate this table.';

create index customers_profile_idx on public.customers (profile_id);
create index customers_tier_idx on public.customers (tier);

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique,
  customer_id   text references public.customers (id) on delete set null,
  channel       public.order_channel not null,
  status        public.order_status not null default 'new',
  placed_at     date not null default current_date,
  total_minor   bigint not null default 0 check (total_minor >= 0),
  -- The console shows a unit count next to the summary.
  qty           int not null default 0 check (qty >= 0),
  is_gift       boolean not null default false,
  cold_chain    boolean not null default false,
  carrier_en    text,
  carrier_ar    text,
  tracking_no   text,
  -- Owner-side operational fields.
  sla_met       boolean not null default true,
  department_en text,
  department_ar text,
  -- Only for an order that never had line items (the console's seeded rows).
  items_summary_en text,
  items_summary_ar text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.orders.items_summary_en is 'Display-only summary for an order with no line items. Prefer order_items.';

create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);
create index orders_placed_idx on public.orders (placed_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  -- A real reference: every seeded line item was checked against product_variants
  -- before this was written.
  variant_id  text not null references public.product_variants (id) on delete restrict,
  qty         int not null check (qty > 0),
  -- The price charged, which must not follow a later price change.
  unit_minor  bigint not null default 0 check (unit_minor >= 0),
  position    int not null default 0
);

create index order_items_order_idx on public.order_items (order_id, position);

create table public.loyalty_ledger (
  id          uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  kind        text not null check (kind in ('order', 'grant', 'campaign', 'redeem')),
  source_en   text not null default '',
  source_ar   text not null default '',
  -- Negative for a redemption; that is the whole point of a ledger.
  points      int not null,
  at_date     date not null default current_date,
  created_at  timestamptz not null default now()
);

create index loyalty_ledger_customer_idx on public.loyalty_ledger (customer_id, at_date desc);

-- ---------------------------------------------------------------- owner stage
--
-- The console renders a 0..5 stage. Derived here rather than stored, so it can never
-- disagree with the status. out_for_delivery reads as shipped from the console's
-- side; cancelled has no stage of its own and is shown by the status instead.

create or replace function public.order_owner_stage(s public.order_status)
returns int
language sql
immutable
as $$
  select case s
    when 'new'              then 0
    when 'confirmed'        then 1
    when 'processing'       then 2
    when 'ready'            then 3
    when 'shipped'          then 4
    when 'out_for_delivery' then 4
    when 'delivered'        then 5
    when 'cancelled'        then 5
  end;
$$;

-- ---------------------------------------------------------------- tier guard
--
-- customers_update_own below lets someone correct their own phone and email. Without
-- this it would also let them set tier = 'elite' and spend_minor = 99999999, which is
-- the same defect the role guard exists for: a row-level UPDATE policy sees the new
-- row, not which column moved. Same shape as profiles_guard_role(), including
-- reading the caller from the verified JWT rather than current_user, which inside a
-- SECURITY DEFINER function is the function's owner.

create or replace function public.customers_guard_standing()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  );
  trusted_server boolean :=
    jwt_role = 'service_role'
    or (jwt_role = '' and current_user not in ('anon', 'authenticated'));
begin
  if not trusted_server and not public.is_staff() then
    if new.tier is distinct from old.tier then
      raise exception 'a loyalty tier is set by the business, not by the customer';
    end if;
    if new.spend_minor is distinct from old.spend_minor then
      raise exception 'lifetime spend is set by the business, not by the customer';
    end if;
    if new.profile_id is distinct from old.profile_id then
      raise exception 'account linkage is set by the business';
    end if;
    if new.id is distinct from old.id then
      raise exception 'a customer id is not reassignable';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.customers_guard_standing() from public, anon, authenticated;

create trigger customers_guard_standing_trg
  before update on public.customers
  for each row execute function public.customers_guard_standing();

create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS
--
-- This is the most personal data in the schema: names, phones, what someone bought
-- and where it is. The rule is that a customer sees their own orders and nothing
-- else, and that is enforced through profile_id rather than trusted from the client.

alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.loyalty_ledger enable row level security;

create policy customers_select_own on public.customers
  for select to authenticated
  using (profile_id = auth.uid());

create policy customers_select_staff on public.customers
  for select to authenticated
  using (public.is_staff());

-- A customer may correct their own contact details. Tier, lifetime spend and the
-- account link are held immutable for them by customers_guard_standing() above.
create policy customers_update_own on public.customers
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy customers_write_staff on public.customers
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy orders_select_own on public.orders
  for select to authenticated
  using (customer_id in (select id from public.customers where profile_id = auth.uid()));

create policy orders_select_staff on public.orders
  for select to authenticated
  using (public.is_staff());

create policy orders_write_staff on public.orders
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- A line item is exactly as visible as its order.
create policy order_items_select_own on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
     join public.customers c on c.id = o.customer_id
    where o.id = order_items.order_id and c.profile_id = auth.uid()
  ));

create policy order_items_select_staff on public.order_items
  for select to authenticated
  using (public.is_staff());

create policy order_items_write_staff on public.order_items
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy loyalty_select_own on public.loyalty_ledger
  for select to authenticated
  using (customer_id in (select id from public.customers where profile_id = auth.uid()));

create policy loyalty_select_staff on public.loyalty_ledger
  for select to authenticated
  using (public.is_staff());

-- Points are issued by the business, never by the person receiving them.
create policy loyalty_write_staff on public.loyalty_ledger
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
