-- Pin the search_path on the two functions that were missing it.
--
-- Both are SECURITY INVOKER and take a value in and give a derived value out, so neither
-- was a privilege hole. period_of() is worth fixing anyway, and not only because the
-- linter says so: journal_entries.period is a STORED GENERATED column computed by it, and
-- the period lock compares against it. A function with an unpinned search_path resolves
-- lpad() and extract() through whatever the session's search_path happens to be, so a
-- shadowing function in an earlier schema would not raise an error — it would quietly
-- file entries under the wrong month, which is the one thing the generated column exists
-- to prevent.
--
-- Bodies are unchanged; this adds the SET clause and nothing else, so the generated
-- column and the trigger keep computing exactly what they computed before.

create or replace function public.period_of(d date)
returns text
language sql
immutable
strict
set search_path = pg_catalog, pg_temp
as $$
  select lpad(extract(year from d)::text, 4, '0') || '-' || lpad(extract(month from d)::text, 2, '0');
$$;

create or replace function public.order_owner_stage(s public.order_status)
returns int
language sql
immutable
set search_path = pg_catalog, pg_temp
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
