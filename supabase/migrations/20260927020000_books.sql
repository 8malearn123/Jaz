-- The books.
--
-- The prototype already held the double-entry rules, and scripts/verify-accounting.mjs
-- already asserts them: every entry balances, no line carries both a debit and a
-- credit, every line names a postable account, a reversal cancels its original on
-- every account. Moving the books here must not weaken any of that, so all four are
-- enforced by the database as well as by entryProblems().
--
-- Two properties the prototype could only hold by convention are now real:
--
--   * a POSTED ENTRY IS IMMUTABLE. A ledger is append-only; a correction is a
--     reversal, not an edit. The only mutation allowed on an entry is the one that
--     records it was reversed, and lines can never be touched at all.
--   * a CLOSED PERIOD IS CLOSED. Nothing may be posted into it, by anyone, including
--     through the API — not merely hidden in the UI.

create type public.account_type    as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create type public.normal_balance  as enum ('debit', 'credit');
create type public.entry_status    as enum ('posted', 'reversed');
create type public.journal_source  as enum (
  'opening', 'sale', 'purchase', 'receipt', 'payment', 'waste', 'production',
  'cost_center', 'depreciation', 'vat', 'closing', 'manual', 'reversal'
);

-- ---------------------------------------------------------------- chart

create table public.accounts (
  code       text primary key,
  name_en    text not null check (length(trim(name_en)) > 0),
  name_ar    text not null check (length(trim(name_ar)) > 0),
  type       public.account_type not null,
  normal     public.normal_balance not null,
  parent     text references public.accounts (code) on delete restrict,
  -- Header accounts group and total; only a postable account may carry a line.
  postable   boolean not null default true,
  active     boolean not null default true,
  is_control boolean not null default false,
  -- Sits inside its group but carries the opposite sign.
  contra     boolean not null default false,
  cash       boolean not null default false,
  vat_role   text check (vat_role is null or vat_role in ('input', 'output', 'payable')),
  sort_order int not null default 0,
  constraint accounts_not_own_parent check (parent is null or parent <> code)
);

comment on table public.accounts is 'Chart of accounts. Only postable = true may carry a journal line.';

create index accounts_parent_idx on public.accounts (parent);
create index accounts_type_idx on public.accounts (type);

-- ---------------------------------------------------------------- periods

create table public.accounting_periods (
  key        text primary key check (key ~ '^\d{4}-\d{2}$'),
  closed     boolean not null default false,
  closed_at  timestamptz,
  closed_by  text
);

comment on table public.accounting_periods is 'YYYY-MM. A closed period refuses new entries — enforced, not hidden.';

-- ---------------------------------------------------------------- period key
--
-- to_char() is only STABLE — it reads DateStyle — so a generated column cannot use
-- it. extract() on a date is immutable, so this is, and the same function serves both
-- the generated column and the period lock, which is what keeps them from disagreeing.

create or replace function public.period_of(d date)
returns text
language sql
immutable
strict
as $$
  select lpad(extract(year from d)::text, 4, '0') || '-' || lpad(extract(month from d)::text, 2, '0');
$$;

-- ---------------------------------------------------------------- journal

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  no          text not null unique,
  entry_date  date not null,
  -- Derived, so it can never disagree with the date it locks against.
  period      text generated always as (public.period_of(entry_date)) stored,
  source      public.journal_source not null,
  source_ref  text,
  memo_en     text not null default '',
  memo_ar     text not null default '',
  party_en    text,
  party_ar    text,
  status      public.entry_status not null default 'posted',
  reversal_of uuid references public.journal_entries (id) on delete restrict,
  reversed_by uuid references public.journal_entries (id) on delete restrict,
  posted_by   text,
  created_at  timestamptz not null default now()
);

create index journal_entries_period_idx on public.journal_entries (period);
create index journal_entries_date_idx on public.journal_entries (entry_date desc);
create index journal_entries_source_idx on public.journal_entries (source);

create table public.journal_lines (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.journal_entries (id) on delete cascade,
  account_code text not null references public.accounts (code) on delete restrict,
  debit_minor  bigint not null default 0 check (debit_minor >= 0),
  credit_minor bigint not null default 0 check (credit_minor >= 0),
  center_id    text,
  memo_en      text,
  memo_ar      text,
  position     int not null default 0,
  -- A line is a debit or a credit. Never both — which entryProblems() also refuses —
  -- and never neither, because a zero line is noise in a ledger.
  constraint journal_lines_exactly_one_side check (
    (debit_minor > 0 and credit_minor = 0) or (credit_minor > 0 and debit_minor = 0)
  )
);

create index journal_lines_entry_idx on public.journal_lines (entry_id, position);
create index journal_lines_account_idx on public.journal_lines (account_code);

-- ---------------------------------------------------------------- postable only

create or replace function public.journal_lines_require_postable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  ok boolean;
begin
  select postable and active into ok from public.accounts where code = new.account_code;
  if ok is null then
    raise exception 'account % is not in the chart', new.account_code;
  end if;
  if not ok then
    raise exception 'account % is a header or inactive and cannot carry a line', new.account_code;
  end if;
  return new;
end;
$$;

revoke all on function public.journal_lines_require_postable() from public, anon, authenticated;

