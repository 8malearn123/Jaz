# JAZ Chocolate — Commerce Storefront

A premium, **bilingual (Arabic RTL / English LTR)** B2B/B2C commerce storefront for **JAZ Chocolate**, a Jazan-rooted Saudi luxury chocolate house. This is the interactive prototype described in the production architecture document — the storefront and B2B credit experience built faithfully on the JAZ design system.

> *Where Jazan's harvest meets world-class confection.*

Built with **React + Vite + TypeScript + Tailwind CSS**.

---

## What's inside

A complete, navigable storefront that demonstrates both commerce modes from one catalogue:

| Area | Route | Highlights |
|---|---|---|
| **Home** | `/` | Cinematic dark hero, flavor library, curated collections, heritage story, corporate band, newsletter |
| **Shop** | `/shop` | Channel-aware pricing, flavor / type filters, sorting, deep-linkable `?flavor=` |
| **Product** | `/product/:slug` | Variants (weight × packaging), story, ingredients & allergens, collectible **art-card** crediting the artist, verified reviews, cold-chain notice |
| **Collections** | `/collections` | Gift-box features with "add the box" curation |
| **Corporate** | `/corporate` | B2B value props, the *governed-credit* explainer, price-list tiers, Wathq/ZATCA account application |
| **Heritage** | `/heritage` | The region, the five Jazan motifs, the commissioned artists, sourcing & cold-chain |
| **Cart** | `/cart` | Channel-aware lines, cold-chain handling, VAT 15%, free-shipping threshold |
| **Checkout** | `/checkout` | Per-channel payment methods **and the signature B2B governed-credit flow** |
| **Business portal** | `/account` | Credit account dashboard — limit / available / reserved / outstanding, append-only ledger, statements, limit-increase request |

### The spine: governed B2B credit

The architecture's most important rule — *"credit is governed, never implicit; over-limit spending is structurally impossible"* — is implemented end-to-end on the checkout page. Switch the checkout channel to **Business account**, choose **Account credit terms**, and preview an order against your credit gate:

- **Within available credit** → the order reserves credit and issues a ZATCA *standard* invoice on the account's terms (e.g. Net 30).
- **Over the limit** → checkout holds and offers exactly the three architecture-defined paths:
  1. **Reduce the order**
  2. **Pay the excess now** by card / mada (reserve the available, pay the shortfall)
  3. **Request a higher limit** → opens a limit-increase application and notifies the assigned sales rep (a human, finance-approved decision).

### The books: one double-entry ledger

The owner console's **Accounting** section is a working double-entry accounting system, not a reporting view. Every document raised anywhere in the console — a sale, a supplier invoice, a settlement, a write-off, a cost-centre load, a depreciation run — posts a balanced journal entry, and everything else is a reading of that one book.

| Sub-view | What it is |
|---|---|
| **Chart of accounts** | The Saudi/IFRS-style chart (1 أصول · 2 خصوم · 3 حقوق ملكية · 4 إيرادات · 5 مصروفات), with live balances |
| **Journal** | Every entry, newest first, plus the manual-entry form — which will not submit unbalanced |
| **General ledger** | One account's movements with the balance carried down, each row naming its source document |
| **Trial balance** | Every balance on the side it stands, and the proof the two columns agree |
| **Financial statements** | Income statement, balance sheet and a *direct* cash flow built from what actually moved through cash and bank |
| **VAT** | The 15% return — output tax, input tax, net due — filed and settled as real entries |
| **Receivables & payables** | Aging bands, each checked against the control account that summarises it |
| **Fixed assets** | Straight-line register; running the month posts a line per asset against the centre that uses it |
| **Period close** | Pre-close checks with their own figures, then the closing entry that carries the result to retained earnings |
| **Cost centres** | The analytical dimension every posting can be tagged with — unchanged, now tied into the ledger |

Four rules are enforced by the book itself, not by the forms:

1. **An unbalanced entry cannot be posted.** Debits equal credits or nothing happens.
2. **A posted entry is never edited or deleted.** The only correction is a reversal, which posts the mirror image and leaves both on the record.
3. **A closed period accepts nothing further.**
4. **Control accounts must equal their subledgers** — trade receivables equals the collection list, trade payables the unpaid supplier invoices.

The book opens agreeing with every screen that pre-dated it: revenue ties to `finBase.revenueMinor`, cost of goods sold to `finBase.cogsMinor`, waste to the waste log, and the two control accounts to their lists. `npm run smoke:accounting` asserts all of this — 40 invariants plus a server-side render of all twelve sub-views in both languages.

