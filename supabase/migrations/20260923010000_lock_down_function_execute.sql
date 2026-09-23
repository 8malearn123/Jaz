-- Two findings from the database linter, both real.
--
-- 1. `revoke execute ... from anon` in the first migration was a no-op. EXECUTE
--    on a new function is granted to PUBLIC by default, and revoking from one
--    role does not remove a privilege inherited through PUBLIC. The helpers were
--    still callable unauthenticated at /rest/v1/rpc/is_admin and friends. They
--    only ever report the CALLER's own role, so nothing leaked — but an
--    unauthenticated RPC surface that was meant to be closed is worth closing.
--
-- 2. The trigger functions were exposed as RPC endpoints too. Calling a trigger
--    function directly errors out, so there was no usable attack, but they have
--    no business being in the API surface at all.
--
-- The helpers are re-granted to `authenticated` on purpose: RLS policies on
-- profiles and organizations call them, and a policy's function calls are
-- permission-checked against the querying role. Every policy here is `to
-- authenticated`, so `anon` needs nothing.

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_staff()         from public, anon;
revoke all on function public.is_privileged()    from public, anon;
revoke all on function public.is_admin()         from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_staff()         to authenticated;
grant execute on function public.is_privileged()    to authenticated;
grant execute on function public.is_admin()         to authenticated;

-- Trigger functions: invoked by the triggers themselves, which do not consult
-- EXECUTE privileges. Nobody needs to call these.
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.profiles_guard_role()   from public, anon, authenticated;
