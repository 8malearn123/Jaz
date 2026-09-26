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

## Slice 3 — staff, permissions and the org chart

`employees`, plus `team_permission` and `job_role` enums.

`TeamContext` kept every staff account in a bare `useState` with **no persistence
at all** — the owner's whole team vanished on reload. That was the largest gap of
the three slices. It also closes the manual step flagged earlier: an app role can
now be granted from the console (`grantAppRole`) instead of the Supabase
dashboard.

Two invariants lived only in the client. Both are real and both are now the
database's job too, because a direct API call never passes through the UI:

* **No loops in the reporting line.** An approval that a person cannot sign climbs
  the line until someone can, so a cycle would never terminate. A `CHECK` catches
  only self-management; a longer loop (a → b → a) needs a walk, which a `CHECK`
  may not do. `employees_reject_cycle()` walks it, with a hop ceiling so a
  pre-existing loop cannot spin forever.
* **No orphaned reports.** Deleting someone lifts their reports to *that person's*
  manager. `ON DELETE SET NULL` would instead dump everyone on the owner and lose
  the middle of the chart, so `employees_reparent_reports()` does it on the way out.

`profile_id` links a staff record to a real account once one exists. Until then the
record is a definition the owner made and grants nothing by itself.

RLS: **staff read** the whole chart, because they need to see who is above them to
escalate. **Only admin/owner write** — a sales agent must not grant itself the
ledger. Nobody outside staff sees any of it; these rows carry names, phones and
email addresses.

### Verified behaviour

| Case | Result |
|---|---|
| set self as manager | refused |
| close a three-deep loop | refused |
| legitimate re-parent | allowed |
| delete the middle of the chart | report lifted to the grandparent, not orphaned |
| `perms` / `job_role` round trip | intact |
| owner creates staff, grants the ledger | 1 row each |
| **owner grants an app role** | 1 row — the console replaces the dashboard |
| `sales_agent` reads the chart | sees all (escalation line) |
| `sales_agent` grants itself the ledger | 0 rows |
| `sales_agent` deletes staff | 0 rows |
| `content_editor` reads the chart | sees all |
| `content_editor` edits staff | 0 rows — staff is not admin |
| customer reads employees | 0 rows |
| customer creates staff | refused by RLS |
| anon reads employees | 0 rows |

One earlier run appeared to show a customer reading the chart. It was the test at
fault, not the policy: an earlier step in the same run had granted that user
`content_editor`, so they were staff by then. Re-run with a user nothing promotes,
it returns 0.

Test rows deleted; all six tables empty.

`npm run smoke:team` asserts 15 invariants with no database, including that the
SQL `job_role` and `team_permission` enums still match their TypeScript unions —
so a value added on one side and forgotten on the other is caught here rather than
at runtime.

## Slice 4 — the storefront catalogue (first pass)

`store_products`, `store_variants`, and the `prod_channel` / `store_badge` /
`store_packaging` enums. Seeded with the 22 products and 23 variants from
`storeProductsSeed`.

Unlike the gallery, this is not derived from anything: `storeProducts` was a plain
clone of the seed in a bare `useState`, so the seed is initial content rather than
a source to stay in step with. A real table is therefore right.

### The headline price is derived, not stored by hand

`StoreProduct` carried this in a comment: `priceMinor` is "kept in sync with the
default (first) variant". Checked against the seed before building, it holds for
all 22 products and is always the **retail** price of the first variant, never the
b2b one. A comment cannot enforce that, so `store_products_sync_headline()` does,
recomputing on every variant insert, update and delete. Consequences:

* `productPatchToRow()` deliberately ignores `priceMinor` — the trigger owns it.
* The seed migration deliberately does not write `price_minor`. It came out correct
  for 22/22 products with no zeros, which is the proof the trigger actually runs;
  writing the column too would have hidden a broken trigger behind a plausible value.
* A product whose last variant is deleted **keeps** its previous headline rather
  than dropping to 0, because 0 reads as "free".

`case_qty` is constrained to `bulk_case` packaging only, since it means units per
case.

RLS: the storefront is public, so a visitor reads `visible = true`. A variant is
only as public as its product — otherwise a held-back product's prices would leak
through its variants. Staff read everything; only `can_edit_content()` writes.

### Verified behaviour