---

## Design-system fidelity

Implemented directly from the *Design System Analysis*:

- **Warm light-canvas luxury** — `#f3eee5` off-white canvas, near-white surface ladder, warm hairlines; a chocolate-tinted near-black ladder for dark hero/footer regions.
- **Aged-gold foil accent** (`#b08a57`) used scarcely — wordmark, numbered section markers, primary CTA, focus rings, and the scalloped wave divider — never as a flat fill behind body copy. Small gold text routes to the darker `#8a6b3f` for AA contrast.
- **Serif-led bilingual voice** — Canela → **Fraunces**, Greta Arabic → **IBM Plex Sans Arabic** (one continuous voice), with Gotham → **Montserrat** reserved for labels, data, and buttons. Fonts self-hosted via `@fontsource`.
- **Brand devices replace ornament** — the signature **scalloped wave divider** and **Jazan-motif gold line-patterns** (jasmine الفُل, Khawlani coffee, Jazani mango, sea, mountains), rendered as tiling SVGs.
- **Illustration as protagonist** — since the prototype ships without licensed photography, every product is an **embossed, flavor-keyed SVG bar/box**, and hero/heritage scenes are original line illustrations of Jazan agricultural life. (Gradients appear only inside these flavor art surfaces, per the system.)
- **Per-flavor accent layer** — milk, lavender, rose, jasmine, papaya (+ extended mango, coffee, dark) theme product surfaces without touching the core palette.
- **RTL-first** — logical properties throughout (`ms/me`, `ps/pe`, `inset-inline-*`, `rtl:`/`ltr:`), Eastern-Arabic numerals and SAR formatting in Arabic, looser Arabic line-height, no Latin tracking on Arabic runs.
- **Considered motion & WCAG** — quiet fade-ups on scroll, soft warm shadows only, full `prefers-reduced-motion` support, ≥44px touch targets, visible gold focus rings.

All design tokens live in [`tailwind.config.js`](./tailwind.config.js) and [`src/index.css`](./src/index.css).

---

## Architecture mapping

The mock data layer mirrors the production data model (money as integer **halalas**, bilingual `{ en, ar }` fields, VAT at 15%):

- `src/data/` — products, variants, flavors, collections, and a B2B `Organization` with a `CreditAccount`, append-only ledger, and statements.
- `src/state/` — `ChannelContext` (B2C ↔ B2B pricing) and `CartContext` (totals, VAT, cold-chain handling, free-shipping threshold).
- `src/i18n/` — locale provider (`dir`/`lang` switching, persisted) and a bilingual UI dictionary.

The accounting layer sits on the same foundations:

- `src/data/coa.ts` — the chart of accounts, the named account anchors the posting rules reach for, and the VAT arithmetic.
- `src/data/ledger.ts` — journal types plus the invariants (`entryProblems`, `makeEntry`, `numberDrafts`) shared by the app and the verification script.
- `src/lib/postingRules.ts` — the one place a business document becomes a balanced entry; the opening book and every live posting both go through it.
- `src/lib/accounting.ts` — the pure engine: trial balance, statements, cash flow, VAT return, aging, closing entry, control-account checks.
- `src/data/ledgerSeed.ts` — the opening book, derived from the figures the console already showed.
- `src/state/LedgerContext.tsx` — the book itself, mounted above the orders board, the purchase desk and the cost centres.

This is a **front-end prototype**: payments, ZATCA clearance, Wathq verification, and persistence are represented by faithful UI flows and mock data, ready to be wired to the real services defined in the architecture document.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck + production build
npm run lint     # tsc --noEmit
npm run smoke    # SSR-render every route and assert it builds (no browser needed)
npm run smoke:accounting  # rebuild the ledger and assert its accounting invariants
```

**Try this:** open `/account` and switch the pricing mode to **Business**, then add a few bars and go to **Checkout** → choose **Account credit terms** → drag the order slider past your available credit to see the governed over-limit flow. Toggle **العربية** in the header to flip the whole experience to RTL.

---

## Tech

React 18 · Vite 5 · TypeScript (strict) · Tailwind CSS 3 · React Router 6 · lucide-react · @fontsource.

---

*Confidential & proprietary. © 2026 JAZ Chocolate Food Industries Company, Abu Arish, Jazan, Kingdom of Saudi Arabia. Prepared by Qimma Code.*

<!-- deploy connectivity check -->
