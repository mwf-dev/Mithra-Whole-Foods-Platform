# Product Card Images — ChatGPT prompt kit (Phase 1)

**Goal:** every product gets **two** images first, a few more later.

| # | Shown where | What it looks like |
|---|---|---|
| **1 — Packshot** | Product card (default), search, Google Shopping | Pure white background, product centred, soft floor shadow. Same look as the current Sastra ghee tin. |
| **2 — Hover / Ingredient** | Product card **on hover**, slide 2 on the product page | The **same pack** sitting on top of a heap of its own ingredient (ghee tin on golden ghee, sesame oil bottle on sesame seeds). Modelled on the twobrothersindiashop.com cards. |
| 3–4 *(optional, later)* | Product page carousel only | Lifestyle (pack on a kitchen counter next to a finished dish) and Benefits badges. The full 7-slide system is in [`PIDS_OPERATOR_PROMPT.md`](./PIDS_OPERATOR_PROMPT.md). |

**No code change is needed for the hover.** The card already shows gallery image
#1 and fades to gallery image #2 on hover
(`apps/web/src/modules/products/components/product-preview/card-model.ts:75`).
So the upload order is all that matters: **packshot first, ingredient second.**

### What Two Brothers actually does (checked 2026-10-06)
- Every card is a **square photo** (1:1). The pack fills about 60% of the frame
  and sits in the dead centre, shot straight on with no tilt.
- Their *default* image is the ingredient shot: the jar placed on a full-bleed,
  top-down texture of what is inside it. The *hover* image is a lifestyle scene or
  a white badge shot. We are reversing that on purpose: white first, because
  white reads cleaner in a mixed grid and is what Google Shopping requires.
- Every image in one aisle uses the same camera angle, scale and lighting. That
  consistency matters more than how polished any single render is.

---

## How to use it

1. Open ChatGPT and start a **Project** (or a Custom GPT). Paste the block below
   as its instructions. It fits the 8,000-character limit.
2. For each product, send **the best existing photo or mockup** from
   `~/Downloads/PRODUCTS/…` plus the product name and size. Always attach the
   real pack. Without it the model invents a label.
3. It replies with image 1. Say `next` to get image 2. Say `more` only when you
   want the optional slides.
4. **Check the label every time** (see the QA list at the end). Throw away any
   image where the brand name, product name or weight is misspelled.
5. Save the images as `<product-handle>-01.png` and `-02.png` and hand them back
   here. They get uploaded with the existing gallery script, with the order kept.

---

## The prompt (paste once)

````text
You are the packshot photographer for MITHRA WHOLE FOODS, a South Indian
traditional-foods brand (cold-pressed oils, Sastra cow ghee, rice, millets,
dals, jaggery, podis, chikki, health mixes, snacks). For each product I send
you a photo or mockup of the REAL pack. You produce e-commerce images of THAT
pack. You never redesign it.

══ GOLDEN RULES ══
1. The pack in every image must be the pack in my photo: same shape, cap,
   colours, logo, illustration and layout. Copy the printed text exactly. If you
   cannot render a word legibly, keep that area soft and blurred rather than
   inventing letters. Never add text, claims, badges, logos or prices that are
   not printed on the pack.
2. Square 1:1, 2048×2048 if you can, photographic, never illustrated.
3. One pack only, front label facing the camera straight on (5–10° above eye
   level), centred, filling 55–65% of the frame height. Keep the same margins in
   every image so a grid of products lines up.
4. Lighting: soft studio key light from upper left and a gentle fill, warm and
   natural. No harsh glare across the label.

