-- The fixed-asset register.
--
-- The last of the nine accounting panels to live only in the browser. An asset is bought
-- once and consumed over years, so the register is what keeps its cost out of the month
-- it was paid for: cost, the account it is capitalised in, the straight-line life, and
-- how much of that life had run when the book opened.
--
-- The arithmetic stays in src/data/fixedAssets.ts and is NOT duplicated here. Monthly
-- depreciation, accumulated depreciation and net book value are all derived from these
-- four columns, and a derived figure stored twice is a figure that can disagree with
-- itself. What the database owns is the register's rows and the one rule the client
-- cannot be trusted with — see below.

create type public.asset_category as enum ('equipment', 'vehicles', 'fixtures');

create table public.fixed_assets (
  -- Human reference (FA-01), not a uuid, because the journal files an acquisition under
  -- it: assetPurchaseEntry() sets source_ref to this id, so it is a cross-reference a
  -- person reads in the ledger and not merely a key.
  id             text primary key check (length(trim(id)) > 0),
  name_en        text not null check (length(trim(name_en)) > 0),
  name_ar        text not null check (length(trim(name_ar)) > 0),
  category       public.asset_category not null,
  cost_minor     bigint not null check (cost_minor > 0),
  -- Straight-line life in months. Zero would make the monthly charge a division by zero.
  life_months    int not null check (life_months > 0),
  in_service_en  text not null default '',
  in_service_ar  text not null default '',
  -- Months of life already consumed when the opening balance was struck. NOT bounded by
  -- life_months on purpose: a book can open holding an asset that is already written off,
  -- and accumulatedAfter() clamps, so the arithmetic is right and the fact is recordable.
  opening_months int not null default 0 check (opening_months >= 0),
  -- Which cost centre carries its depreciation. No foreign key: cost centres are still
  -- seed-only, exactly as journal_lines.center_id is.
  center_id      text,
  created_at     timestamptz not null default now()
);

comment on table public.fixed_assets is
  'Fixed-asset register. Depreciation is derived from cost and life_months, never stored.';

create index fixed_assets_category_idx on public.fixed_assets (category);

-- ---------------------------------------------------------------- deletion
--
-- The console offers a delete, for an asset typed in by mistake. Once the journal
-- accounts for an asset, deleting the row is no longer a correction — it leaves account
-- 1410/1420/1430 carrying a cost for an asset the register does not list, and stops the
-- schedule charging something 1490 is still accumulating against. The books would then
-- disagree with the register, silently, with nothing to point at.
--
-- The journal accounts for an asset in one of two ways, and both are refusable here:
--
--   * a posted entry names it — assetPurchaseEntry() files the acquisition under the
--     asset's own id, so source_ref = id finds it;
--   * the book OPENED with it, so its cost is inside the opening entry, where it appears
--     only in aggregate and cannot be found by reference. opening_months > 0 is exactly
--     that set: the console always creates an asset with opening_months = 0, because an
--     asset bought now starts its life now. verify-books.mjs asserts that.

create or replace function public.fixed_assets_refuse_booked_delete()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.opening_months > 0 then
    raise exception 'the book opened holding % — its cost is in the opening entry, so it is disposed of, not deleted', old.id;
  end if;

  -- "Accounts for" means a LIVE, non-reversal entry names it — the same definition
  -- entryForRef() uses in src/state/LedgerContext.tsx. Both exclusions are load-bearing,
  -- and the second was found by testing the promise this message makes: a reversal carries
  -- the reversed entry's source_ref, so checking only status left the asset permanently
  -- undeletable and the instruction to "reverse that entry" impossible to follow.
  if exists (
    select 1 from public.journal_entries
     where source_ref = old.id
       and status = 'posted'
       and source <> 'reversal'
  ) then
    raise exception 'the journal accounts for % — reverse that entry before removing the asset', old.id;
  end if;

  return old;
end;
$$;

revoke all on function public.fixed_assets_refuse_booked_delete() from public, anon, authenticated;

create trigger fixed_assets_refuse_booked_delete_trg
  before delete on public.fixed_assets
  for each row execute function public.fixed_assets_refuse_booked_delete();

-- ---------------------------------------------------------------- RLS
--
-- The register is part of the books, so it reads and writes with them: finance, the
-- auditor, admin and the owner may read it; the auditor may not change it.

alter table public.fixed_assets enable row level security;

create policy fixed_assets_select_books on public.fixed_assets
  for select to authenticated using (public.can_read_books());
create policy fixed_assets_write_books on public.fixed_assets
  for all to authenticated using (public.can_keep_books()) with check (public.can_keep_books());
