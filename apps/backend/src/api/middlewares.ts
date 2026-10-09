import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"
import { clientIpKey, storeRateLimitKey } from "../utils/client-ip"
import { usageMetrics } from "../utils/usage-metrics"
import { hideUnpublishedInCategories } from "./hide-unpublished"

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
})

/**
 * Store API limiter.
 *
 * Keyed by `storeRateLimitKey`, which buckets per *shopper* when the storefront
 * forwards an authenticated client IP, and falls back to the request IP
 * otherwise. Read that function's comment before changing anything here —
 * with plain IP keying this limit is a site-wide ceiling rather than a
 * per-abuser control, and raising the number is not the fix.
 */
/**
 * /tracking-demo/* is deliberately public (no session, no publishable key) —
 * it's a standalone page for showing the ship→deliver pipeline to the client,
 * see src/api/tracking-demo/. Being public means it's also guessable/
 * enumerable (order numbers are small sequential ints), so this limiter is
 * the only thing standing between it and someone scripting through every
 * order. Tighter than storeLimiter on purpose — a human clicking through a
 * demo never needs more than a few requests a minute.
 */
const trackingDemoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
})

/**
 * /content-studio/* is the client's content intake — public by design (the
 * client has a link, not an admin login), see src/api/content-studio/route.ts.
 * Autosave means a working session is genuinely chatty, so this is looser than
 * the tracking-demo limiter, but it is the only thing rate-limiting attempts
 * against CONTENT_STUDIO_TOKEN and the only ceiling on the upload route.
 */
const contentStudioLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 240,
  message: "Too many requests, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
})

/**
 * Guest order lookup (POST /store/order-lookup). Two limits: a general
 * per-client one, and a tight per-order-number one so nobody can grind through
 * phone numbers against a single order. Failed and successful attempts both
 * count — a real customer needs one or two tries, not eight.
 */
const orderLookupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: "Too many lookups, please try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: storeRateLimitKey,
})
const orderLookupPerOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { message: "Too many attempts for this order. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) =>
    `order:${String(req.body?.order ?? "").trim().replace(/^#/, "").toUpperCase().slice(0, 40)}`,
})

const trackingDemoEnabled = (req: any, res: any, next: any) =>
  process.env.TRACKING_DEMO_ENABLED === "true"
    ? next()
    : res.status(404).json({ message: "Not found" })

const storeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150,
  message: "Too many requests to the store API, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: storeRateLimitKey,
  // The uptime probe must never be rate limited — a limiter-induced 429 on the
  // health check would page on-call for a healthy service.
  skip: (req: any) => req.path === "/health",
})

export default defineMiddlewares({
  routes: [
    // Must stay FIRST so it wraps every other middleware in the chain —
    // including the rate limiters, whose 429s are themselves a signal worth
    // counting. Purely observational: no I/O, no per-request allocation beyond
    // a closure. See `src/lib/request-metrics.ts`.
    {
      matcher: "/*",
      middlewares: [usageMetrics],
    },
    {
      matcher: "/auth/*",
      middlewares: [authLimiter],
    },
    {
      matcher: "/store/*",
      middlewares: [storeLimiter],
    },
    // Writing a review requires an account; reading them is public, so this is
    // scoped to POST. Without it the route would accept anonymous writes.
    {
      matcher: "/store/products/*/reviews",
      method: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    // An invoice carries the shopper's name, full shipping address and every
    // line they bought. Without this the route resolved an order straight from
    // the id in the URL, so anyone could read anyone's — checkout already
    // requires an account, so there is no guest flow to preserve here.
    // The route itself still has to confirm the caller *owns* the order;
    // authentication alone only proves they own *an* account.
    {
      matcher: "/store/orders/*/invoice",
      method: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    // Medusa's category relation expansion returns draft (hidden) products to
    // anyone with the public key — see ./hide-unpublished.ts.
    {
      matcher: "/store/product-categories",
      method: ["GET"],
      middlewares: [hideUnpublishedInCategories],
    },
    {
      matcher: "/store/product-categories/*",
      method: ["GET"],
      middlewares: [hideUnpublishedInCategories],
    },
    {
      matcher: "/store/order-lookup",
      method: ["POST"],
      middlewares: [orderLookupLimiter, orderLookupPerOrderLimiter],
    },
    {
      matcher: "/admin/homepage",
      method: "GET",
      middlewares: [storeLimiter],
    },
    {
      matcher: "/admin/uploads",
      method: "POST",
      bodyParser: { sizeLimit: "10mb" },
    },
    // The FedEx webhook's HMAC is computed over the exact bytes FedEx sent.
    // Without the raw body the route can only hash a re-serialized `req.body`,
    // whose key order and whitespace need not match — so genuine payloads fail
    // verification. The route fails closed if this is ever removed.
    {
      matcher: "/webhooks/fedex",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/webhooks/easyship",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/content-studio",
      middlewares: [contentStudioLimiter],
    },
    {
      matcher: "/content-studio/*",
      middlewares: [contentStudioLimiter],
    },
    // Base64 inflates a file by ~33%, so a 10 MB upload (the cap enforced in
    // src/api/content-studio/uploads/route.ts) arrives as ~13.4 MB of JSON.
    {
      matcher: "/content-studio/uploads",
      method: ["POST"],
      bodyParser: { sizeLimit: "15mb" },
    },
    // The demo's ship/deliver buttons run the real order workflows, so it is
    // off unless TRACKING_DEMO_ENABLED=true AND the caller holds an admin
    // session. Same-origin fetches from the page carry that session cookie.
    {
      matcher: "/tracking-demo",
      middlewares: [trackingDemoEnabled, authenticate("user", ["session", "bearer"]), trackingDemoLimiter],
    },
    {
      matcher: "/tracking-demo/*",
      middlewares: [trackingDemoEnabled, authenticate("user", ["session", "bearer"]), trackingDemoLimiter],
    },
  ],
})
