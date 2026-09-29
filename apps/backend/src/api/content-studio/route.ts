import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { checkStudioToken } from "../../lib/content-studio"

/**
 * GET /content-studio?t=<token>
 *
 * The client-facing content intake. Standalone page, served by the backend,
 * NOT part of the admin app and not linked from anywhere in the storefront —
 * the client gets a URL and nothing else. They pick a product from a grid,
 * see the photos we already hold for it, and build up a slide-by-slide plan:
 * each slide named by them, with copy, reference links and uploaded images.
 *
 * Why the backend and not apps/web:
 *  - uploads are same-origin, so no CORS and no publishable key
 *  - it never touches the /store/* rate limit, which is a site-wide ceiling
 *    shared by real shoppers (CLAUDE.md, performance invariant 2)
 *  - Railway auto-deploys this; Vercel deploys are currently manual
 *
 * Security model: possession of the link. `CONTENT_STUDIO_TOKEN` is compared
 * in constant time (src/lib/content-studio.ts), `contentStudioLimiter` in
 * src/api/middlewares.ts rate-limits every route under /content-studio/*, and
 * uploads are capped by type and size. That is appropriate for product
 * marketing copy and nothing more sensitive — no customer data is reachable
 * from here. Rotate the token by changing the env var; every old link dies.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.setHeader("X-Robots-Tag", "noindex, nofollow")
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Content-Type", "text/html; charset=utf-8")

  const supplied = typeof req.query.t === "string" ? req.query.t : undefined
  const check = checkStudioToken(supplied)

  if (!check.ok) {
    res.status(check.status).send(errorPage(check.message))
    return
  }

  res.send(HTML)
}

function errorPage(message: string): string {
  const safe = message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<meta name="robots" content="noindex, nofollow" /><title>Content Studio</title>' +
    "<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
    "background:#FAF7F1;color:#333;display:flex;align-items:center;justify-content:center;min-height:100vh}" +
    "div{max-width:460px;padding:32px;background:#fff;border:1px solid #e6e0d4;border-radius:14px;text-align:center}" +
    "h1{font-size:18px;margin:0 0 10px}p{margin:0;color:#6b6357;line-height:1.6;font-size:14px}</style>" +
    "</head><body><div><h1>Mithra Content Studio</h1><p>" +
    safe +
    "</p></div></body></html>"
  )
}

const HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Mithra Content Studio</title>
<style>
  :root {
    --forest: #1E5B22;
    --forest-mid: #2E7D32;
    --cream: #FAF7F1;
    --beige: #F3EDE2;
    --terracotta: #C86F45;
    --sprout: #B9CE63;
    --ink: #2b2a26;
    --muted: #79736a;
    --line: #e6e0d4;
    --white: #ffffff;
    --shadow: 0 1px 2px rgba(30,45,25,.05), 0 8px 24px rgba(30,45,25,.06);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--cream);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.5;
  }
  a { color: var(--forest-mid); }
  header {
    background: var(--forest);
    color: var(--cream);
    padding: 14px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: .2px; }
  .brand .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--sprout); flex: none; }
  .brand small { display: block; font-weight: 500; font-size: 11px; opacity: .75; letter-spacing: .06em; text-transform: uppercase; }
  .head-actions { display: flex; align-items: center; gap: 12px; }
  #saveState { font-size: 12px; opacity: .8; min-width: 92px; text-align: right; }
  main { max-width: 1080px; margin: 0 auto; padding: 26px 22px 90px; }

  h1 { font-size: 22px; margin: 0 0 6px; }
  h2 { font-size: 15px; margin: 0; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
  p.lede { margin: 0 0 18px; color: var(--muted); max-width: 70ch; }

  .panel { background: var(--white); border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin-bottom: 18px; box-shadow: var(--shadow); }
  .panel > header { all: unset; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }

  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
  .steps li { background: var(--beige); border-radius: 10px; padding: 12px 14px; font-size: 13.5px; }
  .steps b { display: block; color: var(--forest); margin-bottom: 2px; }

  .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  input[type="text"], input[type="search"], input[type="url"], textarea, select {
    font: inherit; color: inherit; background: var(--white);
    border: 1px solid var(--line); border-radius: 9px; padding: 9px 11px; width: 100%;
  }
  textarea { resize: vertical; min-height: 78px; line-height: 1.55; }
  input:focus, textarea:focus, select:focus { outline: 2px solid var(--sprout); outline-offset: 1px; border-color: var(--forest-mid); }
  .toolbar input[type="search"] { max-width: 320px; }
  .toolbar select { max-width: 200px; }
  .spacer { flex: 1; }
  .count { font-size: 13px; color: var(--muted); }

  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(214px, 1fr)); gap: 16px; }
  .card { background: var(--white); border: 1px solid var(--line); border-radius: 14px; padding: 0; overflow: hidden; box-shadow: var(--shadow); transition: transform .12s ease, box-shadow .12s ease; display: flex; flex-direction: column; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(30,45,25,.12); }
  .card-open { text-align: left; background: none; border: 0; padding: 0; cursor: pointer; font: inherit; color: inherit; display: flex; flex-direction: column; flex: 1; }
  .card-open:focus-visible { outline: 2px solid var(--forest-mid); outline-offset: -2px; }
  .cardfoot { border-top: 1px solid var(--line); padding: 7px 9px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .cardfoot .why { font-size: 11.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card.is-removed { opacity: .72; }
  .card.is-removed .thumb img { filter: grayscale(1); }

  .newcard { border: 1.5px dashed var(--forest-mid); background: #f4f8f2; color: var(--forest); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 200px; cursor: pointer; font: inherit; border-radius: 14px; padding: 18px; text-align: center; }
  .newcard:hover { background: #eaf2e7; }
  .newcard .plus { font-size: 26px; line-height: 1; }
  .newcard b { font-size: 14.5px; }
  .newcard span { font-size: 12px; color: var(--muted); }

  .removed-wrap { margin-top: 28px; border: 1px solid var(--line); border-radius: 14px; background: var(--white); padding: 0 18px; box-shadow: var(--shadow); }
  .removed-wrap > summary { cursor: pointer; padding: 14px 0; font-weight: 600; font-size: 14px; }
  .removed-wrap > summary::marker { color: var(--muted); }
  .removed-wrap .lede { margin: 0 0 14px; font-size: 13px; }
  .removed-wrap .cards { padding-bottom: 18px; }

  .banner { border-radius: 11px; padding: 12px 14px; margin-bottom: 16px; font-size: 13.5px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .banner.warn { background: #fdf0e4; color: #8c4a1c; }
  .banner .spacer { flex: 1; }
  .thumb { aspect-ratio: 1/1; background: var(--beige); display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .thumb .none { color: var(--muted); font-size: 12px; }
  .cardbody { padding: 12px 13px 14px; display: flex; flex-direction: column; gap: 7px; flex: 1; }
  .ctitle { font-weight: 600; font-size: 14.5px; line-height: 1.35; }
  .cmeta { font-size: 12px; color: var(--muted); margin-top: auto; }

  .pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; width: fit-content; letter-spacing: .02em; }
  .pill-not_started { background: #efece5; color: #7a7266; }
  .pill-draft { background: #fdf0e4; color: #a2551f; }
  .pill-submitted { background: #e6f3e8; color: var(--forest); }
  .pill-approved { background: var(--forest); color: var(--cream); }
  .pill-example { background: var(--sprout); color: #33420f; }

  button.btn { font: inherit; cursor: pointer; border-radius: 9px; padding: 9px 15px; border: 1px solid var(--forest); background: var(--forest); color: var(--cream); font-weight: 600; }
  button.btn:hover { background: #17491b; }
  button.ghost { background: transparent; color: var(--forest); }
  button.ghost:hover { background: var(--beige); }
  button.subtle { background: var(--white); color: var(--ink); border-color: var(--line); font-weight: 500; }
  button.subtle:hover { background: var(--beige); }
  button.danger { background: transparent; border-color: transparent; color: var(--terracotta); font-weight: 500; }
  button.danger:hover { background: #fbeee7; }
  button.icon { padding: 5px 9px; line-height: 1; font-size: 14px; }
  button:disabled { opacity: .45; cursor: not-allowed; }

  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 12.5px; font-weight: 600; margin-bottom: 5px; letter-spacing: .02em; }
  .field .hint { font-size: 12px; color: var(--muted); font-weight: 400; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 680px) { .grid2 { grid-template-columns: 1fr; } }

  .imgstrip { display: flex; gap: 10px; flex-wrap: wrap; }
  .imgstrip a, .thumbcard { display: block; width: 92px; height: 92px; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: var(--beige); position: relative; }
  .imgstrip img, .thumbcard img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumbcard .rm { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,.62); color: #fff; border: 0; border-radius: 50%; width: 20px; height: 20px; line-height: 1; cursor: pointer; font-size: 13px; padding: 0; }
  .thumbcard .doc { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; color: var(--muted); padding: 6px; text-align: center; word-break: break-word; }

  .drop { border: 1.5px dashed var(--line); border-radius: 11px; padding: 16px; text-align: center; color: var(--muted); font-size: 13px; cursor: pointer; background: #fcfaf6; }
  .drop.over { border-color: var(--forest-mid); background: #f0f6ef; color: var(--forest); }

  .slide { border: 1px solid var(--line); border-radius: 13px; margin-bottom: 14px; background: var(--white); overflow: hidden; }
  .slide-head { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: var(--beige); border-bottom: 1px solid var(--line); }
  .slide-num { width: 26px; height: 26px; border-radius: 7px; background: var(--forest); color: var(--cream); display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; flex: none; }
  .slide-head input { background: transparent; border-color: transparent; font-weight: 600; }
  .slide-head input:hover { background: var(--white); }
  .slide-body { padding: 15px 14px 4px; }
  .slide-hint { font-size: 12.5px; color: var(--forest); background: #eef5ec; border-radius: 8px; padding: 8px 10px; margin: 0 0 13px; }

  .linkrow { display: flex; gap: 8px; margin-bottom: 8px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .chip { font: inherit; font-size: 12.5px; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--line); background: var(--white); cursor: pointer; }
  .chip:hover { border-color: var(--forest-mid); color: var(--forest); }

  .sticky-actions { position: fixed; left: 0; right: 0; bottom: 0; background: rgba(250,247,241,.94); backdrop-filter: blur(6px); border-top: 1px solid var(--line); padding: 11px 22px; display: flex; gap: 12px; align-items: center; justify-content: flex-end; z-index: 15; }
  .sticky-actions .note { margin-right: auto; font-size: 12.5px; color: var(--muted); }

  .modal-bg { position: fixed; inset: 0; background: rgba(28,34,24,.5); display: flex; align-items: flex-start; justify-content: center; padding: 40px 18px; z-index: 40; overflow: auto; }
  .modal { background: var(--white); border-radius: 15px; max-width: 720px; width: 100%; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,.25); }
  .modal h3 { margin: 0 0 4px; font-size: 18px; }
  .ex-slide { border-left: 3px solid var(--sprout); padding: 2px 0 2px 12px; margin: 14px 0; }
  .ex-slide b { display: block; font-size: 13.5px; }
  .ex-slide span { font-size: 13px; color: var(--muted); white-space: pre-line; }

  .empty { text-align: center; padding: 40px 20px; color: var(--muted); }
  .toast { position: fixed; bottom: 74px; left: 50%; transform: translateX(-50%); background: var(--ink); color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 13.5px; z-index: 60; box-shadow: var(--shadow); }
  .toast.err { background: var(--terracotta); }

  @media (max-width: 520px) {
    header { padding: 11px 14px; }
    .brand { font-size: 14px; gap: 8px; }
    .brand small { font-size: 10px; }
    #saveState { display: none; }
    main { padding: 18px 14px 96px; }
    .panel { padding: 15px; }
    .sticky-actions { padding: 10px 14px; }
    .sticky-actions .note { display: none; }
    .slide-head { flex-wrap: wrap; }
  }
</style>
</head>
<body>
<header>
  <div class="brand">
    <span class="dot"></span>
    <span>Mithra Whole Foods<small>Content Studio</small></span>
  </div>
  <div class="head-actions">
    <span id="saveState"></span>
    <button class="btn subtle" id="exampleBtn" type="button">See an example</button>
  </div>
</header>
<main id="view"></main>

<script>
(function () {
  "use strict";

  var TOKEN = new URLSearchParams(location.search).get("t") || "";
  var view = document.getElementById("view");
  var saveState = document.getElementById("saveState");

  var state = {
    products: [],
    search: "",
    filter: "all",
    current: null,
    showRemoved: false,
    data: null,
    dirty: false,
    saveTimer: null
  };

  var SLIDE_TEMPLATES = [
    { name: "Thumbnail / Packshot", hint: "The plain white-background photo. This is the image shown in the shop grid, in search results and in the cart, so it needs no text and no props." },
    { name: "Hero Shot", hint: "The product in its world - ingredients, textures, props. This is where the styling starts. No text." },
    { name: "Name & Claim", hint: "The one line that says what this product is. Keep it to five words or fewer." },
    { name: "Benefits", hint: "Four reasons to buy, four words or fewer each. Only claims that are true and printed on the pack or that you can stand behind." },
    { name: "Ordinary vs Mithra", hint: "Four comparisons that justify the price. Write them as pairs: what ordinary products do, versus what yours does." },
    { name: "How To Use", hint: "Three or four short steps. Best for oils, ghee, pourables - anything with a method." },
    { name: "How It's Made", hint: "Three or four steps of sourcing or process. Best for rice, millets, dals, flours and sweets." },
    { name: "Ways To Enjoy", hint: "Four short uses, one verb each - Saute, Temper, Drizzle, Deep Fry." },
    { name: "Pack Back / Label", hint: "Nutrition, ingredients and statutory text. This one MUST be a real photograph of the back of the pack - we are not allowed to generate it." },
    { name: "Scale & Sourcing", hint: "How big it actually is, or where it comes from. Useful when size is confusing or origin is the selling point." }
  ];

  var EXAMPLE = {
    title: "Sastra Pure Cow Ghee, 1 L",
    tagline: "Slow Cooked. Never Hurried.",
    sub_claim: "BILONA METHOD - GRASS FED",
    slides: [
      { name: "Thumbnail / Packshot", content: "No text. Just the 1 L jar, straight on, plain white background.", notes: "Use the clean studio photo I uploaded, not the one on the shelf." },
      { name: "Hero Shot", content: "No text. Jar on a wooden board with a brass spoon of ghee and a few grains of rice.", notes: "Warm morning light. Nothing plastic in the frame." },
      { name: "Name & Claim", content: "Slow Cooked. Never Hurried.", notes: "Cream background, dark green text." },
      { name: "Benefits", content: "Rich Golden Aroma\\nMade In Small Batches\\nNo Palm Oil Added\\nHigh Smoke Point", notes: "Four boxes on the dark green background, one simple icon each." },
      { name: "Ordinary vs Mithra", content: "Factory Ghee vs Sastra Bilona Ghee\\n- Made from cream, at speed / Churned from set curd\\n- Blended across batches / Small batch, one dairy\\n- Flat, uniform aroma / Deep nutty aroma\\n- Additives permitted / Milk and nothing else", notes: "The 'ordinary' side must be a plain unbranded tin - no competitor names." },
      { name: "How To Use", content: "Spoon it warm over hot rice\\nTemper your dal with it\\nUse for sweets and halwa", notes: "Hands only, no faces." },
      { name: "Ways To Enjoy", content: "Rice\\nDal\\nSweets\\nRoti", notes: "" },
      { name: "Pack Back / Label", content: "Real photo of the back label - nutrition panel and ingredient list.", notes: "I will take this one with the phone, straight on, good light." }
    ]
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function api(path, options) {
    var joiner = path.indexOf("?") > -1 ? "&" : "?";
    var url = "/content-studio" + path + joiner + "t=" + encodeURIComponent(TOKEN);
    var opts = options || {};
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    return fetch(url, opts).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.message || "Request failed (" + response.status + ")");
        return body;
      });
    });
  }

  var toastTimer = null;
  function toast(message, isError) {
    var existing = document.querySelector(".toast");
    if (existing) existing.remove();
    var el = document.createElement("div");
    el.className = "toast" + (isError ? " err" : "");
    el.textContent = message;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, isError ? 6000 : 2600);
  }

  var STATUS_LABEL = {
    not_started: "Not started",
    draft: "In progress",
    submitted: "Sent to Mithra",
    approved: "Approved"
  };

  function pill(status) {
    return '<span class="pill pill-' + status + '">' + (STATUS_LABEL[status] || status) + "</span>";
  }

  function setSaveState(text) { saveState.textContent = text; }

  /* ---------------------------------------------------------------- index */

  function loadIndex() {
    view.innerHTML = '<div class="empty">Loading your products...</div>';
    api("/products")
      .then(function (body) {
        state.products = body.products || [];
        renderIndex();
      })
      .catch(function (error) {
        view.innerHTML = '<div class="panel"><h1>Could not load products</h1><p class="lede">' + esc(error.message) + "</p></div>";
      });
  }

  function matchesFilter(product) {
    var term = state.search.trim().toLowerCase();
    if (state.filter !== "all" && product.status !== state.filter) return false;
    if (!term) return true;
    return (product.title || "").toLowerCase().indexOf(term) > -1;
  }

  function productCard(product) {
    var html = '<div class="card' + (product.archived ? " is-removed" : "") + '">';
    html += '<button class="card-open" type="button" data-id="' + esc(product.id) + '">';
    html += '<div class="thumb">' + (product.thumbnail
      ? '<img loading="lazy" alt="" src="' + esc(product.thumbnail) + '" />'
      : '<span class="none">No photo yet</span>') + "</div>";
    html += '<div class="cardbody">';
    html += '<div class="ctitle">' + esc(product.title) + "</div>";
    html += pill(product.status);
    if (product.origin === "client") html += '<span class="pill pill-example">Added by you</span>';
    html += '<div class="cmeta">' + product.filled_slide_count + " of " + product.slide_count + " slides filled &middot; " + product.image_count + " photo" + (product.image_count === 1 ? "" : "s") + " on file</div>";
    html += "</div></button>";

    html += '<div class="cardfoot">';
    if (product.archived) {
      html += '<span class="why">' + esc(product.archive_reason || "Removed") + "</span>";
      html += '<button class="btn subtle" type="button" data-restore="' + esc(product.id) + '">Put back</button>';
    } else {
      html += '<span class="why"></span>';
      html += '<button class="btn danger" type="button" data-archive="' + esc(product.id) + '">Remove</button>';
    }
    html += "</div></div>";
    return html;
  }

  function renderIndex() {
    var active = [];
    var removed = [];
    state.products.forEach(function (product) {
      (product.archived ? removed : active).push(product);
    });

    var list = active.filter(matchesFilter);
    var done = active.filter(function (p) { return p.status === "submitted" || p.status === "approved"; }).length;

    var html = "";
    html += '<h1>Product content</h1>';
    html += '<p class="lede">Pick a product, tell us what you want each slide of its image carousel to say, and upload any photos or reference pictures you have. Everything saves by itself as you type - you can stop and come back to it any time.</p>';

    html += '<div class="toolbar">';
    html += '<button class="btn" id="createTop" type="button">+ Create a new product</button>';
    html += '<span class="count">Selling something that is not on this list? Add it here and fill it in the same way.</span>';
    html += "</div>";

    html += '<div class="panel"><ol class="steps">';
    html += '<li><b>1. Open a product</b>Click its card. You will see the photos we already have for it.</li>';
    html += '<li><b>2. Add slides</b>Add a slide for each image you want in the carousel and give it a name.</li>';
    html += '<li><b>3. Fill it in</b>Write the words for that slide, upload photos, paste links to designs you like.</li>';
    html += '<li><b>4. Send it</b>Press "Send to Mithra" when a product is done. You can still edit it afterwards.</li>';
    html += '<li><b>Not selling it any more?</b>Press "Remove" on the card. Nothing is lost - it moves to "Removed products" at the bottom and we take it off the website for you.</li>';
    html += "</ol></div>";

    html += '<div class="toolbar">';
    html += '<input type="search" id="search" placeholder="Search products" value="' + esc(state.search) + '" />';
    html += '<select id="filter">';
    var options = [["all", "All products"], ["not_started", "Not started"], ["draft", "In progress"], ["submitted", "Sent to Mithra"], ["approved", "Approved"]];
    options.forEach(function (option) {
      html += '<option value="' + option[0] + '"' + (state.filter === option[0] ? " selected" : "") + ">" + option[1] + "</option>";
    });
    html += "</select>";
    html += '<span class="spacer"></span>';
    html += '<span class="count">' + done + " of " + active.length + " products sent</span>";
    html += "</div>";

    html += '<div class="cards">';
    html += '<button class="newcard" id="createCard" type="button"><span class="plus">+</span><b>Create a new product</b><span>Upload its photos and write its content from scratch.</span></button>';
    list.forEach(function (product) { html += productCard(product); });
    html += "</div>";
    if (!list.length) {
      html += '<div class="empty">No products match that.</div>';
    }

    if (removed.length) {
      html += '<details class="removed-wrap"' + (state.showRemoved ? " open" : "") + ' id="removedWrap">';
      html += "<summary>Removed products (" + removed.length + ")</summary>";
      html += '<p class="lede">These stay here so nothing is lost. We will take them off the website - press "Put back" if you change your mind.</p>';
      html += '<div class="cards">';
      removed.forEach(function (product) { html += productCard(product); });
      html += "</div></details>";
    }

    view.innerHTML = html;
    setSaveState("");

    document.getElementById("search").addEventListener("input", function (event) {
      state.search = event.target.value;
      var focused = document.activeElement === event.target;
      renderIndex();
      if (focused) {
        var input = document.getElementById("search");
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
    document.getElementById("filter").addEventListener("change", function (event) {
      state.filter = event.target.value;
      renderIndex();
    });
    var removedWrap = document.getElementById("removedWrap");
    if (removedWrap) {
      removedWrap.addEventListener("toggle", function () { state.showRemoved = removedWrap.open; });
    }
    Array.prototype.forEach.call(view.querySelectorAll(".card-open"), function (card) {
      card.addEventListener("click", function () {
        location.hash = "#/p/" + card.getAttribute("data-id");
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll("[data-archive]"), function (button) {
      button.addEventListener("click", function () {
        archiveProduct(button.getAttribute("data-archive"), true);
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll("[data-restore]"), function (button) {
      button.addEventListener("click", function () {
        archiveProduct(button.getAttribute("data-restore"), false);
      });
    });
    document.getElementById("createTop").addEventListener("click", openCreateModal);
    document.getElementById("createCard").addEventListener("click", openCreateModal);
  }

  /* ------------------------------------------------- remove / put back */

  /**
   * "Remove" never deletes anything - it flags the product so Mithra can take
   * it off the shop. The reason is asked for once here because it is the only
   * thing that tells us *why* (out of stock for good vs a bad photo).
   */
  function archiveProduct(productId, archived) {
    var product = null;
    state.products.forEach(function (item) { if (item.id === productId) product = item; });
    var name = product ? product.title : "this product";
    var reason = "";

    if (archived) {
      reason = prompt(
        'Remove "' + name + '" from the shop?\\n\\nNothing is deleted - it moves to "Removed products" and we take it off the website.\\n\\nWhy are you removing it? (optional)',
        ""
      );
      if (reason === null) return;
    } else if (!confirm('Put "' + name + '" back?')) {
      return;
    }

    var by = (state.data && state.data.brief.summary.contact) || "";
    api("/products/" + encodeURIComponent(productId) + "/archive", {
      method: "POST",
      body: JSON.stringify({ archived: archived, reason: reason || "", by: by })
    }).then(function (body) {
      if (product) {
        product.archived = body.archived;
        product.archive_reason = body.archive_reason;
      }
      if (archived) state.showRemoved = true;
      toast(archived ? "Removed - Mithra will take it off the website" : "Put back");
      if (state.current === productId) {
        if (state.data) {
          state.data.brief.archived = body.archived;
          state.data.brief.archive_reason = body.archive_reason;
        }
        renderProduct();
      } else {
        renderIndex();
      }
    }).catch(function (error) {
      toast(error.message, true);
    });
  }

  /* --------------------------------------------------- create a product */

  function openCreateModal() {
    var html = '<div class="modal-bg" id="modalBg"><div class="modal">';
    html += "<h3>Create a new product</h3>";
    html += '<p class="count">Give it a name to start. On the next screen you can add its photos, price, pack size and everything else.</p>';
    html += '<div class="field" style="margin-top:16px"><label for="newTitle">Product name</label>';
    html += '<div class="hint">Exactly as it should appear in the shop, e.g. \u201cSastra Pure Cow Ghee, 1 L\u201d.</div>';
    html += '<input type="text" id="newTitle" placeholder="Product name" /></div>';
    html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">';
    html += '<button class="btn subtle" id="closeModal" type="button">Cancel</button>';
    html += '<button class="btn" id="createGo" type="button">Create product</button>';
    html += "</div></div></div>";
    document.body.insertAdjacentHTML("beforeend", html);

    var input = document.getElementById("newTitle");
    input.focus();
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") createProduct();
    });
    document.getElementById("createGo").addEventListener("click", createProduct);
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("modalBg").addEventListener("click", function (event) {
      if (event.target.id === "modalBg") closeModal();
    });
  }

  function createProduct() {
    var input = document.getElementById("newTitle");
    var button = document.getElementById("createGo");
    if (!input) return;
    var title = input.value.trim();
    if (!title) { input.focus(); toast("Please give the product a name.", true); return; }

    button.disabled = true;
    button.textContent = "Creating...";
    api("/products", { method: "POST", body: JSON.stringify({ title: title }) })
      .then(function (body) {
        closeModal();
        // Straight into the editor - the product exists only as a brief until
        // Mithra creates it for real, so this is where the rest is filled in.
        location.hash = "#/p/" + body.product_id;
      })
      .catch(function (error) {
        button.disabled = false;
        button.textContent = "Create product";
        toast(error.message, true);
      });
  }

  /* -------------------------------------------------------------- product */

  function loadProduct(productId) {
    view.innerHTML = '<div class="empty">Loading...</div>';
    api("/briefs/" + encodeURIComponent(productId))
      .then(function (body) {
        state.current = productId;
        state.data = body;
        if (!Array.isArray(body.brief.slides)) body.brief.slides = [];
        if (!body.brief.proposal) body.brief.proposal = { images: [] };
        if (!Array.isArray(body.brief.proposal.images)) body.brief.proposal.images = [];
        renderProduct();
      })
      .catch(function (error) {
        view.innerHTML = '<div class="panel"><h1>Could not open that product</h1><p class="lede">' + esc(error.message) + "</p></div>";
      });
  }

  function hintFor(name) {
    var needle = (name || "").trim().toLowerCase();
    for (var i = 0; i < SLIDE_TEMPLATES.length; i++) {
      if (SLIDE_TEMPLATES[i].name.toLowerCase() === needle) return SLIDE_TEMPLATES[i].hint;
    }
    return "";
  }

  function renderProduct() {
    var product = state.data.product;
    var brief = state.data.brief;
    var summary = brief.summary || {};

    var isNew = brief.origin === "client";
    var proposal = brief.proposal || {};

    var html = "";
    html += '<button class="btn ghost" id="back" type="button">&larr; All products</button>';
    html += '<div style="height:14px"></div>';

    if (brief.archived) {
      html += '<div class="banner warn"><b>Removed.</b> Mithra will take this product off the website. Nothing you wrote here is lost.';
      html += '<span class="spacer"></span><button class="btn subtle" id="restoreProduct" type="button">Put it back</button></div>';
    }

    html += '<div class="panel"><header><div><h1 style="margin:0">' + esc(isNew ? (proposal.title || product.title) : product.title) + "</h1>";
    html += '<div class="count">' + esc(isNew ? "Added by you - not on the website yet" : (product.handle || "")) + "</div></div>" + pill(brief.status) + "</header>";

    if (isNew) {
      html += '<p class="count" style="margin:0 0 14px">Fill this in and press "Send to Mithra". We will add it to the shop for you - the photos and words you put here are what we will use.</p>';
    }

    if (isNew) {
      html += '<div class="field"><label>Photos of this product</label>';
      html += '<div class="hint">The pack itself, front and back. JPG, PNG, WEBP, HEIC or PDF, up to 10 MB each.</div>';
      html += '<div class="imgstrip" style="margin-bottom:10px">';
      (proposal.images || []).forEach(function (image, imageIndex) {
        html += '<div class="thumbcard">';
        if (/\\.pdf($|\\?)/i.test(image.url)) {
          html += '<a class="doc" href="' + esc(image.url) + '" target="_blank" rel="noopener">' + esc(image.filename || "PDF") + "</a>";
        } else {
          html += '<a href="' + esc(image.url) + '" target="_blank" rel="noopener"><img loading="lazy" alt="" src="' + esc(image.url) + '" /></a>';
        }
        html += '<button class="rm" type="button" data-rmimg="' + imageIndex + '" data-imgslide="product" title="Remove">&times;</button>';
        html += "</div>";
      });
      html += "</div>";
      html += '<div class="drop" data-drop="product">Drag photos here, or click to choose</div>';
      html += "</div>";
      html += "</div>";

      html += '<div class="panel"><header><h2>Product details</h2></header>';
      html += field("proposal", "title", "Product name", "Exactly as it should appear in the shop.", proposal.title, false);
      html += '<div class="grid2">';
      html += field("proposal", "category", "Category", "Where it belongs, e.g. \u201cOils & Ghee\u201d.", proposal.category, false);
      html += field("proposal", "pack_size", "Pack size", "e.g. \u201c500 g\u201d, \u201c1 L\u201d, \u201cpack of 2\u201d.", proposal.pack_size, false);
      html += "</div>";
      html += field("proposal", "price", "Price", "What it should sell for, e.g. \u201c$12.99\u201d. We will confirm before it goes live.", proposal.price, false);
      html += field("proposal", "description", "Description", "What it is, in your own words. This is what shoppers read on the product page.", proposal.description, true);
      html += field("proposal", "ingredients", "Ingredients", "Copy the ingredient list off the pack.", proposal.ingredients, true);
      html += field("proposal", "notes", "Anything else we should know", "Supplier, shelf life, how it is stored, anything unusual.", proposal.notes, true);
      html += "</div>";
    }

    if (!isNew && product.images && product.images.length) {
      html += '<h2 style="margin-bottom:10px">Photos we already have</h2>';
      html += '<div class="imgstrip">';
      product.images.forEach(function (image) {
        html += '<a href="' + esc(image.url) + '" target="_blank" rel="noopener"><img loading="lazy" alt="" src="' + esc(image.url) + '" /></a>';
      });
      html += "</div>";
      html += '<p class="count" style="margin:10px 0 0">Click any photo to see it full size. If a better one exists, upload it on the relevant slide below.</p>';
      html += "</div>";
    } else if (!isNew) {
      html += '<p class="count" style="margin:0">We have no photos for this product yet - please upload at least one clear shot of the pack below.</p>';
      html += "</div>";
    }

    html += '<div class="panel"><header><h2>About this product</h2></header>';
    html += '<div class="grid2">';
    html += field("summary", "tagline", "Tagline", "The one line that sums it up. Five words or fewer, e.g. \\u201cSlow Cooked. Never Hurried.\\u201d", summary.tagline, false);
    html += field("summary", "sub_claim", "Short claim", "A few words in capitals, e.g. \\u201cCOLD PRESSED - UNREFINED\\u201d", summary.sub_claim, false);
    html += "</div>";
    html += field("summary", "notes", "Anything we should know", "Ingredients, who it is for, what makes it different, what to avoid saying.", summary.notes, true);
    html += linkEditor("summary", -1, summary.links || [], "Reference links for the whole product", "Paste links to any design, brand or photo you want this to look like.");
    html += field("summary", "contact", "Your name", "So we know who to ask if something is unclear.", summary.contact, false);
    html += "</div>";

    html += '<div class="panel"><header><h2>Slides</h2><span class="count">' + brief.slides.length + " slide" + (brief.slides.length === 1 ? "" : "s") + "</span></header>";
    if (!brief.slides.length) {
      html += '<p class="lede" style="margin-bottom:14px">No slides yet. Add one for each image you want in this product\\u2019s carousel - start with the plain packshot, then the styled shot, then the benefits, and so on.</p>';
    }
    html += '<div id="slides">';
    brief.slides.forEach(function (slide, index) {
      html += renderSlide(slide, index, brief.slides.length);
    });
    html += "</div>";

    html += '<div style="margin-top:6px"><button class="btn" id="addSlide" type="button">+ Add a slide</button></div>';
    html += '<p class="count" style="margin:14px 0 6px">Or start from one of these - you can rename it afterwards:</p>';
    html += '<div class="chips">';
    SLIDE_TEMPLATES.forEach(function (template) {
      html += '<button class="chip" type="button" data-template="' + esc(template.name) + '">' + esc(template.name) + "</button>";
    });
    html += "</div></div>";

    html += '<div class="sticky-actions">';
    html += '<span class="note">Everything saves automatically.</span>';
    if (!brief.archived) {
      html += '<button class="btn danger" id="archiveProduct" type="button">' + (isNew ? "Delete this product" : "Remove from the shop") + "</button>";
    }
    if (brief.status === "submitted" || brief.status === "approved") {
      html += '<button class="btn subtle" id="reopen" type="button">Reopen for editing</button>';
    } else {
      html += '<button class="btn" id="submit" type="button">Send to Mithra</button>';
    }
    html += "</div>";

    view.innerHTML = html;
    bindProduct();
  }

  function field(scope, key, label, hint, value, multiline) {
    var id = scope + "-" + key;
    var html = '<div class="field"><label for="' + id + '">' + label + "</label>";
    if (hint) html += '<div class="hint">' + hint + "</div>";
    if (multiline) {
      html += '<textarea id="' + id + '" data-scope="' + scope + '" data-key="' + key + '">' + esc(value || "") + "</textarea>";
    } else {
      html += '<input type="text" id="' + id + '" data-scope="' + scope + '" data-key="' + key + '" value="' + esc(value || "") + '" />';
    }
    return html + "</div>";
  }

  function linkEditor(scope, index, links, label, hint) {
    var html = '<div class="field"><label>' + label + "</label>";
    if (hint) html += '<div class="hint">' + hint + "</div>";
    links.forEach(function (link, linkIndex) {
      html += '<div class="linkrow">';
      html += '<input type="url" data-linkscope="' + scope + '" data-slide="' + index + '" data-link="' + linkIndex + '" value="' + esc(link) + '" placeholder="https://" />';
      html += '<button class="btn subtle icon" type="button" data-rmlink="' + linkIndex + '" data-linkslide="' + index + '" data-linkscope2="' + scope + '" title="Remove link">&times;</button>';
      html += "</div>";
    });
    html += '<button class="btn subtle" type="button" data-addlink="' + scope + '" data-addlinkslide="' + index + '">+ Add a link</button>';
    return html + "</div>";
  }

  function renderSlide(slide, index, total) {
    var hint = hintFor(slide.name);
    var html = '<div class="slide" data-index="' + index + '">';
    html += '<div class="slide-head">';
    html += '<span class="slide-num">' + (index + 1) + "</span>";
    html += '<input type="text" list="slideNames" data-scope="slide" data-key="name" data-index="' + index + '" value="' + esc(slide.name) + '" placeholder="Name this slide, e.g. Benefits" />';
    html += '<button class="btn subtle icon" type="button" data-move="up" data-index="' + index + '"' + (index === 0 ? " disabled" : "") + ' title="Move up">&uarr;</button>';
    html += '<button class="btn subtle icon" type="button" data-move="down" data-index="' + index + '"' + (index === total - 1 ? " disabled" : "") + ' title="Move down">&darr;</button>';
    html += '<button class="btn danger icon" type="button" data-remove="' + index + '" title="Delete slide">Delete</button>';
    html += "</div>";

    html += '<div class="slide-body">';
    if (hint) html += '<p class="slide-hint">' + esc(hint) + "</p>";

    html += '<div class="field"><label>What should this slide say?</label>';
    html += '<div class="hint">The exact words you want on the image. One idea per line. Leave it empty if this slide has no text.</div>';
    html += '<textarea data-scope="slide" data-key="content" data-index="' + index + '">' + esc(slide.content || "") + "</textarea></div>";

    html += '<div class="field"><label>Photos for this slide</label>';
    html += '<div class="hint">Your own product photos, or pictures of the look you want. JPG, PNG, WEBP, HEIC or PDF, up to 10 MB each.</div>';
    html += '<div class="imgstrip" style="margin-bottom:10px">';
    (slide.images || []).forEach(function (image, imageIndex) {
      html += '<div class="thumbcard">';
      if (/\\.pdf($|\\?)/i.test(image.url)) {
        html += '<a class="doc" href="' + esc(image.url) + '" target="_blank" rel="noopener">' + esc(image.filename || "PDF") + "</a>";
      } else {
        html += '<a href="' + esc(image.url) + '" target="_blank" rel="noopener"><img loading="lazy" alt="" src="' + esc(image.url) + '" /></a>';
      }
      html += '<button class="rm" type="button" data-rmimg="' + imageIndex + '" data-imgslide="' + index + '" title="Remove">&times;</button>';
      html += "</div>";
    });
    html += "</div>";
    html += '<div class="drop" data-drop="' + index + '">Drag photos here, or click to choose</div>';
    html += "</div>";

    html += linkEditor("slide", index, slide.links || [], "Reference links for this slide", "");

    html += '<div class="field"><label>Notes for our designer</label>';
    html += '<div class="hint">Colours, mood, props, anything to avoid.</div>';
    html += '<textarea data-scope="slide" data-key="notes" data-index="' + index + '">' + esc(slide.notes || "") + "</textarea></div>";

    html += "</div></div>";
    return html;
  }

  // The #view element survives every re-render (only its innerHTML changes),
  // so delegated listeners must be attached exactly once. Binding them inside
  // the render function stacked a new copy per redraw, and one chip click then
  // added as many slides as there had been renders.
  var delegatesBound = false;

  function bindProduct() {
    document.getElementById("back").addEventListener("click", function () {
      flushSave().then(function () { location.hash = ""; });
    });

    bindDropZones();

    if (delegatesBound) return;
    delegatesBound = true;

    // Typing never re-renders - that would steal focus mid-word. The DOM is
    // the source of truth for text until a structural change forces a redraw.
    view.addEventListener("input", function (event) {
      if (!state.data) return;
      var brief = state.data.brief;
      var target = event.target;
      var scope = target.getAttribute("data-scope");
      if (scope === "summary") {
        brief.summary[target.getAttribute("data-key")] = target.value;
        scheduleSave();
        return;
      }
      if (scope === "proposal") {
        brief.proposal[target.getAttribute("data-key")] = target.value;
        scheduleSave();
        return;
      }
      if (scope === "slide") {
        var index = parseInt(target.getAttribute("data-index"), 10);
        var key = target.getAttribute("data-key");
        brief.slides[index][key] = target.value;
        if (key === "name") {
          var hint = hintFor(target.value);
          var body = target.closest(".slide").querySelector(".slide-body");
          var existing = body.querySelector(".slide-hint");
          if (hint && !existing) {
            var el = document.createElement("p");
            el.className = "slide-hint";
            el.textContent = hint;
            body.insertBefore(el, body.firstChild);
          } else if (hint) {
            existing.textContent = hint;
          } else if (existing) {
            existing.remove();
          }
        }
        scheduleSave();
        return;
      }
      if (target.hasAttribute("data-linkscope")) {
        var linkScope = target.getAttribute("data-linkscope");
        var slideIndex = parseInt(target.getAttribute("data-slide"), 10);
        var linkIndex = parseInt(target.getAttribute("data-link"), 10);
        var bucket = linkScope === "summary" ? brief.summary.links : brief.slides[slideIndex].links;
        bucket[linkIndex] = target.value;
        scheduleSave();
      }
    });

    view.addEventListener("click", function (event) {
      if (!state.data) return;
      var brief = state.data.brief;
      var target = event.target.closest("button");
      if (!target) return;

      if (target.id === "addSlide" || target.hasAttribute("data-template")) {
        var name = target.getAttribute("data-template") || "";
        brief.slides.push({ id: "s" + Date.now().toString(36) + Math.floor(Math.random() * 1000), name: name, content: "", notes: "", links: [], images: [] });
        redraw();
        return;
      }
      if (target.hasAttribute("data-remove")) {
        var removeAt = parseInt(target.getAttribute("data-remove"), 10);
        var slideName = brief.slides[removeAt].name || "slide " + (removeAt + 1);
        if (!confirm("Delete " + slideName + "? Anything written on it will be lost.")) return;
        brief.slides.splice(removeAt, 1);
        redraw();
        return;
      }
      if (target.hasAttribute("data-move")) {
        var from = parseInt(target.getAttribute("data-index"), 10);
        var to = target.getAttribute("data-move") === "up" ? from - 1 : from + 1;
        if (to < 0 || to >= brief.slides.length) return;
        var moved = brief.slides.splice(from, 1)[0];
        brief.slides.splice(to, 0, moved);
        redraw();
        return;
      }
      if (target.hasAttribute("data-addlink")) {
        var addScope = target.getAttribute("data-addlink");
        var addSlide = parseInt(target.getAttribute("data-addlinkslide"), 10);
        if (addScope === "summary") brief.summary.links.push("");
        else brief.slides[addSlide].links.push("");
        redraw();
        return;
      }
      if (target.hasAttribute("data-rmlink")) {
        var rmScope = target.getAttribute("data-linkscope2");
        var rmSlide = parseInt(target.getAttribute("data-linkslide"), 10);
        var rmIndex = parseInt(target.getAttribute("data-rmlink"), 10);
        if (rmScope === "summary") brief.summary.links.splice(rmIndex, 1);
        else brief.slides[rmSlide].links.splice(rmIndex, 1);
        redraw();
        return;
      }
      if (target.hasAttribute("data-rmimg")) {
        var imgSlide = target.getAttribute("data-imgslide");
        var imgIndex = parseInt(target.getAttribute("data-rmimg"), 10);
        imageBucket(imgSlide).splice(imgIndex, 1);
        redraw();
        return;
      }
      if (target.id === "submit") setSubmitted(true);
      if (target.id === "reopen") setSubmitted(false);
      if (target.id === "archiveProduct") archiveProduct(state.current, true);
      if (target.id === "restoreProduct") archiveProduct(state.current, false);
    });

  }

  function bindDropZones() {
    Array.prototype.forEach.call(view.querySelectorAll(".drop"), function (zone) {
      var index = zone.getAttribute("data-drop");
      zone.addEventListener("click", function () {
        var picker = document.createElement("input");
        picker.type = "file";
        picker.multiple = true;
        picker.accept = "image/*,application/pdf";
        picker.addEventListener("change", function () { uploadFiles(index, picker.files); });
        picker.click();
      });
      zone.addEventListener("dragover", function (event) { event.preventDefault(); zone.classList.add("over"); });
      zone.addEventListener("dragleave", function () { zone.classList.remove("over"); });
      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        zone.classList.remove("over");
        uploadFiles(index, event.dataTransfer.files);
      });
    });
  }

  function redraw() {
    renderProduct();
    scheduleSave();
  }

  /* -------------------------------------------------------------- uploads */

  /**
   * Photos live either on a slide or, for a product the client created here,
   * on the product itself. "target" is the slide index or the string
   * "product" - the drop zones and the remove buttons both carry it verbatim.
   */
  function imageBucket(target) {
    if (target === "product") {
      if (!state.data.brief.proposal.images) state.data.brief.proposal.images = [];
      return state.data.brief.proposal.images;
    }
    return state.data.brief.slides[parseInt(target, 10)].images;
  }

  function uploadFiles(target, files) {
    if (!files || !files.length) return;
    var list = Array.prototype.slice.call(files);
    var zone = view.querySelector('[data-drop="' + target + '"]');
    var done = 0;

    function step(index) {
      if (index >= list.length) {
        if (zone) zone.textContent = "Drag photos here, or click to choose";
        if (done) { redraw(); toast(done + " file" + (done === 1 ? "" : "s") + " uploaded"); }
        return;
      }
      var file = list[index];
      if (zone) zone.textContent = "Uploading " + (index + 1) + " of " + list.length + "...";

      var reader = new FileReader();
      reader.onload = function () {
        api("/uploads", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || "image/jpeg",
            data: String(reader.result).split(",")[1],
            handle: state.data.product.handle || state.data.brief.proposal.title || "new-product"
          })
        }).then(function (body) {
          imageBucket(target).push({ url: body.url, key: body.key, filename: body.filename });
          done++;
          step(index + 1);
        }).catch(function (error) {
          toast(file.name + ": " + error.message, true);
          step(index + 1);
        });
      };
      reader.onerror = function () {
        toast("Could not read " + file.name, true);
        step(index + 1);
      };
      reader.readAsDataURL(file);
    }

    step(0);
  }

  /* --------------------------------------------------------------- saving */

  function scheduleSave() {
    state.dirty = true;
    setSaveState("Saving...");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(save, 900);
  }

  function save() {
    if (!state.current || !state.data) return Promise.resolve();
    clearTimeout(state.saveTimer);
    var brief = state.data.brief;
    return api("/briefs/" + encodeURIComponent(state.current), {
      method: "PUT",
      body: JSON.stringify({
        summary: brief.summary,
        slides: brief.slides,
        proposal: brief.proposal,
        updated_by: brief.summary.contact || ""
      })
    }).then(function () {
      state.dirty = false;
      var now = new Date();
      setSaveState("Saved " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }).catch(function (error) {
      setSaveState("Not saved");
      toast("Could not save: " + error.message, true);
    });
  }

  function flushSave() {
    return state.dirty ? save() : Promise.resolve();
  }

  function setSubmitted(submitted) {
    flushSave().then(function () {
      return api("/briefs/" + encodeURIComponent(state.current) + "/submit", {
        method: "POST",
        body: JSON.stringify({ submitted: submitted })
      });
    }).then(function (body) {
      state.data.brief.status = body.status;
      renderProduct();
      toast(submitted ? "Sent to Mithra - thank you" : "Reopened for editing");
    }).catch(function (error) {
      toast(error.message, true);
    });
  }

  window.addEventListener("beforeunload", function (event) {
    if (state.dirty) { event.preventDefault(); event.returnValue = ""; }
  });

  /* --------------------------------------------------------------- modals */

  document.getElementById("exampleBtn").addEventListener("click", function () {
    var html = '<div class="modal-bg" id="modalBg"><div class="modal">';
    html += "<h3>What a finished product looks like</h3>";
    html += '<p class="count">' + esc(EXAMPLE.title) + "</p>";
    html += '<p style="margin:12px 0 0"><b>Tagline:</b> ' + esc(EXAMPLE.tagline) + "<br /><b>Short claim:</b> " + esc(EXAMPLE.sub_claim) + "</p>";
    EXAMPLE.slides.forEach(function (slide, index) {
      html += '<div class="ex-slide"><b>' + (index + 1) + ". " + esc(slide.name) + "</b><span>" + esc(slide.content);
      if (slide.notes) html += "\\n\\nNote to designer: " + esc(slide.notes);
      html += "</span></div>";
    });
    html += '<div style="text-align:right;margin-top:18px"><button class="btn" id="closeModal" type="button">Close</button></div>';
    html += "</div></div>";
    document.body.insertAdjacentHTML("beforeend", html);
    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("modalBg").addEventListener("click", function (event) {
      if (event.target.id === "modalBg") closeModal();
    });
  });

  function closeModal() {
    var modal = document.getElementById("modalBg");
    if (modal) modal.remove();
  }

  /* -------------------------------------------------------------- routing */

  function route() {
    closeModal();
    var match = location.hash.match(/^#\\/p\\/(.+)$/);
    if (match) loadProduct(decodeURIComponent(match[1]));
    else { state.current = null; state.data = null; loadIndex(); }
  }

  window.addEventListener("hashchange", route);

  document.body.insertAdjacentHTML(
    "beforeend",
    '<datalist id="slideNames">' +
      SLIDE_TEMPLATES.map(function (template) { return '<option value="' + template.name + '"></option>'; }).join("") +
      "</datalist>"
  );

  route();
})();
</script>
</body>
</html>`