| Case | Result |
|---|---|
| seed writes no price | 22/22 headlines correct, 0 zeros |
| anon sees products / variants | 21 of 22, 22 of 23 — the held-back one withheld |
| a hidden product's variant | 0 rows — prices do not leak |
| anon reprices a variant | 0 rows |
| `content_editor` sees products | 22, including held back |
| reprice the **default** variant | headline follows |
| reprice a **non-default** variant | headline unchanged |
| reorder variants | headline moves to the new first |
| `case_qty` on a non-case variant | refused by the check |
| delete the last variant | headline kept, not zeroed |
| customer hides a product | 0 rows |

Test edits were reverted and the deleted variant restored; the tables are back to
22 / 23 with every headline matching.

### What this does NOT yet do

**The public storefront still reads `src/data/products.ts`, not this table.**
`ShopPage`, `ProductPage`, the cart and checkout all read the static `Product`
type; `store_products` currently feeds only the console's Products tab, which is
what `storeProducts` fed before. So editing a product in the console now persists,
but it does not yet change what a shopper sees.

Joining the two is the second pass, and it is not a wiring job: `Product` (slug,
art card, reviews, flavour, cold-chain copy) and `StoreProduct` (channel, variants,
badges, MOQ) are different shapes serving different screens. They need one model
before one table can serve both.

Also still in code: `b2cCatalog` / `stdCatalog` / `megaCatalog` (the wholesale
price lists), the category tree (`catTree`), and `OwnerProduct` with its BOM.

## Slice 5 — the public catalogue (schema and data)

`products`, `product_variants`, `product_reviews`, plus the `product_type` and
`product_line` enums. Seeded with all 15 products, 23 variants, 10 reviews and 12
art cards from `products.ts`.

### The duplication this uncovered

`products.ts` and `storeProductsSeed` describe **the same fifteen products under
different names**, and not one title matches:

| `products.ts` (public) | `storeProductsSeed` (console) |
|---|---|
| Signature Milk | Milk chocolate bar |
| Damascena Rose | Dark chocolate with rose |
| Jazan Jasmine | Dark chocolate with Arabian jasmine |
| Khawlani Coffee | Dark chocolate with coffee |
| The Orchard Box | Jasmine luxury box |

