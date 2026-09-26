-- Staff accounts, their permissions, and the org chart they hang on.
--
-- TeamContext kept all of this in a bare useState with no persistence at all, so
-- every employee the owner created vanished on reload. That is the gap this
-- closes, and it also removes a manual step: roles can now be granted from the
-- console instead of the Supabase dashboard.
--
-- Two invariants were enforced only in the client. Both are real, and both are
-- now the database's job as well, because a direct API call bypasses the UI:
--
--   * the reporting line may not close a loop (an approval escalating up a cycle
--     would never terminate);
--   * deleting someone must not orphan their reports — they move up to that
--     person's own manager, which an ON DELETE clause cannot express.

create type public.team_permission as enum (
  'orders', 'purchases', 'raw', 'production', 'waste',
  'products', 'customers', 'suppliers', 'reports', 'accounting', 'ledger'
);

-- Mirrors JobRole in src/data/governance.ts. What a person IS, and therefore
-- what they may approve.
create type public.job_role as enum (
  'sys_admin', 'finance_mgr', 'accountant', 'chef',
  'production', 'warehouse', 'purchasing', 'sales', 'auditor'
);

create table public.employees (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null check (length(trim(name_en)) > 0),
  name_ar     text not null check (length(trim(name_ar)) > 0),
  title_en    text not null default '',
  title_ar    text not null default '',
  phone       text not null default '',
  email       text not null default '',
  perms       public.team_permission[] not null default '{}',
  active      boolean not null default true,
  job_role    public.job_role,
  manager_id  uuid references public.employees (id) on delete set null,
  -- Set once this person has a real sign-in. Until then the record is just a
  -- staff definition the owner made; it grants nothing on its own.
  profile_id  uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint employees_not_own_manager check (manager_id is null or manager_id <> id)
);

comment on table public.employees is 'Staff the owner defines in the console. profile_id links one to a real account once it exists.';
comment on column public.employees.perms is 'Per-section grants. A job_role seeds these client-side; they stay editable per person.';

create index employees_manager_idx on public.employees (manager_id);
create index employees_active_idx on public.employees (active);

-- ---------------------------------------------------------------- no cycles
--
-- The CHECK above catches only self-management. A longer loop (a → b → a) needs a
-- walk, which a CHECK cannot do because it may not query other rows.

create or replace function public.employees_reject_cycle()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  cursor_id uuid := new.manager_id;
  hops      int  := 0;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'that would make the reporting line a loop';
    end if;

    -- A pre-existing loop elsewhere in the table must not spin forever. The chart
    -- cannot be deeper than the staff count, so anything past that is a cycle.
    hops := hops + 1;
    if hops > (select count(*) + 1 from public.employees) then
      raise exception 'the reporting line already contains a loop';
    end if;

    select manager_id into cursor_id from public.employees where id = cursor_id;
  end loop;

  return new;
end;
$$;

revoke all on function public.employees_reject_cycle() from public, anon, authenticated;

create trigger employees_reject_cycle_trg
  before insert or update of manager_id, id on public.employees
  for each row execute function public.employees_reject_cycle();

-- ---------------------------------------------------------------- no orphans
--
-- Reports move up to the departing person's own manager. ON DELETE SET NULL would
-- instead dump everyone on the owner, losing the middle of the chart.

create or replace function public.employees_reparent_reports()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.employees
     set manager_id = old.manager_id, updated_at = now()
   where manager_id = old.id;
  return old;
end;
$$;

revoke all on function public.employees_reparent_reports() from public, anon, authenticated;

create trigger employees_reparent_reports_trg
  before delete on public.employees
  for each row execute function public.employees_reparent_reports();

create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- RLS

alter table public.employees enable row level security;

-- Staff read the whole chart: an approval that a person cannot sign climbs the
-- reporting line, so they need to see who is above them. Nobody outside staff
-- sees any of it — these rows carry names, phones and email addresses.
create policy employees_select_staff on public.employees
  for select to authenticated
  using (public.is_staff());

-- Only an admin or the owner defines staff. A sales agent must not be able to
-- grant themselves the ledger.
create policy employees_write_admin on public.employees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
