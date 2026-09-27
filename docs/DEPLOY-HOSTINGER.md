# Putting JAZ on Hostinger

The site is a single-page app with Supabase as its whole backend. There is no server to
run: Apache serves static files, and the browser talks to Supabase directly. That is why
this works on Hostinger's shared plans and not only on a VPS.

Two things decide whether it works, and both are easy to get wrong:

1. **`.htaccess` must reach the server.** React Router owns 18 routes; only `index.html`
   exists. Without the rewrite, `/shop`, `/art`, `/admin` and fourteen others return
   Apache's own 404 — the home page works and nothing else does. It ships in `public/`,
   so `npm run build` puts it in `dist/`, but it is a **dotfile**, and FTP clients and
   file managers routinely skip those. Check for it after every upload.
2. **The Supabase keys are baked in at build time.** Vite replaces `VITE_*` when the
   bundle is compiled. Hostinger runs no build, so setting them on Hostinger does
   nothing at all — they have to be present wherever `npm run build` runs. Get this
   wrong and the site still works, quietly, on its in-code seed.

---

## The automatic way

`.github/workflows/deploy-hostinger.yml` builds on a GitHub runner and mirrors `dist/`
into the document root over FTPS on every push to `main`.

Set these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to find it |
| --- | --- |
| `HOSTINGER_FTP_HOST` | hPanel → Files → FTP Accounts |
| `HOSTINGER_FTP_USER` | same page |
| `HOSTINGER_FTP_PASSWORD` | same page (set a new one if unknown) |
| `HOSTINGER_FTP_DIR` | usually `/public_html`, or `/domains/<domain>/public_html` on a multi-site plan |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key on that page |

With any FTP secret missing the run **skips and says so loudly** rather than going green
without uploading. Three things are then verified for you on each run:

* the built bundle really contains the Supabase URL — the only proof the secret was in
  scope, since a missing one produces a working site on seed data instead of an error;
* `--delete` refuses to run against a directory that is neither empty nor already holding
  an `index.html`, because a wrong `HOSTINGER_FTP_DIR` plus `--delete` is destructive;
* `index.html`, `.htaccess` and `assets/` are all present afterwards.

## The manual way

```bash
# Build with the keys present. Do NOT commit this file — .gitignore already covers it.
cat > .env.production <<'ENV'
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
ENV

npm ci
npm run build          # typechecks, then builds into dist/
```

Upload **the contents of `dist/`** — not the folder itself — into `public_html`. In
hPanel's File Manager, turn on "show hidden files" first, or `.htaccess` will not be
uploaded and only the home page will work.

## Never put the service_role key in a VITE_ variable

It bypasses Row Level Security entirely, and everything in a `VITE_*` variable is
compiled into a file any visitor can read. The publishable key is the one that belongs in
the browser; RLS is what makes it safe.

---

## Before it is really live

* **Grant the first `owner`** in Supabase → Table Editor → `profiles`, or with the
  `service_role` key. Signing up can only ever produce `customer` or `b2b` — the database
  clamps it, by design — so the console is unreachable until someone is promoted by hand.
* **Add the domain to Supabase** → Authentication → URL Configuration: the site URL and
  the redirect URLs. Email confirmation and password resets link back through these, so
  sign-up completes on Vercel's domain and fails on the new one until they are changed.
* **Decide about the old host.** `deploy.yml` keeps deploying to Vercel on every push.
  Running both is fine — two hosts, same files — but if the Vercel site should stop
  changing, delete that workflow or remove the `VERCEL_TOKEN` secret.

## Checking it for real

Serve the build the way production does, with Apache and the shipped `.htaccess`:

```bash
a2enmod rewrite headers deflate mime
# vhost on :8088, DocumentRoot <repo>/dist, AllowOverride All
apache2ctl start

npm i -D playwright && npx playwright install chromium
npm run smoke:browser        # loads all 21 paths in Chromium, asserts each one mounts
```

`smoke:browser` catches what a 200 cannot: a page that serves fine and renders nothing.
It also asserts that `/product/no-such-bar` and `/no-such-page` reach the **404 page**
rather than a blank product, which a status code cannot distinguish in a SPA.

Verified against Apache 2.4.58 with this `.htaccess`:

| Check | Result |
| --- | --- |
| all 18 routes + nested paths | 200, `text/html` |
| all 21 paths in Chromium | mounted, rendered, no uncaught errors |
| plain HTTP | 301 to `https://` |
| arriving with `X-Forwarded-Proto: https` | no redirect — no loop behind a proxy |
| `index.html` | `no-cache, must-revalidate` |
| hashed assets | `immutable`, one year |
| the bundle | gzipped, 1.62 MB → 423 KB |
| `.woff2` | `font/woff2`, not `application/octet-stream` |
| a missing `/assets/…` file | **404**, not `index.html` with a 200 |
| `/products/` | 403 — no directory listing |
| Supabase configured but unreachable | every route still renders, no crashes |

That last row is the one worth knowing about: with a wrong key or a blocked domain the
site falls back to its seed and keeps working. It will not white-screen — which also
means a misconfiguration is quiet, so check the console for requests to `supabase.co`
if the admin console shows an empty book.

## Two route facts, so they are not mistaken for bugs

* `/collections` is a redirect to `/gifts`. Identical output is correct.
* The admin console switches panels in state, not in the URL. `/admin/accounting/journal`
  is not a route and correctly lands on the 404 page.
