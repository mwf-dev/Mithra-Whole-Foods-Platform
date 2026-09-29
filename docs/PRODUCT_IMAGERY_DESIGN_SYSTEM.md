# Mithra Whole Foods — Product Imagery Design System (PIDS v1)

**Purpose:** turn one ordinary product photo (phone shot, supplier JPEG, legacy
OpenCart image) into a **fixed, repeatable 7–9 slide PDP carousel** that looks
like it came from one brand, every time — using an AI image model.

**Reference analysed:** Tata Simply Better cold-pressed mustard oil PDP
(12-slide gallery). What makes it work is not the rendering quality — it is that
**every product in the range uses the same slide grammar in the same order**.
Slide 4 is always the benefits panel. Slide 5 is always the comparison. The
shopper learns the rhythm across products. That repeatability is the entire
deliverable here; the prompts below exist to enforce it.

> **Just want the prompt?** [`PIDS_OPERATOR_PROMPT.md`](./PIDS_OPERATOR_PROMPT.md)
> is this whole system compressed into one paste-once block (7,995 chars — fits a
> ChatGPT Custom GPT). It interviews you: you send a photo, it drafts the plan,
> you approve, it builds slides 1→7 on "next". This document is the reference
> behind it — read it when you need to change the system, not to run it.

> **Scope note:** these hex values are for **generated imagery only**. Do not add
> them to components — `apps/web/tailwind.config.js` tokens remain the single
> source of truth for UI (see CLAUDE.md, "Design system drift"). The imagery
> palette is derived from those tokens, plus two imagery-only extensions marked
> below.

---

## 1. The canvas: brand constants

Every generated slide obeys these. They never vary by product.

### 1.1 Palette

| Role | Name | Hex | Where it is used |
|---|---|---|---|
| Ground A (primary) | Forest Deep | `#1E5B22` | Full-bleed background of slides 4, 5, 6, 7 |
| Ground B (light) | Cream | `#FAF7F1` | Background of slides 3, 9; banner strips on dark slides |
| Ground C (warm) | Beige | `#F3EDE2` | Inner cards/panels on cream slides |
| Accent 1 | Terracotta | `#C86F45` | Comparison slide "ordinary" column, warning-side marks |
| Accent 2 | Sprout* | `#B9CE63` | Headline pop on dark grounds, icon fills, torn-paper panels |
| Accent 3 | Sage | `#A8B89A` | Soft shapes, dividers, secondary illustration line |
| Brand green | Forest | `#2E7D32` | Icon strokes, badge rings, "Mithra side" of comparisons |
| Brown | Warm Brown | `#8B5E3C` | Wood props, jaggery/grain family accents |
| Ink | Charcoal | `#333333` | Body text on light grounds |
| Ink on dark | Cream | `#FAF7F1` | Body text on Forest Deep |

\* **Sprout `#B9CE63`** and **Forest Deep `#1E5B22`** are imagery-only
extensions (Forest Deep = the existing `primary.dark`; Sprout = `olive #7A8F3F`
lightened for legibility on dark grounds). Nothing else may be introduced.

**Contrast law:** Sprout or Cream text on Forest Deep. Charcoal or Forest on
Cream/Beige. **Never** Forest on Forest Deep, never Terracotta on Sprout.

### 1.2 Type

| Level | Face | Treatment |
|---|---|---|
| Slide headline | **DM Serif Display** (matches storefront `font-display`) | Title Case, tight leading (0.95), max 4 words per line, max 2 lines |
| Sub-headline / claim | Inter Bold | ALL CAPS, letter-spacing +4% |
| Benefit label | Inter SemiBold | ALL CAPS, 2 lines max |
| Body / step copy | Inter Regular | Sentence case |
| Disclaimer strip | Inter Regular, 1.4% of canvas height | Bottom-left, Charcoal @ 60% on light / Cream @ 50% on dark |

Only these two families ever appear. No script fonts, no outlined display type,
no drop shadows on text other than the one flat offset defined in slide 2.

### 1.3 Canvas geometry (identical on every slide)

