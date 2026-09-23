# Backend — identity & access

Supabase project `jaz-chocolate` (`mjfocpdkemoxhclmdaqk`, ap-south-1).

## What exists

| Object | Purpose |
|---|---|
| `public.app_role` | Postgres enum mirroring `RoleId` in `src/data/roles.ts` — all ten roles |
| `public.profiles` | One row per `auth.users` row. `role` is the single source of truth for access |
| `public.organizations` | B2B buying organizations; a profile may belong to one |
| `current_app_role()`, `is_staff()`, `is_privileged()`, `is_admin()` | `SECURITY DEFINER` helpers so policies can read the caller's role without RLS recursion |
| `handle_new_user()` | Creates the profile on signup, clamping the requested role to `customer`/`b2b` |
| `profiles_guard_role()` | Keeps `role` and `org_id` immutable except for an admin or a trusted server caller |

## Migrations

Applied in order. Three of the four exist because testing found real defects —
they are kept rather than squashed so the reasoning stays in the history.

1. `20260921000000_auth_roles.sql` — enum, tables, helpers, triggers, RLS.
2. `20260922000000_fix_role_grant_path.sql` — the guard refused *every* role
   change, including an administrator's, because `is_admin()` reads `auth.uid()`
   which is NULL on a server connection. Nobody could grant a role at all.
3. `20260923000000_guard_uses_jwt_role.sql` — migration 2's fix was wrong in the
   dangerous direction: it tested `current_user` inside a `SECURITY DEFINER`
   function, where `current_user` is the function's *owner*, so the guard skipped
   itself for every caller and a customer could `PATCH role='owner'`. Now decided
   from the verified JWT in `request.jwt.claims`, and inverted to fail closed.
4. `20260923010000_lock_down_function_execute.sql` — `revoke ... from anon` in
   migration 1 was a no-op, because EXECUTE is granted to `PUBLIC` by default and
   revoking from one role does not remove an inherited privilege. The helpers
   were still reachable unauthenticated; the trigger functions were exposed as
   RPC endpoints.

## Verified behaviour

Run against the live database, then the test users deleted:

| Case | Result |
|---|---|
| Signup requesting `role: owner` | Granted `customer` |
| Customer sets own `role = 'owner'` | Refused by the guard |
| Customer sets another profile's role | 0 rows — RLS filters it out |
| Customer edits own name | Allowed |
| Customer reads profiles | Sees only their own row |
| `support_agent` reads profiles | Sees all rows (staff select policy) |
| `support_agent` grants a role | 0 rows — not an admin |
| `owner` grants `finance` from the browser | 1 row — works |

A denial takes one of two shapes: the guard raises on your own row, and RLS
silently returns zero rows for anyone else's. Both deny; only the first errors.

## Known, accepted advisory

The linter warns that `is_staff()` / `is_admin()` / `is_privileged()` /
`current_app_role()` are callable by `authenticated`. That is deliberate — the
RLS policies call them and a policy's function calls are permission-checked
against the querying role. Each one reports only the caller's own role, so there
is nothing to leak. `anon` has no grant.

## Not yet on the server

Only identity. The other ~180 types and ~225 context mutators (catalogue,
orders, cart, artworks, accounting, governance) are still seeded data in
`src/data/` and React state. `profiles` and `organizations` are the pattern the
rest should follow.
