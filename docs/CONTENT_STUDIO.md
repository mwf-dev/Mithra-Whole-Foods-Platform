# Content Studio — collecting product content from the client

**Built 2026-08-23.** A standalone, link-only page where the client writes the
copy for each product's image carousel, uploads their own photos and pastes
reference links. Output is a per-product brief we can paste straight into the
PIDS image pipeline ([`PIDS_OPERATOR_PROMPT.md`](./PIDS_OPERATOR_PROMPT.md))
without retyping a word.

- **Client-facing page:** `GET /content-studio?t=<token>` (backend, not the
  storefront)
- **Our review queue:** Medusa admin → **Content briefs**
- **Code:** `apps/backend/src/api/content-studio/`,
  `apps/backend/src/api/admin/content-briefs/`,
  `apps/backend/src/modules/product-brief/`,
  `apps/backend/src/lib/content-studio.ts`

---

## Why it exists

The PIDS slide grammar only works if the *words* are decided before an image is
generated — the whole point of §1.4's prohibitions is that the model never
invents a claim. That means someone has to collect, per product: a tagline, the
benefit copy, the comparison rows, the usage verbs, a real back-panel photo, and
whatever reference imagery the client has in their head.

Doing that in a shared doc produces prose that has to be re-typed, and images
that have to be re-uploaded to Cloudinary by hand. With ~54 products that is the
bulk of the work. This page collects it in the shape we actually consume, stores
uploads in Cloudinary the first time, and gives us a status board instead of 54
documents nobody can see the state of.

## Why the backend and not `apps/web`

1. Uploads are same-origin — no CORS, no publishable key, no second credential.
2. It never touches the `/store/*` rate limit, which is a **site-wide** ceiling
   shared with real shoppers (root `CLAUDE.md`, performance invariant 2).
3. Railway auto-deploys the backend from `dev`. Vercel deploys are currently
   manual, so a storefront page would need a laptop to ship.

If the link needs to live on the Mithra domain later, add a Next rewrite from
`/studio` to the backend `/content-studio` — no change to this code.

---

## Switching it on

1. Generate a long random token and set it on the backend (Railway → Variables):

   ```bash
   openssl rand -hex 24
   ```

   ```
   CONTENT_STUDIO_TOKEN=<the value>
   ```

   Under 16 characters is refused on purpose. **Unset → the page returns 503**
   and every route under `/content-studio` is inert.

2. Apply the migration that creates the `product_brief` table:

   ```bash
   pnpm --filter @dtc/backend db:migrate:prod
   ```

3. Open Medusa admin → **Content briefs** → **Copy client link**, and send that
   URL to the client. That is the whole onboarding.

## Security model — read before widening it

Possession of the link **is** the credential. There are no accounts.

- The token is compared in constant time (`checkStudioToken`).
- `contentStudioLimiter` (240 req/min per IP) rate-limits every route under
  `/content-studio/*`, including token guessing and uploads.
- Uploads accept still images and PDFs only — never SVG (script-bearing),
  never video — and are capped at 10 MB each.
- Every stored link and image URL is re-validated to be `http(s)` on save, so a
  crafted `javascript:` reference can't become stored XSS on our admin page.
- The page and every route send `X-Robots-Tag: noindex, nofollow`.

That is proportionate for product marketing copy. **No customer or order data is
reachable from this page**, and it must stay that way — if this ever needs to
expose anything about a person, it needs real auth first.

Rotating `CONTENT_STUDIO_TOKEN` instantly kills every link already sent.

---

## Working the queue

Medusa admin → **Content briefs** lists every product the client has touched,
with how many slides are filled, how many images they uploaded, and who edited
it last.

- **View** opens the full brief, including their reference links and uploads.
- **Copy brief as YAML** puts it on the clipboard in the shape the PIDS operator
  prompt expects. Paste that plus the source photo into the image session.
- **Approve** marks it done. The client can still reopen and edit; the timestamp
  tells you if they did.

The same YAML is available directly:

```bash
curl -H "Cookie: <admin session>" "https://<backend>/admin/content-briefs/<product_id>?format=yaml"
```

---

## What to tell the client

Copy-paste for the handover email:

> Here's your content page: **&lt;link&gt;**
>
> Keep the link private — anyone who has it can edit the content.
>
> You'll see a card for every product in the shop. Open one and you'll see the
> photos we already hold for it. Underneath, add a slide for each image you want
> in that product's carousel, name it (Thumbnail, Benefits, How To Use — whatever
> makes sense to you), and then write the words you want on it, upload your own
> photos, and paste links to any designs you like the look of.
>
> Press **See an example** at the top right to see a product filled in end to end.
>
> Everything saves by itself — you can stop and come back any time, on your phone
> or your laptop. When a product is finished, press **Send to Mithra**. You can
> still change it afterwards.
>
> Three things worth knowing:
> - The **first slide** should be a plain photo of the pack on a white background,
>   nothing else in the shot. That's the picture the shop grid and search results
>   use, so it has to be readable when it's tiny.
> - For the **nutrition / ingredients** slide, please photograph the actual back of
>   the pack. We're not allowed to recreate that panel.
> - Keep the copy short — four words or fewer for a benefit. Long lines are the
>   single most common reason these carousels stop looking premium.

### Suggested first pass

Don't open all ~54 products at once. Ask for five that cover the different
families in PIDS §2.1 — one oil, one ghee, one rice, one millet or flour, one
sweet (Karupatti). Generate those carousels, show the client the finished set,
then let them work through the rest. It catches format problems while five
briefs are wrong instead of fifty.

---

## Data model

One row per product in `product_brief`, with `slides` as JSON — the client names
and reorders their own slides, and nothing queries inside a slide, so a child
table would cost a migration per field for integrity we don't need. Shape and
reasoning are documented on the model itself
(`apps/backend/src/modules/product-brief/models/product-brief.ts`).

Sanitisation, the YAML renderer and the token check all live in
`apps/backend/src/lib/content-studio.ts` and are covered by
`src/lib/__tests__/content-studio.unit.spec.ts` (16 tests, in CI).
