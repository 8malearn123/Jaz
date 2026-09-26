-- profiles_guard_role() was too strict to be usable.
--
-- It refused any role change unless public.is_admin() returned true, and
-- is_admin() reads auth.uid(). On a server-side connection — the service_role
-- key, a migration, psql — auth.uid() is NULL, so is_admin() was false and the
-- trigger refused. The effect was that nobody could grant a role at all: not an
-- owner through the console, not a seed script, not a backend job. The guard has
-- to stop a browser session escalating itself without also locking out the
-- administrator it exists to serve.
--
-- The distinction is the database role PostgREST is running as. A browser
-- request arrives as `anon` or `authenticated`; the service_role key arrives as
-- `service_role`; migrations run as `postgres`/`supabase_admin`. Only the first
-- group is untrusted, and only it needs is_admin() to be true.

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- True for a request that came through the API as an end user. A trusted
  -- server-side caller is anything else, and is allowed to grant.
  from_browser boolean := current_user in ('anon', 'authenticated');
begin
  if new.role is distinct from old.role and from_browser and not public.is_admin() then
    raise exception 'role is granted by an administrator, not self-assigned';
  end if;

  if new.org_id is distinct from old.org_id and from_browser and not public.is_admin() then
    raise exception 'organization membership is assigned by an administrator';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
