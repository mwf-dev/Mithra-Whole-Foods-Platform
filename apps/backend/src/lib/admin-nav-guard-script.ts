/**
 * Browser script injected into every admin page (see `admin.vite` in
 * medusa-config.ts). It asks /admin/my-access what this login may see and hides
 * the matching sidebar links, and shows a notice if someone types a hidden URL.
 *
 * Cosmetic only — the server guard (src/api/admin-access-guard.ts) refuses the
 * underlying requests regardless. Plain ES5 so it runs before/without the app.
 */
export const NAV_GUARD_SCRIPT = `
(function () {
  var STYLE_ID = "mithra-nav-guard";
  var NOTICE_ID = "mithra-nav-notice";
  var hidden = [];
  var known = false; // true once /admin/my-access has answered for a signed-in user

  function selectors(paths) {
    var out = [];
    for (var i = 0; i < paths.length; i++) {
      var h = "/app" + paths[i];
      out.push('a[href="' + h + '"]', 'a[href^="' + h + '/"]');
    }
    return out;
  }

  function apply() {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    var sel = selectors(hidden);
    if (!sel.length) { el.textContent = ""; return; }
    var li = [];
    for (var i = 0; i < sel.length; i++) li.push("li:has(> " + sel[i] + ")");
    el.textContent = sel.join(",") + "{display:none!important}" + li.join(",") + "{display:none!important}";
  }

  function isHiddenPath() {
    var p = location.pathname.replace(/^\\/app/, "") || "/";
    for (var i = 0; i < hidden.length; i++) {
      if (p === hidden[i] || p.indexOf(hidden[i] + "/") === 0) return true;
    }
    return false;
  }

  function route() {
    var existing = document.getElementById(NOTICE_ID);
    if (!isHiddenPath()) { if (existing) existing.remove(); return; }
    if (existing) return;
    var d = document.createElement("div");
    d.id = NOTICE_ID;
    d.setAttribute("style", "position:fixed;inset:0;z-index:2147483000;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font:16px system-ui,sans-serif;text-align:center;padding:24px");
    d.innerHTML = '<div><h2 style="margin:0 0 8px;font-size:20px">This section isn\\'t available for your account</h2><p style="margin:0 0 16px;color:#555">Ask the site administrator if you need access.</p><a href="/app" style="color:#2E7D32;font-weight:600">Back to the dashboard</a></div>';
    document.body.appendChild(d);
  }

  function refresh() {
    fetch("/admin/my-access", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) { known = false; return; }
        known = true;
        hidden = d.hidden_nav || [];
        apply();
        route();
      })
      .catch(function () {});
  }

  refresh();
  setInterval(refresh, 60000);
  // Not signed in yet (the login is a single-page navigation, so there is no
  // reload): keep asking every 2s until the first answer, so the menu is trimmed
  // within moments of signing in rather than a minute later.
  setInterval(function () { if (!known) refresh(); }, 2000);
  setInterval(function () { apply(); route(); }, 1500);
  window.addEventListener("focus", refresh);
})();
`
