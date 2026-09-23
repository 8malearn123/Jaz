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

## Slice 2 — the gallery

`artworks`, `artwork_overrides`, `acquisition_requests`.

The overlay model from `ArtworksContext` is preserved rather than flattened,
because it carries an invariant: the twelve commissions are *derived* from the
catalogue's art cards, so a painting can never hang on a wrapper and be missing
from the wall. Seeding them into a table would let the table drift from the
catalogue. So a seeded work stays in code and is edited as a **partial** override
(a null column means the catalogue still supplies that field), while a
console-defined work is stored whole. Neither id can be a foreign key — a seeded
id exists only in `src/data/artworks.ts`.

`can_edit_content()` is narrower than `is_staff()`: a support agent has no
business repricing a canvas. Only `content_editor`, `admin`, `owner` write.

### The interesting part: an anonymous visitor holds a canvas

`/art` is public, so the collector asking for an original is usually not signed
in and has no write access to either artwork table. But asking must reserve the
piece, or two collectors get told the same one-of-one is available. So the hold is
applied by `reserve_on_request()`, a definer-side trigger on the insert into
`acquisition_requests` — not by a second client call, which RLS would refuse. It
tells a custom work from a seeded one by whether the id parses as a uuid, and it
never walks a `sold` canvas back to `reserved`.

Requests are insertable by anyone and readable only by staff, because they carry
a name, an email and a phone number.

### Verified behaviour

| Case | Result |
|---|---|
| anon reads artworks | sees non-hidden only |
| anon reprices a canvas | 0 rows |
| anon sends a request | inserted |
| anon reads requests back | 0 rows — PII withheld |
| anon requests a seeded work | override row created, `status = reserved` |
| anon requests a custom work | `artworks.status = reserved` |
| new request on a **sold** canvas | stays `sold`, both paths |
| `content_editor` reprices / overrides | 1 row each |
| `content_editor` reads requests | sees all |
| `content_editor` promotes self | refused by the identity guard |
| plain shopper reprices | 0 rows |
| plain shopper reads requests | 0 rows |

Test rows were deleted afterwards; all five tables are empty.

`npm run smoke:gallery` asserts the mapping invariants with no database — chiefly
that a null override column yields **no key**, so merging a patch over a seeded
work cannot erase the catalogue's title, story or price.

## Not yet on the server

Catalogue, orders, cart, accounting and governance are still seeded data in
`src/data/` and React state — roughly 180 types and 225 context mutators. The two
slices done so far are the pattern for the rest.
