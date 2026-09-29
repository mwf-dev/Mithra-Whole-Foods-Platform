import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /tracking-demo
 *
 * Standalone, unauthenticated tracking page — NOT part of the admin app, not
 * linked from anywhere in it. Exists to show a client the ship→deliver→email
 * pipeline without them needing an admin login: paste an order number, click
 * through the same states a FedEx delivery would trigger. "Mark as shipped"
 * and "Simulate delivery" call the real workflows (src/api/tracking-demo/ship
 * + /deliver), not a mock — the DB genuinely changes.
 *
 * ⚠️ No auth by design (that was the ask). Order numbers are small sequential
 * integers, so this route — and the /tracking-demo/lookup, /ship, /deliver
 * routes it calls — are guessable/enumerable by anyone who has this URL.
 * `trackingDemoLimiter` in src/api/middlewares.ts rate-limits it and
 * /tracking-demo/lookup masks customer emails, but neither is a substitute
 * for auth. Don't link this from anywhere public; treat the URL itself as the
 * only thing keeping it private.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.send(HTML)
}

const HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Delivery Tracking</title>
<style>
  :root {
    --purple: #4d148c;
    --purple-dark: #350f61;
    --orange: #ff6600;
    --orange-dark: #d95400;
    --ink: #1a1523;
    --muted: #6b6577;
    --line: #e4dfee;
    --bg: #f4f2f9;
    --green: #1a8f4c;
    --green-bg: #e8f8ee;
    --red: #c23b3b;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--ink);
  }
  header {
    background: var(--purple);
    color: #fff;
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.2px;
  }
  header .brand .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--orange); }
  header .tag {
    font-size: 12px;
    background: rgba(255,255,255,0.12);
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 600;
  }
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }
  .search-card {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(20,10,40,0.08), 0 8px 24px rgba(20,10,40,0.06);
    padding: 28px;
  }
  .search-card h1 {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .search-card p {
    margin: 0 0 20px;
    color: var(--muted);
    font-size: 14px;
  }
  .search-row {
    display: flex;
    gap: 10px;
  }
  input[type="text"] {
    flex: 1;
    padding: 13px 14px;
    font-size: 15px;
    border: 1.5px solid var(--line);
    border-radius: 8px;
    outline: none;
  }
  input[type="text"]:focus { border-color: var(--purple); }
  button {
    position: relative;
    cursor: pointer;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    padding: 13px 22px;
  }
  .btn-primary { background: var(--orange); color: #fff; }
  .btn-primary:hover { background: var(--orange-dark); }
  .btn-secondary { background: var(--purple); color: #fff; }
  .btn-secondary:hover { background: var(--purple-dark); }
  .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: default; }
  button.is-loading { position: relative; color: transparent !important; }
  button.is-loading .spinner { display: block; }
  .spinner {
    display: none;
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .result { margin-top: 24px; }
  .result-card {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(20,10,40,0.08), 0 8px 24px rgba(20,10,40,0.06);
    padding: 28px;
    margin-bottom: 18px;
  }
  .result-card .order-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .result-card .order-head h2 { margin: 0; font-size: 19px; }
  .result-card .order-head span { color: var(--muted); font-size: 13px; }
  .items { color: var(--muted); font-size: 13px; margin: 4px 0 22px; }

  .tracker {
    display: flex;
    align-items: center;
    margin: 24px 0 26px;
  }
  .tracker .step {
    flex: 1;
    text-align: center;
    position: relative;
  }
  .tracker .step .circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--line);
    color: var(--muted);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 8px;
    font-size: 14px;
    font-weight: 700;
    position: relative;
    z-index: 1;
  }
  .tracker .step.done .circle { background: var(--green); color: #fff; }
  .tracker .step.current .circle { background: var(--orange); color: #fff; }
  .tracker .step .label { font-size: 12px; color: var(--muted); font-weight: 600; }
  .tracker .step.done .label, .tracker .step.current .label { color: var(--ink); }
  .tracker .bar {
    position: absolute;
    top: 15px;
    left: -50%;
    width: 100%;
    height: 3px;
    background: var(--line);
    z-index: 0;
  }
  .tracker .step:first-child .bar { display: none; }
  .tracker .step.done .bar, .tracker .step.current .bar { background: var(--green); }

  .fulfillment {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px;
    margin-top: 14px;
  }
  .fulfillment .fid { font-size: 12px; color: var(--muted); font-family: ui-monospace, monospace; }
  .badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 999px;
    margin-left: 8px;
  }
  .badge.grey { background: #eee; color: #666; }
  .badge.orange { background: #fff1e6; color: var(--orange-dark); }
  .badge.green { background: var(--green-bg); color: var(--green); }
  .badge.red { background: #fbe9e9; color: var(--red); }

  .tracking-nums { margin: 10px 0; font-size: 13px; }
  .tracking-nums code {
    background: #f3f0fa;
    padding: 2px 8px;
    border-radius: 6px;
    margin-right: 6px;
    font-size: 12.5px;
  }

  .action-row {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    align-items: center;
  }
  .action-row input[type="text"] { max-width: 220px; }

  .demo-note {
    margin-top: 4px;
    font-size: 11.5px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    font-weight: 700;
  }

  .error { color: var(--red); font-size: 14px; margin-top: 14px; }
  .empty { color: var(--muted); font-size: 14px; text-align: center; padding: 20px 0; }
  .footer-note {
    max-width: 760px;
    margin: 24px auto 0;
    padding: 0 20px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <header>
    <div class="brand"><span class="dot"></span> Delivery Tracking</div>
    <div class="tag">Internal demo</div>
  </header>

  <main>
    <div class="search-card">
      <h1>Track an order</h1>
      <p>Enter an order number to see its shipment status.</p>
      <div class="search-row">
        <input id="order-input" type="text" placeholder="e.g. 9" autocomplete="off" />
        <button class="btn-primary" id="search-btn"><span class="btn-label">Track</span><span class="spinner"></span></button>
      </div>
    </div>

    <div class="result" id="result"></div>
  </main>

  <div class="footer-note">
    Demo controls simulate what happens when a carrier confirms a delivery —
    the same code path a real webhook would trigger. Clicking them changes the
    real order status in the database.
  </div>

<script>
const resultEl = document.getElementById('result');
const input = document.getElementById('order-input');
const searchBtn = document.getElementById('search-btn');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function stepState(f, key) {
  const order = ['packed', 'shipped', 'delivered'];
  const idx = order.indexOf(key);
  const doneUpTo = f.delivered ? 2 : f.shipped ? 1 : f.packed ? 0 : -1;
  if (idx <= doneUpTo && idx !== doneUpTo) return 'done';
  if (idx === doneUpTo) return f.delivered ? 'done' : 'current';
  return '';
}

function tracker(f) {
  const steps = [
    ['packed', 'Packed'],
    ['shipped', 'Shipped'],
    ['delivered', 'Delivered'],
  ];
  return '<div class="tracker">' + steps.map(([key, label], i) => {
    const state = stepState(f, key);
    const icon = state === 'done' ? '\\u2713' : (i + 1);
    return '<div class="step ' + state + '">'
      + '<div class="bar"></div>'
      + '<div class="circle">' + icon + '</div>'
      + '<div class="label">' + label + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function badge(f) {
  if (f.canceled) return '<span class="badge red">Canceled</span>';
  if (f.delivered) return '<span class="badge green">Delivered</span>';
  if (f.shipped) return '<span class="badge orange">Shipped</span>';
  if (f.packed) return '<span class="badge grey">Packed</span>';
  return '<span class="badge grey">Not fulfilled</span>';
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || ('HTTP ' + res.status));
  return body;
}

function fulfillmentHtml(f) {
  const items = f.items.map(i => esc(i.title) + ' \\u00d7 ' + i.quantity).join(', ');
  const tracking = f.tracking_numbers.length
    ? '<div class="tracking-nums">' + f.tracking_numbers.map(t => '<code>' + esc(t) + '</code>').join('') + '</div>'
    : '';

  let actions = '';
  if (!f.shipped && !f.canceled) {
    actions = '<div class="demo-note">Demo control</div>'
      + '<div class="action-row">'
      + '<input type="text" placeholder="Tracking number" id="tn-' + esc(f.id) + '" />'
      + '<button class="btn-secondary" data-action="ship" data-fulfillment-id="' + esc(f.id) + '">'
      + '<span class="btn-label">Mark as shipped</span><span class="spinner"></span>'
      + '</button>'
      + '</div>';
  } else if (f.shipped && !f.delivered && f.tracking_numbers.length) {
    actions = '<div class="demo-note">Demo control &middot; simulates a carrier delivery confirmation</div>'
      + '<div class="action-row">'
      + '<button class="btn-primary" data-action="deliver" data-tracking-number="' + esc(f.tracking_numbers[0]) + '">'
      + '<span class="btn-label">Simulate delivery</span><span class="spinner"></span>'
      + '</button>'
      + '</div>';
  } else if (f.delivered) {
    actions = '<div class="demo-note" style="color:var(--green)">Delivered' + (f.delivered_at ? ' &middot; ' + new Date(f.delivered_at).toLocaleString() : '') + '</div>';
  }

  return '<div class="fulfillment">'
    + '<div class="fid">' + esc(f.id) + badge(f) + '</div>'
    + '<div class="items">' + items + '</div>'
    + tracker(f)
    + tracking
    + actions
    + '</div>';
}

function render(data) {
  const o = data.order;
  const fulfillments = data.fulfillments;
  resultEl.innerHTML = '<div class="result-card">'
    + '<div class="order-head"><h2>Order #' + o.display_id + '</h2><span>' + esc(o.email) + '</span></div>'
    + (fulfillments.length
        ? fulfillments.map(fulfillmentHtml).join('')
        : '<div class="empty">No fulfillments on this order yet.</div>')
    + '</div>';
}

// A single flag guards every action: this page is a demo meant to be
// clicked through one step at a time, so a stray double-click while a
// request is in flight should be a no-op, not a second request racing the
// first (e.g. two ship calls on the same fulfillment).
let busy = false;

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
}

let lastQuery = '';

async function search() {
  const q = input.value.trim();
  if (!q || busy) return;
  lastQuery = q;
  busy = true;
  setButtonLoading(searchBtn, true);
  resultEl.innerHTML = '<div class="empty">Looking up order&hellip;</div>';
  try {
    const data = await api('/tracking-demo/lookup?order=' + encodeURIComponent(q));
    render(data);
  } catch (e) {
    resultEl.innerHTML = '<div class="error">' + esc(e.message) + '</div>';
  } finally {
    busy = false;
    setButtonLoading(searchBtn, false);
  }
}

async function refreshQuietly() {
  // Same as search(), but doesn't touch the search button's loading state or
  // clear the card first — used right after a ship/deliver action, where the
  // action button is already showing its own spinner.
  if (!lastQuery) return;
  try {
    const data = await api('/tracking-demo/lookup?order=' + encodeURIComponent(lastQuery));
    render(data);
  } catch (e) {
    resultEl.innerHTML = '<div class="error">' + esc(e.message) + '</div>';
  }
}

async function doShip(btn, fulfillmentId) {
  const el = document.getElementById('tn-' + fulfillmentId);
  const tracking = el ? el.value.trim() : '';
  if (!tracking) { alert('Enter a tracking number first'); return; }
  busy = true;
  setButtonLoading(btn, true);
  if (el) el.disabled = true;
  try {
    await api('/tracking-demo/ship', {
      method: 'POST',
      body: JSON.stringify({ fulfillment_id: fulfillmentId, tracking_number: tracking }),
    });
    await refreshQuietly();
  } catch (e) {
    alert('Mark as shipped failed: ' + e.message);
    setButtonLoading(btn, false);
    if (el) el.disabled = false;
  } finally {
    busy = false;
  }
}

async function doDeliver(btn, tracking) {
  busy = true;
  setButtonLoading(btn, true);
  try {
    const result = await api('/tracking-demo/deliver', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: tracking }),
    });
    await refreshQuietly();
    if (result.already_delivered) {
      alert('Already delivered.');
    }
  } catch (e) {
    alert('Simulated delivery failed: ' + e.message);
    setButtonLoading(btn, false);
  } finally {
    busy = false;
  }
}

// Event delegation instead of inline onclick="..." handlers: fulfillment ids
// and tracking numbers were previously interpolated straight into an
// onclick="" HTML attribute, and a JSON.stringify()'d value containing a
// double quote breaks that attribute's own double-quoting — which is exactly
// what silently no-op'd the "Simulate delivery" button. Reading data-* via
// getAttribute() has no such quoting hazard.
resultEl.addEventListener('click', (e) => {
  if (busy) return;
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'ship') {
    doShip(btn, btn.dataset.fulfillmentId);
  } else if (btn.dataset.action === 'deliver') {
    doDeliver(btn, btn.dataset.trackingNumber);
  }
});

searchBtn.addEventListener('click', search);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
</script>
</body>
</html>
`
