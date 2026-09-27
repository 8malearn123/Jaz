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

## Setting up the SSH key

Do this on **your own machine**, not here: the private key should never travel through a
chat, a screen share or anyone else's computer. It is two commands.

```bash
# 1. Make a key that exists only to deploy this site. No passphrase, because GitHub
#    Actions has no way to type one.
ssh-keygen -t ed25519 -C "jaz-deploy" -f ~/.ssh/jaz_deploy -N ""

# 2. Print the PUBLIC half — this is the safe one to paste anywhere.
cat ~/.ssh/jaz_deploy.pub
```

Paste that one line into hPanel → **Advanced → SSH Access → إضافة مفتاح SSH**.

Then check it works, from your own terminal:

```bash
ssh -i ~/.ssh/jaz_deploy -p 65002 u871605686@82.198.229.91 'pwd && ls -A public_html | head'
```

It should sign you in **without asking for a password**. If it still asks, the public key
did not register — paste it again, whole, with no line breaks.

## The automatic way

`.github/workflows/deploy-hostinger.yml` builds on a GitHub runner and rsyncs `dist/`
into the document root over SSH on every push to `main`.

Set these repository secrets (Settings → Secrets and variables → Actions → New secret):

| Secret | Value |
| --- | --- |
| `HOSTINGER_SSH_HOST` | `82.198.229.91` |
| `HOSTINGER_SSH_PORT` | `65002` |
| `HOSTINGER_SSH_USER` | `u871605686` |
| `HOSTINGER_SSH_KEY` | the whole of `~/.ssh/jaz_deploy` — the **private** half, including the `-----BEGIN` and `-----END` lines. `cat ~/.ssh/jaz_deploy` and paste all of it. |
| `HOSTINGER_SSH_DIR` | `/home/u871605686/public_html` |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key on that page |

A GitHub secret cannot be read back once saved, only replaced — and if the key is ever
lost or exposed, deleting the public half in hPanel revokes it instantly. Nothing else
depends on it.

With any secret missing the run **skips and says so loudly** rather than going green
without uploading. Each run also:

* pins the server's host key with `ssh-keyscan` instead of disabling the check, because
  `StrictHostKeyChecking=no` would accept any machine answering on that address — and
  this connection carries a key worth stealing;
* proves the built bundle really contains the Supabase URL, the only evidence the secret
  was in scope, since a missing one yields a working site on seed data rather than an error;
* refuses `--delete` against a directory that is neither empty nor already holding an
  `index.html`, because a wrong `HOSTINGER_SSH_DIR` plus `--delete` is destructive;
* uses `--delete-after`, so removals happen only once the new files are in place — with
  Vite's hashed filenames that means nobody loading the page mid-deploy gets a half-site;
* confirms `.htaccess` arrived, and deletes the key from the runner even if a step fails.

## Deploying by hand over SSH

Once the key works, one command from the repository root:

```bash
npm run build
rsync -az --delete-after -e 'ssh -i ~/.ssh/jaz_deploy -p 65002' \
  dist/ u871605686@82.198.229.91:/home/u871605686/public_html/
```

The trailing slash on `dist/` matters: without it rsync copies the folder rather than its
contents, and the site ends up at `/dist/`.

## The manual way (File Manager, no SSH)

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
uploaded and only the home page will work. This is the route to use only if SSH is
unavailable; rsync above is faster and cannot skip a dotfile.

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