- **Square 1:1, 2048 × 2048 px, sRGB, JPEG q88** (matches the reference set and
  Cloudinary's transform sweet spot).
- **Safe margin:** 8% (164 px) on all sides. No text or product edge inside it.
- **Bottom strip:** bottom 6% is reserved — disclaimer left, nothing else.
- **Product anchor:** the pack occupies **48–62% of canvas height** and its
  optical centre sits on the horizontal third the slide specifies. Same pack
  scale across slides 2–5 so the carousel doesn't "breathe". Slide 1 is the
  deliberate exception at **78%** — it is a lone packshot with nothing to
  balance against.
- **Light:** single soft key from **upper-left, ~35° elevation**, warm
  (5200K), soft contact shadow to lower-right. Identical on every slide, every
  product. This is the main thing that makes a set feel like one shoot.
- **Corner motif:** thin Cream line-flourish in exactly one corner per slide,
  rotating clockwise across the set (slide 3 → top-right, slide 4 → bottom-left,
  …). Slides 1 and 2 carry none. Reference does this and it is why the set reads
  as a series.

### 1.4 Hard prohibitions (these are what make AI output look cheap)

1. **No invented packaging.** The pack in every slide is the supplied photo —
   relit and cut out, never redrawn, never re-lettered. If the model cannot
   preserve the label, the slide is rejected.
2. **No fake certification marks** — no FSSAI, USDA Organic, FDA, ISO, "clinically
   proven", or any regulatory seal unless the real product carries it. Generic
   icons (leaf, drop, shield) only.
3. **No health claims beyond the brief.** The brief is the only source of claim
   copy. The model never invents a benefit.
4. **No people's faces** in slides 1–5. Hands only, from slide 6 onward.
5. **No lens flare, no bokeh confetti, no glowing rim light, no HDR halo, no
   3D-render plastic sheen.**
6. **No competitor branding** in the comparison slide — the "ordinary" side is
   an unbranded generic container.
7. **No text baked into slides 1, 2 and 8.** Those must stay clean for category
   grids, zoom and the statutory panel.

---

## 2. The slide grammar

Fixed order. Slides 1–7 are mandatory for every product; 8–9 are conditional.
"Next" always means the next number in this table — the operator never chooses.

| # | Slide | Ground | Job | Text budget |
|---|---|---|---|---|
| 1 | **Packshot** | Pure white | Catalog thumbnail, search result, Shopping feed | **Zero text** |
| 2 | **Hero in its world** | Ingredient texture bed | Make it desirable and show what it's made of | **Zero text** |
| 3 | **Name & headline claim** | Cream | State the one thing this product is | Headline (≤5 words) |
| 4 | **Benefits panel** | Forest Deep | 4 reasons to buy, scannable | Banner + 4 labels |
| 5 | **Ordinary vs Mithra** | Forest Deep + Sprout panel | Justify the price | Title + 4 v 4 bullets |
| 6 | **How to use / How it's made** | Forest Deep | Remove friction or prove process | Title + 3–4 numbered steps |
| 7 | **Ways to enjoy** | Forest Deep | Expand use cases, drive basket size | 4 short verbs |
| 8 | **Pack back / label** | Pure white | Nutrition, ingredients, statutory | Real label only |
| 9 | **Scale & sourcing** | Cream | Size-in-hand, origin story | ≤8 words |

**Why slide 1 is a bare packshot.** It is the only image most shoppers ever see:
the category grid, search results, the cart line item, and any Google Shopping
feed all pull image 1. A styled hero looks great at full size and turns to mud at
200 px, and an inconsistent one makes a category page look like a bring-your-own
photo sale. Slide 1 is therefore deliberately the least interesting image in the
set — white, level, centred, no props — and slide 2 is where the art direction
starts.

**Conditional rules**
- **Slide 6 forks by family:** consumable-with-a-mechanism (oils, ghee, jars,
  pourables) → *How to use*. Everything else (rice, millets, dals, flours,
  sweets) → *How it's made / sourced*.
- **Slide 8** is only generated when a real back-panel photo exists. It is
  **never AI-generated** — a fabricated nutrition panel is a legal problem, not
  a design one. Photograph it or skip it.
- **Slide 9** for anything where size is confusing (a 250 g pouch vs a 10 lb rice
  bag) or where origin is the selling point (Karupatti, Seeraga Samba, Kullakar).

### 2.1 Family presets

The system stays fixed; only the *ingredient world* and slide-6 fork change.

| Family | Catalog examples | Ingredient bed (slide 2) | Garnish props | Slide 6 |
|---|---|---|---|---|
| **Cold-pressed oils** | Castor, Coconut, Sesame | Whole seeds/copra, edge-to-edge | Wooden scoop, flowering sprig, glass carafe of oil | How to use |
| **Ghee** | Sastra Cow Ghee | Cream-white bed, ghee ripples | Brass spoon, banana leaf sliver | How to use |
| **Rice** | Seeraga Samba, Red Rice, Kavuni | Loose grain bed of that exact rice | Woven basket lip, cotton cloth fold | How it's made |
| **Millets** | Foxtail, Little, Barnyard, Kambu | Millet grain bed + one whole millet ear | Terracotta bowl, jute cloth | How it's made |
| **Dals & pulses** | Toor, Moong, Urad, Black Chana | Split-dal bed, two-tone | Steel tumbler, dried chilli | How it's made |
| **Jaggery & palm sugar** | Karupatti, Palm Candy, Jaggery Powder | Dark crystal bed, warm brown | Palm frond, clay pot | How it's made |
| **Traditional sweets** | Mysore Pak, Jangiri, Halwa, Laddu | Beige bed, sweet arranged on banana leaf | Ghee drizzle, dry fruit | How it's made |
| **Malts & porridge mixes** | Beetroot Malt, Kavuni Porridge | Powder swirl + the source ingredient whole | Wooden scoop, filled glass | How to use |
| **Noodles & vermicelli** | Millet Noodles, Maapillai Vermicelli | Raw strands fanned | Chopsticks/ladle, herbs | How to use |
| **Pickles** | Vazhaipoo Thokku | Deep red-brown bed, oil sheen | Ceramic spoon, curry leaves | How to use |
| **Salt** | Sea Salt | Coarse crystal bed | Wooden pinch bowl | How it's made |

---

## 3. The Product Brief

**Nothing is generated without this filled in.** It is the only place copy comes
from — this is what stops the AI inventing claims. Keep one per product,
alongside the source photo.

```yaml
# brief.yml
product_name:      "Extra Virgin Sesame Oil"       # exact catalog title, no size
size:              "2 L"
family:            oils                            # key from §2.1
tagline:           "Wood-Pressed. Nothing Removed." # ≤5 words, slide 2 headline
sub_claim:         "COLD PRESSED · UNREFINED"       # ALL CAPS strip, ≤4 words

benefits:                                           # EXACTLY 4, ≤4 words each
  - label: "Rich Natural Aroma"
    icon:  "flower-in-drop"
  - label: "Source of Good Fats"
    icon:  "droplet"
  - label: "No Chemicals Used"
    icon:  "shield-leaf"
  - label: "Traditional Wood Press"
    icon:  "mill-wheel"

comparison:                                         # EXACTLY 4 v 4, ≤6 words each
  ordinary_title: "Refined Oils"
  mithra_title:   "Mithra Cold-Pressed"
  rows:
    - ordinary: "Extracted with solvents"
      mithra:   "Pressed, never chemically treated"
    - ordinary: "Processed with high heat"
      mithra:   "Stays below 40°C"
    - ordinary: "Neutral, flat flavour"
      mithra:   "Full nutty aroma"
    - ordinary: "Nutrients lost in refining"
      mithra:   "Natural nutrients retained"

slide5:
  mode: how_to_use                                  # how_to_use | how_its_made
  steps:                                            # 3 or 4, ≤4 words each
    - "Twist the cap"
    - "Pour into your kadai"
    - "Cook as you always do"

uses:                                               # EXACTLY 4, one verb each
  - "Sauté"
  - "Temper"
  - "Drizzle"
  - "Deep Fry"

scale_note:        "2 L — about a month for a family of four"   # slide 8, optional
source_photo:      "./raw/sesame-oil-2l.jpg"
back_panel_photo:  "./raw/sesame-oil-2l-back.jpg"   # or null → skip slide 8
disclaimer:        "Images are for illustration purposes only."
```

**Copy rules that keep it looking premium:** benefit labels are ≤4 words,
comparison rows are ≤6, uses are single verbs. The reference set is disciplined
about this and it is 80% of why it reads as a big brand. Long copy is the
single most common way these carousels fall apart.

---

## 4. The master system prompt

Paste this **once** at the start of a session (ChatGPT / Gemini image / Claude /
Nano Banana / Midjourney-with-`--sref`), attach the source photo, paste the
brief, then request slides one at a time.

````text
You are the Mithra Whole Foods packshot art director. You generate PDP carousel
slides from ONE supplied product photograph, following a fixed design system.
You never improvise the system; you only fill it with the product's brief.

=== SOURCE PHOTO RULE (highest priority) ===
The attached photograph is the ground truth for the product. In every slide you
must preserve, unmodified and legible:
  • the pack's shape, proportions and closure
  • every element of the printed label: logo, product name, size, all artwork
  • the pack's real colours
You may only: cut it out from its original background, relight it to the system
key light, correct white balance, remove dust/scratches/reflections of the
original room, and change its scale, rotation (≤12°) and position.
You may NOT redraw, re-letter, restyle, straighten, re-render in 3D, or
"improve" the packaging. If you cannot hold the label, output the slide without
the pack rather than with a fabricated one, and say so.

=== CANVAS CONSTANTS (identical on every slide) ===
Format: square 1:1, 2048×2048, sRGB, photographic realism for the pack and any
food, flat vector for graphic elements. Safe margin 8% on all sides. Bottom 6%
reserved for the disclaimer line only.
Light: one soft warm key from upper-left at ~35° elevation, 5200K, gentle
falloff, soft contact shadow falling lower-right. Never change this.
Pack scale: occupies 48–62% of canvas height, consistent across slides 2–5
(slide 1 is the exception at 78%).

Palette — use these hex values exactly, nothing else:
  Forest Deep #1E5B22 (dark ground)   Cream #FAF7F1 (light ground / text on dark)
  Beige #F3EDE2 (inner panels)        Sprout #B9CE63 (headline pop, panels)
  Terracotta #C86F45 (ordinary side)  Forest #2E7D32 (icons, rings)
  Sage #A8B89A (soft shapes)          Warm Brown #8B5E3C (wood, jaggery)
  Charcoal #333333 (text on light)
Contrast law: Sprout or Cream on Forest Deep; Charcoal or Forest on Cream/Beige.
Never Forest on Forest Deep. Never Terracotta on Sprout.

Type — two families only:
  Headlines: DM Serif Display, Title Case, tight leading, ≤4 words per line.
  Everything else: Inter. Claims and labels ALL CAPS with +4% tracking.
  Disclaimer: Inter Regular, ~1.4% of canvas height, bottom-left,
  Charcoal 60% on light grounds / Cream 50% on dark.
All text must be spelled exactly as given in the brief. Do not paraphrase,
translate, pluralise, title-case differently, or add words. If any requested
text cannot be rendered cleanly, render fewer elements rather than garbled ones.

Corner motif: one thin Cream line-flourish (leaf-vine curl or four-point star)
in exactly one corner, rotating clockwise through the set: slide 2 top-right,
slide 4 bottom-left, slide 5 top-left, slide 6 bottom-right, slide 7 top-right;
slides 1 and 2 carry none.

=== PROHIBITIONS ===
No invented or altered packaging. No regulatory or certification marks (FSSAI,
USDA, organic, FDA, ISO) unless visible on the supplied pack. No claim, number,
or benefit that is not in the brief. No faces in slides 1–5 (hands only from 6).
No lens flare, no glow, no HDR halo, no plastic 3D sheen, no bokeh confetti.
No competitor branding — the "ordinary" comparison item is unbranded and
generic. No text at all on slides 1, 2 and 8. No stock-photo watermarks.

=== OUTPUT PROTOCOL ===
The carousel is a fixed sequence: 1 Packshot (white, no text) · 2 Hero ·
3 Name & Claim · 4 Benefits · 5 Ordinary vs Mithra · 6 How to Use / How It's
Made · 7 Ways to Enjoy · 8 Pack Back (photo only, never generated) ·
9 Scale & Sourcing (conditional).
When I say "next", produce the next slide in that order — never a variation of
the previous one, never a slide of your own choosing. Before each image, print
one line: `SLIDE n — <name> — <the exact text strings you are rendering>`.
After each image, print `CHECK:` and confirm label legibility, palette
compliance, text accuracy, and safe margins in one line each.

Acknowledge with "PIDS v1 loaded" and wait for the brief and the photo.
````

---

## 5. Per-slide prompts

Send these one at a time after the master prompt. `{{…}}` comes from the brief.

### Slide 1 — Packshot *(no text, no props)*

The workhorse. This is the image the category grid, search results, cart line
item and any Google Shopping feed will use, so it is intentionally the plainest
one in the set.

```text
SLIDE 1 — PACKSHOT. Zero text and zero props anywhere in this image.

Background: pure white #FFFFFF, edge to edge, completely flat — no gradient,
no vignette, no backdrop sweep, no floor line, no border.

The supplied pack alone, upright, photographed straight-on at eye level, dead
centre, occupying 78% of the canvas height. Perfectly level: no tilt, no
rotation, no perspective distortion, no part of it cropped. The entire front
label faces the camera and is sharp corner to corner.

Lighting: soft, even, near-shadowless studio light. A gentle vertical highlight
runs down the centre of the pack with subtle falloff toward both edges, so a
cylindrical tin or bottle still reads as round rather than flat. One faint,
tight contact shadow directly beneath the base to seat it on the surface —
no cast shadow to either side, no mirror reflection, no glow.

Colours exactly as the source photo. Do not stylise, do not add a brand tint,
do not warm it up.

It must remain readable when scaled to 200px. Nothing else is permitted in
this frame.
```

**The five rejection triggers**, in the order they actually occur: a grey or
off-white background instead of pure `#FFFFFF`; a mirror reflection under the
pack; the pack tilted or shot from slightly above; a cast shadow to one side;
the pack floating with no contact shadow at all. Any one of those and the
category grid stops looking uniform.

### Slide 2 — Hero in its world *(no text)*

```text
SLIDE 2 — HERO. Zero text anywhere in this image.

Overhead flat-lay, camera perpendicular to the surface. The supplied pack lies
flat, centred, filling 60% of the frame height, rotated 0–6°.

The entire background is a dense, edge-to-edge bed of {{ingredient_bed}} —
sharp in the centre, softening very slightly toward the corners. It reads as
material, not as a photograph of a pile: even, tight, no visible surface beneath.

Scattered asymmetrically around the pack, never touching its label: 4–7 small
{{garnish}} elements, plus one {{prop}} resting at the right edge, partially
cropped by the frame.

Light: the system key from upper-left; the pack casts a soft shadow to the
lower-right that grounds it on the bed.

Mood: abundant, tactile, Indian-pantry warm. Colour grade slightly warm, deep
shadows, no crushed blacks. Editorial food photography, not advertising CGI.
```

Fill from the family preset: `ingredient_bed`, `garnish`, `prop` — e.g. sesame
oil → "whole white and black sesame seeds", "sesame flower sprigs and a
scattering of seeds", "carved wooden oil scoop".

### Slide 3 — Name & headline claim

```text
SLIDE 3 — NAME & CLAIM.

Ground: flat Cream #FAF7F1, completely plain — no gradient, no texture.

Left 45% of the canvas: the supplied pack standing upright, three-quarter front
view, vertical, at 62% of canvas height, its base sitting on an invisible floor
with a soft elliptical contact shadow to the lower-right. The whole label is
readable.

Right 55%, optically centred: the headline

    {{tagline}}

set in DM Serif Display, Title Case, Forest Deep #1E5B22, tight leading,
broken across 2–3 lines with the longest line no more than 4 words. Behind the
type, offset 6px down and right, a flat Sprout #B9CE63 duplicate of the same
letterforms — a hard offset shadow, no blur, no outline.

Directly beneath, separated by a 2px Sprout rule the width of the type block:

    {{sub_claim}}

Inter Bold, ALL CAPS, +4% tracking, Forest #2E7D32, at 22% of the headline size.

Two small four-point Sprout sparkles: one at the upper-left of the headline
block, one at its lower-right. Nothing else.

Corner motif: top-right. Disclaimer bottom-left: {{disclaimer}}
```

### Slide 4 — Benefits panel

```text
SLIDE 4 — BENEFITS.

Ground: flat Forest Deep #1E5B22 filling the canvas.

Top 14%: a full-width Cream #FAF7F1 banner with a torn/rough lower edge,
carrying the headline

    {{product_name | uppercase}}

in DM Serif Display, Forest Deep, centred, single line, tracked to fit.

Left 55%: the supplied pack, upright three-quarter view, 58% of canvas height,
bleeding slightly past the bottom safe margin so it sits in front of a large
Beige #F3EDE2 rounded panel behind it.

Right 40%: a vertical stack of exactly 4 benefit blocks, evenly spaced, each:
  • a 150px circular Terracotta #C86F45 badge with a rough hand-torn edge,
    containing a simple 2px Cream line icon: {{benefit[i].icon}}
  • directly below, centred, {{benefit[i].label}} in Inter SemiBold ALL CAPS,
    Cream, max 2 lines, +4% tracking.

Icons are flat single-weight line drawings — no gradient, no fill, no shadow,
no 3D. Corner motif: bottom-left. Disclaimer bottom-left above the margin:
{{disclaimer}}
```

### Slide 5 — Ordinary vs Mithra

```text
SLIDE 5 — COMPARISON.

Ground: flat Forest Deep #1E5B22.

Top 13%: full-width Cream #FAF7F1 banner, torn lower edge, headline

    {{comparison.ordinary_title | uppercase}} VS {{comparison.mithra_title | uppercase}}

DM Serif Display, Forest Deep, centred, one line.

Centre: a large Sprout #B9CE63 panel with torn paper edges on all four sides,
occupying the middle 62% of the canvas, split into two columns by a vertical
dashed Forest Deep rule.

  Left column header {{comparison.ordinary_title}}, right column header
  {{comparison.mithra_title}} — Inter Bold ALL CAPS, Forest Deep.
  Below each, exactly 4 bullets, Inter SemiBold, Forest Deep, ≤2 lines each,
  left column bulleted on the left, right column bulleted on the right so the
  two lists mirror each other across the divider:

  LEFT                                RIGHT
  {{comparison.rows[*].ordinary}}     {{comparison.rows[*].mithra}}

Lower-left corner, cropped by the frame and overlapping the panel: a generic
unbranded plastic jerrycan/pouch representing the ordinary product, photographic,
tilted, no label, no logo, no text.

Lower-right corner, overlapping the panel and cropped by the frame: the supplied
Mithra pack, tilted ~12° toward the viewer, label fully legible, noticeably more
premium in presentation.

Corner motif: top-left. Disclaimer bottom-left: {{disclaimer}}
```

### Slide 6a — How to use *(mode: `how_to_use`)*

```text
SLIDE 6 — HOW TO USE.

Ground: flat Forest Deep #1E5B22, with one large Sprout #B9CE63 arc sweeping
from the lower-right corner up to the right edge, behind everything.

Upper-left: the headline "{{slide5.headline | default: 'As Easy As It Gets'}}"
in DM Serif Display, Cream, two lines, tight leading.

Right half: a lifestyle photograph of two hands (no face, no arms above the
elbow, warm Indian skin tones, plain sleeve) tilting the supplied pack to pour
{{product_noun}} into a clear glass vessel resting on a dark wooden board. The
pour is a continuous unbroken stream. The pack's label faces the camera and is
fully legible. Shot on the system key light.

Left half: {{slide5.steps | length}} circular photo insets, each 300px diameter
with a 6px Cream ring, staggered down the left edge and slightly overlapping the
arc. Each inset shows a close crop of one hand performing that step. Beside each
inset, a small Sprout numbered disc (1, 2, 3, 4) and the step text in Inter
SemiBold ALL CAPS, Cream:

    {{slide5.steps[i]}}

Corner motif: bottom-right. Disclaimer bottom-left: {{disclaimer}}
```

### Slide 6b — How it's made *(mode: `how_its_made`)*

```text
SLIDE 6 — HOW IT'S MADE.

Ground: flat Forest Deep #1E5B22.

Top 13%: Cream banner, torn lower edge, headline "From Field To Your Kitchen"
in DM Serif Display, Forest Deep, centred.

Body: a left-to-right horizontal journey of {{slide5.steps | length}} stages,
drawn as flat isometric vector illustrations in Sprout, Cream, Warm Brown and
Sage on the dark ground — no photography, no gradients, no textures, uniform
2px linework, all stages the same visual weight and baseline.

Stages, in order, each with a Sprout capsule label in Inter SemiBold ALL CAPS
Forest Deep beneath it:
    {{slide5.steps[i]}}

Between stages, a short Cream dashed arrow. The final stage is the supplied
Mithra pack, rendered photographically (not illustrated) at the right end,
label legible, sitting on a Sprout organic blob.

Corner motif: bottom-right. Disclaimer bottom-left: {{disclaimer}}
```

### Slide 7 — Ways to enjoy

```text
SLIDE 7 — WAYS TO ENJOY.

Ground: flat Forest Deep #1E5B22, no headline banner.

A 2×2 grid of four equal cells with generous gutters. Cells alternate between
two treatments, checkerboard:

  Photographic cells (top-left, bottom-right): a real dish being cooked with
  {{product_noun}}, masked into an arch shape (flat bottom, semicircular top)
  with a 4px Sprout border.

  Illustrated cells (top-right, bottom-left): a flat line illustration of the
  same action in Cream and Sprout linework on the dark ground, no fill.

Above each cell, its verb set on a curved baseline that follows the arch,
Inter Bold ALL CAPS, Sprout, repeated 2–3 times trailing off in size:

    {{uses[0]}} · {{uses[1]}} · {{uses[2]}} · {{uses[3]}}

Dishes must be recognisably South Indian and appropriate to the product.
Corner motif: top-right. Disclaimer bottom-left: {{disclaimer}}
```

### Slide 8 — Pack back *(never AI-generated)*

```text
SLIDE 8 — PACK BACK. NOT a generative task.

Take {{back_panel_photo}}. Cut out, place on pure white #FFFFFF, upright,
centred, 78% of canvas height, straightened, colour-corrected, dust removed.
Nutrition panel and ingredient list must be readable at 100% zoom.
No text overlay, no graphics, no shadow beyond a faint contact shadow.

If no back-panel photo exists, skip this slide entirely. Never generate a
nutrition panel — fabricated nutrition or statutory information is a legal
exposure, not a design choice.
```

### Slide 9 — Scale & sourcing *(conditional)*

```text
SLIDE 9 — SCALE & SOURCING.

Ground: flat Cream #FAF7F1.

Centre-right: the supplied pack held in one hand (no face, no arm above the
elbow), photographed straight on so the viewer can judge its real size against
the hand. Pack label fully legible.

Left: the line "{{scale_note}}" in DM Serif Display, Forest Deep, ≤8 words,
2 lines, with a 2px Sprout rule above it.

Behind, at 12% opacity, an oversized Sage outline map/motif of {{origin_motif}}
— e.g. a paddy field horizon, a palm grove, a millet ear — as a watermark only.

Corner motif: bottom-left. Disclaimer bottom-left: {{disclaimer}}
```

---

## 6. Text rendering — the one honest caveat

**Current image models still garble small text.** Headlines of 3–5 words come
out clean most of the time; 4 benefit labels plus 8 comparison bullets on one
canvas will misspell something roughly one attempt in three. Budget for this.

Two ways to work, and the second one is what a production catalog should use:

**Path A — pure prompt (fast, good enough for launch).**
Generate, then read every string in the output against the brief. Regenerate the
slide (don't patch it) when anything is wrong. Expect 2–3 attempts on slides 4
and 5, one attempt on 1, 2, 3, 6, 7. Best current models for embedded text:
Gemini image models ("Nano Banana"), GPT-Image, Ideogram.

**Path B — split render (deterministic, recommended at scale).**
Ask the AI **only for the artwork**: the relit cut-out pack, the ingredient bed,
the lifestyle shot, the illustrations — with a blank area where copy goes. Then
composite the type as HTML/SVG from the brief, so text is pixel-perfect and free
to change. Slides 1 and 2 need no compositing at all. This is how the reference set was
almost certainly made: photography plus a designer's template, not one AI pass.

If you want Path B, the next build step is a small script that renders each
slide from `brief.yml` + the AI background into a 2048×2048 PNG using the
storefront's own fonts and tokens. Say the word and I'll write it — it would
also solve re-generating every slide when a claim or price changes.

---

## 7. Acceptance checklist

Run per slide before it goes near Cloudinary. A slide failing any line is
regenerated, not retouched.

- [ ] Pack label matches the source photo **exactly** — every word, logo, size
- [ ] Every text string byte-identical to the brief; no invented copy
- [ ] No certification mark that isn't on the real pack
- [ ] Palette contains only §1.1 hexes
- [ ] Two type families only
- [ ] Key light from upper-left, shadow to lower-right — same as the other slides
- [ ] Pack scale within 48–62% and consistent across slides 2–5 (slide 1: 78%)
- [ ] Nothing inside the 8% safe margin; bottom 6% clear except the disclaimer
- [ ] Corner motif present, in the correct corner for this slide number
- [ ] 2048×2048, sRGB, under 500 KB at q88
- [ ] Viewed as a strip of 7 thumbnails, the set reads as one shoot
- [ ] Slide 1 is pure #FFFFFF, level, prop-free, and legible at 200 px

**Set-level check that catches most failures:** put the seven thumbnails side by
side at 200 px. If any slide's background green, headline size, or pack scale
jumps, the set is wrong even if each slide is individually fine.

---

## 8. Worked example — Sastra Pure Cow Ghee 1 L

```yaml
product_name: "Sastra Pure Cow Ghee"
size: "1 L"
family: ghee
tagline: "Slow Cooked. Never Hurried."
sub_claim: "BILONA METHOD · GRASS FED"
benefits:
  - { label: "Rich Golden Aroma",   icon: "steam-swirl" }
  - { label: "Made In Small Batches", icon: "clay-pot" }
  - { label: "No Palm Oil Added",   icon: "shield-leaf" }
  - { label: "High Smoke Point",    icon: "flame" }
comparison:
  ordinary_title: "Factory Ghee"
  mithra_title: "Sastra Bilona Ghee"
  rows:
    - { ordinary: "Made from cream, at speed", mithra: "Churned from set curd" }
    - { ordinary: "Blended across batches",    mithra: "Small batch, one dairy" }
    - { ordinary: "Flat, uniform aroma",       mithra: "Deep nutty aroma" }
    - { ordinary: "Additives permitted",       mithra: "Milk and nothing else" }
slide5: { mode: how_its_made,
          steps: ["Fresh cow milk", "Set into curd", "Hand churned",
                  "Slow simmered to ghee"] }
uses: ["Temper", "Roast", "Bake", "Drizzle"]
scale_note: "1 L — a South Indian kitchen's month"
```

Slide 2 fills as: bed = "a smooth cream-white surface of solidified ghee with
soft ripples"; garnish = "a scattering of whole cardamom and a torn banana-leaf
strip"; prop = "a brass spoon holding melted golden ghee".

---

## 9. Rollout order

Do not regenerate all 55 products at once. In order:

1. **One product, all 7 slides** — sesame oil or ghee. Get the set right.
2. **One product per family** (11 products) — this is where the family presets
   in §2.1 get corrected against reality.
3. **The top 10 sellers**, full sets.
4. Everything else, family by family.

Keep each product's `brief.yml`, source photo, and final slides together in one
folder. When copy or packaging changes, you re-run the brief rather than hunting
for "which prompt made slide 4".

**Storefront note:** slides 4–7 are dense; they are read on a phone at ~390 px
wide. Every check above assumed the 200 px thumbnail test for exactly this
reason. Upload at 2048 and let Cloudinary serve the responsive variants — do not
pre-shrink (see the homepage 21.1 MB → 0.98 MB work in `docs/`).
