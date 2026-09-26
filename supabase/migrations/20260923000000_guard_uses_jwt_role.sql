-- The previous fix to profiles_guard_role() was wrong, and wrong in the
-- dangerous direction: it let a browser session promote itself to owner.
--
-- It decided "is this a browser request?" with current_user, inside a
-- SECURITY DEFINER function. Inside such a function current_user is the
-- function's OWNER (postgres), never the caller — so the test was false for
-- every caller, the guard skipped itself unconditionally, and a plain customer
-- could PATCH role='owner' through profiles_update_own. Verified by test before
-- this migration: two customer rows became owner.
--
-- The caller's identity has to come from something a SECURITY DEFINER context
-- cannot launder. PostgREST puts the verified JWT in request.jwt.claims for
-- every API request and the client cannot forge it, so that is the signal.
--
-- The logic is also inverted to fail closed: the guard applies unless the caller
-- is positively proven to be a trusted server context. An unrecognised or
-- missing signal now enforces the guard rather than skipping it.

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  -- '' when there is no JWT at all, i.e. a direct server connection
  -- (migration, psql, seed script) rather than an API request.
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );

  -- Trusted iff the service key was used, or there is no API request in play at
  -- all. Every end-user request carries 'authenticated' or 'anon' here and is
  -- therefore untrusted, whatever the database role happens to be.
  trusted_server boolean :=
    jwt_role = 'service_role'
    or (jwt_role = '' and current_user not in ('anon', 'authenticated'));
begin
  if not trusted_server then
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'role is granted by an administrator, not self-assigned';
    end if;

    if new.org_id is distinct from old.org_id and not public.is_admin() then
      raise exception 'organization membership is assigned by an administrator';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
