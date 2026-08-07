import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"
import { clientIpKey, storeRateLimitKey } from "../utils/client-ip"
import { usageMetrics } from "../utils/usage-metrics"

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
    {
      matcher: "/admin/homepage",
      method: "GET",
      middlewares: [storeLimiter],
    },
    {
      matcher: "/admin/uploads",
      method: "POST",
      bodyParser: { sizeLimit: "10mb" },
    }
  ],
})
