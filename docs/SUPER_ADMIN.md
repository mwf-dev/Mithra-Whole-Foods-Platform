# Super admin vs client admin

Two kinds of admin login, one admin app:

| | Super admin (you) | Client admin |
|---|---|---|
| Store tools (Dashboard, Ship orders, Product studio, Homepage, Content briefs, Reviews) | yes | only the ones you leave on |
| Medusa screens (Orders, Products, Inventory, Customers, Promotions, Price lists) | yes | only the ones you leave on |
| **Control center** (switches, people, system health) | yes | never |
| **Infrastructure** (vendor usage, costs, alerts) and usage meter | yes | never |
| Users, invites, API keys | yes | never |

Enforced on the **server** (`src/api/admin-access-guard.ts` → `src/lib/admin-access.ts`):
a client's requests to a hidden or technical area get `403`, whatever the menu shows.
Hiding the menu entries is cosmetic (`src/lib/admin-nav-guard-script.ts`, injected into
every admin page by `admin.vite` in `medusa-config.ts`).

## How "super admin" is decided
An admin user is a super admin when their email is in the **`SUPER_ADMIN_EMAILS`**
env var (comma-separated). Enforcement switches on only once at least one listed
email belongs to a real user — so a typo, or setting the variable before the account
exists, can't lock anyone out. Until then the admin behaves exactly as before.

Clients cannot create users, invite anyone or read API keys, so they cannot make
themselves a super admin.

## One-time setup (you do this — it involves your password)
1. **Create your login.** From `apps/backend` (the local `.env` points at the live
   database, so this creates the account there):
   ```bash
   npx medusa user -e you@yourdomain.com -p 'a-strong-password'
   ```
2. **Tell the system you're the super admin.** On Railway → backend service →
   Variables, add `SUPER_ADMIN_EMAILS=you@yourdomain.com` and let it redeploy.
3. **Sign in** at `/app` with your new login. You'll see **Control center** and
   **Infrastructure** in the menu. The old login (the client's) no longer does.
4. In Control center, switch off anything you don't want the client to see.

Rotate the password if you ever type it somewhere it shouldn't be. To add a second
super admin, create the user the same way and add their email to the variable.

## Where the switches are stored
In the store's own `metadata.client_access` (no migration). Defaults: everything on.

## Adding a new admin page or API
- New client-facing page → add it to `SECTIONS` in `src/lib/admin-access.ts` (nav
  path + API prefix) so it gets a switch.
- New technical page → add its nav path to `SUPER_ONLY_NAV` and its API prefix to
  `SUPER_ONLY_API`.