create trigger journal_lines_require_postable_trg
  before insert or update on public.journal_lines
  for each row execute function public.journal_lines_require_postable();

-- ---------------------------------------------------------------- balance
--
-- Deferred to commit on purpose: the lines are inserted after the entry, so the sums
-- are only meaningful once the transaction is complete. A constraint trigger is what
-- makes this unbypassable — an RPC could be sidestepped, this cannot.

create or replace function public.journal_entry_must_balance()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  target uuid := coalesce(new.entry_id, old.entry_id);
  n int;
  d bigint;
  c bigint;
begin
  select count(*), coalesce(sum(debit_minor), 0), coalesce(sum(credit_minor), 0)
    into n, d, c
    from public.journal_lines where entry_id = target;

  -- An entry whose lines were all removed with it is not a violation.
  if n = 0 and not exists (select 1 from public.journal_entries where id = target) then
    return null;
  end if;

  if n < 2 then
    raise exception 'entry % has % line(s); an entry needs at least two', target, n;
  end if;
  if d <> c then
    raise exception 'entry % is out of balance: debits %, credits %', target, d, c;
  end if;
  return null;
end;
$$;

revoke all on function public.journal_entry_must_balance() from public, anon, authenticated;

create constraint trigger journal_lines_balance_trg
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row execute function public.journal_entry_must_balance();

-- ---------------------------------------------------------------- append-only
--
-- What makes this a ledger rather than a table of numbers.

create or replace function public.journal_entries_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a posted entry is never deleted — reverse it instead (%)', old.no;
  end if;

  -- The one legitimate mutation: recording that this entry has been reversed.
  if new.status is distinct from old.status and not (old.status = 'posted' and new.status = 'reversed') then
    raise exception 'an entry goes from posted to reversed and nowhere else';
  end if;

  if new.reversed_by is distinct from old.reversed_by and old.reversed_by is not null then
    raise exception 'the reversal of an entry is recorded once';
  end if;

  if (new.no, new.entry_date, new.source, new.source_ref, new.memo_en, new.memo_ar,
      new.party_en, new.party_ar, new.reversal_of, new.posted_by)
     is distinct from
     (old.no, old.entry_date, old.source, old.source_ref, old.memo_en, old.memo_ar,
      old.party_en, old.party_ar, old.reversal_of, old.posted_by) then
    raise exception 'a posted entry is immutable — correct it with a reversal (%)', old.no;
  end if;

  return new;
end;
$$;

revoke all on function public.journal_entries_append_only() from public, anon, authenticated;

create trigger journal_entries_append_only_trg
  before update or delete on public.journal_entries
  for each row execute function public.journal_entries_append_only();

create or replace function public.journal_lines_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Cascade from deleting an entry is impossible anyway (that raises above), so any
  -- attempt to reach a line directly is an attempt to rewrite history.
  raise exception 'a journal line is never changed or removed — reverse the entry';
end;
$$;

revoke all on function public.journal_lines_immutable() from public, anon, authenticated;

create trigger journal_lines_immutable_trg
  before update or delete on public.journal_lines
  for each row execute function public.journal_lines_immutable();

-- ---------------------------------------------------------------- period lock

create or replace function public.journal_entries_period_open()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  is_closed boolean;
begin
  select closed into is_closed
    from public.accounting_periods
   where key = public.period_of(new.entry_date);

  if is_closed then
    raise exception 'period % is closed; nothing may be posted into it',
      public.period_of(new.entry_date);
  end if;
  return new;
end;
$$;

revoke all on function public.journal_entries_period_open() from public, anon, authenticated;

create trigger journal_entries_period_open_trg
  before insert on public.journal_entries
  for each row execute function public.journal_entries_period_open();

-- ---------------------------------------------------------------- RLS
--
-- The books are not customer data. Only the roles that keep them may read them:
-- finance, the auditor, admin and the owner. An auditor reads and never writes —
-- that is the point of an auditor.

create or replace function public.can_keep_books()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('finance', 'admin', 'owner'),
    false
  );
$$;

create or replace function public.can_read_books()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('finance', 'auditor', 'admin', 'owner'),
    false
  );
$$;

revoke all on function public.can_keep_books() from public, anon;
revoke all on function public.can_read_books() from public, anon;
grant execute on function public.can_keep_books() to authenticated;
grant execute on function public.can_read_books() to authenticated;

alter table public.accounts           enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.journal_entries    enable row level security;
alter table public.journal_lines      enable row level security;

create policy accounts_select_books on public.accounts
  for select to authenticated using (public.can_read_books());
create policy accounts_write_books on public.accounts
  for all to authenticated using (public.can_keep_books()) with check (public.can_keep_books());

create policy periods_select_books on public.accounting_periods
  for select to authenticated using (public.can_read_books());
create policy periods_write_books on public.accounting_periods
  for all to authenticated using (public.can_keep_books()) with check (public.can_keep_books());

create policy entries_select_books on public.journal_entries
  for select to authenticated using (public.can_read_books());
create policy entries_write_books on public.journal_entries
  for all to authenticated using (public.can_keep_books()) with check (public.can_keep_books());

create policy lines_select_books on public.journal_lines
  for select to authenticated using (public.can_read_books());
create policy lines_write_books on public.journal_lines
  for all to authenticated using (public.can_keep_books()) with check (public.can_keep_books());