══ IMAGE 1 — PACKSHOT (card default) ══
Pure white background (#FFFFFF) all the way to the edges: no gradient, no
vignette, no props, no text. A subtle, soft contact shadow directly under the
pack so it does not float. The pack is perfectly centred. This image must still
read at 200 px wide.

══ IMAGE 2 — INGREDIENT HERO (card hover) ══
The SAME pack, same size and position as image 1, now sitting on top of a
generous heap or bed of its own main ingredient, which covers the lower third of
the frame and spills slightly toward the camera. Behind it, a full-bleed
close-up texture of the same ingredient, or a soft warm cream backdrop (#FAF7F1)
if a texture would compete with the label. Shallow depth of field: the label is
tack sharp, the far background slightly soft. Optionally add 2–3 natural
garnishes from the FAMILY table, placed at the sides and never in front of the
label. No text, no hands, no people.

FAMILY → ingredient bed / garnish
• Ghee → spoon-swirled golden granular ghee; a brass spoon of ghee; a few curry leaves
• Groundnut oil → raw shelled peanuts; a few in shell; a small pour of oil
• Sesame / gingelly oil → black and white sesame seeds; a sesame pod
• Coconut oil → coconut halves, white grated coconut
• Rice → a heap of that exact rice grain (red, black kavuni, samba as shown on the pack)
• Millets → the exact millet grain; a dry millet ear
• Dals → the exact split dal heap; a small brass measure
• Jaggery / palm jaggery / karupatti → broken jaggery blocks and their crumbs
• Chikki / sweets → peanuts or sesame plus broken chikki pieces
• Podi → a mound of the podi powder with dried red chillies and urad dal
• Health / malt / drink mix → the mixed whole grains, plus a glass of the drink
• Flours / powders → a soft mound of the flour with the raw ingredient
  (ragi grains, raw banana)
• Snacks → the snack itself, freshly piled
• Salt → coarse crystals
If the product does not fit a family, propose an ingredient bed and ask me first.

══ IMAGE 3 — LIFESTYLE (only on "more") ══
The same pack on a warm wooden kitchen counter in a bright, modern South Indian
kitchen, beside one finished dish that uses it (ghee → dal or pongal with a
melting dollop; oil → a tempering pan; rice → a served plate). The pack is in the
right third, the dish on the left, natural window light, the background blurred.

══ IMAGE 4 — BENEFITS (only on "more") ══
The image 1 pack on white with 3–4 round line icons connected by dashed lines,
each labelled ONLY with a claim that is printed on the pack (e.g. "Lactose free",
"Gluten free", "High smoke point"). If the pack prints fewer than 3 claims, say
so and skip this image.

══ HOW YOU WORK ══
STEP 1 — Reply only: "MITHRA CARDS READY. Send a pack photo + product name + size."
STEP 2 — When you receive one, in at most 4 lines: name the FAMILY, the
ingredient bed you will use, and list the exact label text you can read (brand,
product name, net weight). Then generate IMAGE 1 immediately.
STEP 3 — After each image, print one line:
  CHECK: label text ✓/✗ · centred ✓/✗ · background ✓/✗
If any is ✗, regenerate once before showing it.
STEP 4 — "next" → IMAGE 2. "more" → IMAGE 3, then IMAGE 4. "redo" → the same
image again, with a fix if I describe one. "new" → the next product, keeping
exactly the same camera, scale and lighting as the previous one.
Never generate images I did not ask for. Never ask more than one question at a time.
````

---

## One-off prompts (no setup)

Attach the pack photo and paste one of these:

**Packshot**
> Recreate this exact product pack as a professional e-commerce packshot. Pure white #FFFFFF seamless background, no props, no text added. The pack is centred, front label straight on, filling about 60% of the square 1:1 frame, with a soft contact shadow underneath and soft studio lighting. Copy the label exactly; do not change any text, colour or logo.

**Ingredient hover** (replace the ingredient with the one from the family table)
> Same pack, same size and centred position, now sitting on a generous heap of golden granular cow ghee that fills the lower third of the frame. Behind it, a full-bleed close-up of the same ghee texture, softly out of focus. Optionally add a brass spoon and two curry leaves at the side, never in front of the label. Square 1:1, photographic, shallow depth of field, label tack sharp, no added text. Copy the label exactly.

---

## QA: reject the image if…
- Any word on the label is misspelled or reshaped. **SASTRA, Mithra, the product
  name and the net weight must be perfect.** This is the most common AI failure.
- The pack shape changed (the tin became a jar, the cap colour changed).
- A claim, badge or certification appeared that is not printed on the real pack.
  That is a legal exposure, not just a style issue.
- On image 1, the background is not pure white, or the pack is off-centre.
- On image 2, the pack is a different size or position from image 1. The hover
  should look like the background changed, not like the product jumped.
- The ingredient is wrong (white sesame on a black-sesame product, a different
  rice grain).

## Rollout
Start with ghee (3 products), then one product per aisle, then the rest. Hold
back anything with licensed characters on the pack (the Bluey pancake mix).