`products.ts` carries the editorial voice the client signed off (PR #78, "the
client's own words"), so it is canonical here. Whether `store_products` is then
retired into per-channel listings of this table is a **content decision with
customer-visible consequences** and is deliberately not taken by these migrations —
the three tables are identical either way.

`ProductVariant` and `StoreVariant` were checked field by field and are the same
type. They stay in two tables because they hang off two parents, but the shape and
constraints are identical on purpose, so a later merge is a data move, not a
redesign.

### The coupling that had to survive

`/art` derives its twelve commissions from these art cards, keyed `aw-<slug>`, and
slice 2's `artwork_overrides` rows reference those ids. So `slug` is unique, is the
id already in the code, and is never regenerated. Verified after seeding: 12/12
gallery slugs present; 12 distinct paintings keyed on title **and** artist **and**
story; and the three products that share the title «حين تزهر الحقول» are still
three, through the jsonb.

Reviews have one rule worth naming: a signed-in customer may leave one but may
never set `verified`, since verified means tied to a real order. Only staff set it.

### Verified behaviour

| Case | Result |
|---|---|
| gallery slugs after seeding | 12 / 12 |
| distinct art works (title+artist+story) | 12 |
| products sharing «حين تزهر الحقول» | 3 |
| anon reads catalogue / reviews | 15 / 10 |
| anon edits a product | 0 rows |
| anon posts any review | refused |
| customer posts an unverified review | 1 row |
| **customer claims `verified`** | refused |
| customer inflates a rating | 0 rows |
| `content_editor` rewrites a story | 1 row |
| `content_editor` verifies a review | 1 row |

Test rows removed and the edited story restored; the tables read 15 / 23 / 10.

### The storefront now reads it

`CatalogueProvider` holds the public catalogue, and twenty files that previously
imported `products` / `getProductById` / `getProduct` / `variantById` from the module
now read them from `useCatalogue()` instead. It sits above `CartProvider` and
`ArtworksProvider`, both of which read from it.

Two things made this more than a rename:

* **The gallery derivation.** `seededArtworks` was computed at module level from
  `products`, which cannot follow a table. It is now `deriveArtworks(catalogue)`, a
  pure function, and `ArtworksProvider` re-derives from whatever catalogue is live.
  The ids stay `aw-<slug>`, so the `artwork_overrides` rows keyed on them keep
  matching. `seededArtworks` remains as `deriveArtworks(products)` for the
  unconfigured path.
* **Hook placement.** A first mechanical pass put `useCatalogue()` inside `.map()`
  callbacks in two files and inside the wrong closure in a third — a hook-rules
  violation that also shadowed the outer binding. Driving the injection from the
  compiler's own error positions found every site; the three bad ones were then
  corrected by hand.

`variantById` is now indexed rather than scanning every product's variants, because
it is called once per cart line, per checkout summary row and per order row.

**The seed is never discarded.** It is the initial state and the fallback: if
Supabase is unconfigured, the read fails, or the table is empty, the shop shows the
seeded catalogue. `fetchPublicProducts()` returns `null` rather than `[]` for exactly
this reason — a storefront with no products is worse than a slightly stale one.

`npm run smoke:catalogue` asserts 19 invariants with no database, including that a
null art card maps to an **absent** key (not `undefined`, which is still an own key
and would break `p.artCard!`), that two bars carrying one card collapse to a single
canvas with both slugs while the same title with a different artist stays two, and
that deriving from DB-shaped rows yields the same twelve ids as the seed.

## Slice 6 — the duplication closed

`store_products` is now a **listings** table: what a product costs and whether it is
on sale in a given channel. Identity and copy live in `products`, reached through a
new nullable `product_id`.

### Why `products` won, with evidence

Not a preference. The catalogue records **Damascena Rose, Jazan Jasmine, Lavender,
Sun Papaya, Jazani Mango and Khawlani Coffee as MILK chocolate** — whole milk
powder, 38% cacao — while the operational listing names call all six "Dark chocolate
with …". "Dark 70% bar" is the catalogue's Single-Origin Dark 72%.

So the listing names are not a different voice for the same facts; they are **wrong
about the chocolate base and the percentage**. A milk product labelled dark is an
allergen problem, not a copy problem.

### What was and was not linked

There is no data key joining the two — `store_products` carries no flavour — so the
mapping is authored and spelled out row by row in the migration, and limited to
where it is unambiguous.

| | count | |
|---|---|---|
| linked | 12 | the b2c bars, by the flavour in the listing name |
| unlinked | 10 | b2b 4, b2c 3, mega 3 |

The three b2c **boxes** are deliberately not linked: "Jasmine luxury box" (220 g),
"Rose gift box" (260 g) and "Founding Day box" (300 g) are not the catalogue's
Orchard / Mountain / Full Library (250 / 250 / 500 g) — different weights, different
contents. Whether they are the same products renamed is a question about the client's
product line, and guessing it would put the wrong name on a card. **This is still
open.**

The b2b and mega listings ("Hotel amenity bar", "Assorted bar pallet", …) have no
public product page at all. They are channel-only SKUs and keep their own names.

### Two constraints hold it together

* `store_products_named_or_linked` — a listing either points at a product or carries
  its own name. Never neither, so a listing can never be unidentifiable. Tested: an
  insert with neither is refused.
* `on delete restrict` on `product_id` — a catalogue entry that something is selling
  cannot be deleted out from under its listing. Tested: refused.

Once linked, the duplicate name and description are set to null/empty, because
leaving them is what let the two drift apart in the first place.

### Verified behaviour

| Case | Result |
|---|---|
| listings linked / unlinked | 12 / 10 |
| unlinked by channel | b2b 4, b2c 3, mega 3 |
| a product listed twice | none |
| a linked row still holding a name | 0 |
| an unlinked row missing a name | 0 |
| insert with neither name nor link | refused |
| delete a product that has a listing | refused |
| a linked listing resolves its name | «Damascena Rose / الورد الدمشقي» |

`smoke:catalogue` gained five checks for this, including the dangerous one: a row
that *is* linked but whose join came back empty must yield empty strings, never
`null`, or a product card renders with no title.

## Slice 7 — orders and customers

`customers`, `orders`, `order_items`, `loyalty_ledger`, and the `loyalty_tier` /
`order_channel` / `order_status` enums.

### Three disjoint datasets, not three views

Checked before designing, and the id overlap is **zero**:

| source | rows | shape |
|---|---|---|
| `ownerOrdersSeed` | 14 (EX-*, JZ-*) | console rows whose `items` is a bilingual **summary string** |
| `customer.orders` | 3 (JAZ-2026-*) | real orders with line items and tracking, for the one demo account |
| `customerOrders` | 5 of 10 customers | per-customer summaries only |

So this was not a duplication to collapse but three separate demo datasets that
should be one table. One table now serves both views: the console list and the
account list are two queries over it. An order that only ever had a summary keeps it
in `items_summary_*`; orders with real lines get `order_items`, and every seeded line
item was verified against `product_variants` first, so that foreign key is genuine.

`order_items.unit_minor` is the price charged, stored, so a later price change cannot
rewrite what someone paid.

### Two things are derived, not stored

* **The tracking timeline.** `account.ts` computes the steps from the status, so
  storing them would be a second source of truth for one fact. `stepsOf()` now dates
  them off the real `placed_at` instead of fixed demo dates.
* **The console's 0..5 stage.** Derived by `order_owner_stage()` in SQL *and* by a
  map in TypeScript — `smoke:orders` parses the migration and asserts the two agree
  for all eight statuses, so they cannot drift into showing an order at one position
  to the owner and another to the query behind it.

`order_status` is the **union** of both vocabularies, so neither view loses a state.
`new` and `ready` exist only for the console and are shown to a shopper as
`confirmed` and `processing` rather than leaking an internal state onto a tracking
page.

### The security invariant that matters most here

This is the most personal data in the schema — names, phones, what someone bought and
where it is. A customer sees their own orders and nothing else, enforced through
`profile_id` rather than trusted from the client.

`customers_update_own` lets someone correct their phone and email. On its own that
would also let them set `tier = 'elite'` and `spend_minor = 99999999`, which is the
same defect the role guard exists for: a row-level UPDATE policy sees the new row, not
which column moved. `customers_guard_standing()` holds tier, lifetime spend, the
account link and the id immutable for them — same shape as `profiles_guard_role()`,
including reading the caller from the verified JWT rather than `current_user`. **This
guard was written before the tests ran, not after one caught it.**

### Verified behaviour

| Case | Result |
|---|---|
| Layla sees orders / line items | 1 / 2 — hers only |
| Layla sees customers / ledger | 1 / 2 — hers only |
| Layla names another order explicitly | 0 rows |
| **Layla promotes her own tier** | refused |
| **Layla inflates her lifetime spend** | refused |
| Layla corrects her own phone | 1 row |
| **Layla grants herself points** | refused |
| Layla marks her order delivered | 0 rows |
| `support_agent` sees orders / items | 2 / 3 |
| `support_agent` advances an order | 1 row |
| `support_agent` sets a tier | 1 row |
| anon sees orders / customers | 0 / 0 |

Test rows removed; the catalogue was untouched (15 products still).

`smoke:orders` asserts 28 invariants. One found a real bug in this code rather than
confirming it: `rowToOwnerOrder` built its items summary in arrival order, while its
customer-facing sibling sorted by position — so the console would have listed an
order's items in whatever order one query happened to return them. Fixed.

### The contexts now read it

`OwnerStateContext`'s order half — `orders`, `advanceOrder`, `setOrderStage`,
`cancelOrder`, `assignDepartment`, `customers`, `loyaltyLedgers`, `rewardCustomer` —
reads and writes the tables, and `CustomerContext` reads the account side.

Three things were not obvious going in:

* **The console addresses an order by `order_no`**, which is what it displays, while
  the row is keyed by uuid. `setOrderStatusByNo` resolves it so no caller holds both.
* **`advanceOrder` needed an inverse that does not exist.** The stage is derived from
  the status, and `ownerStageOf` is not injective — stage 4 is both `shipped` and
  `out_for_delivery`, stage 5 both `delivered` and `cancelled`. `statusForStage()`
  names one canonical status per stage, and `smoke:orders` asserts the round trip
  lands where it started for all six, plus that `out_for_delivery` and `cancelled`
  are reachable only by setting them directly. Without that, "advance" could move an
  order sideways into a state the console did not ask for.
* **A customer's points balance is summed from the ledger, not stored.** A redemption
  is a negative row, so summing is the only reading that cannot drift from its
  sources.
* **`rewardCustomer` writes only the ledger row** when backed. Recomputing spend and
  tier in the browser and pushing them back would be refused anyway —
  `customers_guard_standing()` holds both — and it is the ledger that is the record.

`updateProfile` sends only email and phone, the two fields the database lets a
customer change about themselves.

### What in CustomerContext is still on the seed

Stated rather than left to be discovered: subscriptions, addresses, the wallet, the
wishlist, occasions, gift recipients, consents and notification preferences have no
tables yet. Only identity and loyalty come from the server.

## Not yet on the server

Cart, accounting, governance and supply, plus the seven customer-account areas listed
above. The seven slices done so far are the pattern for the rest.
