import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"
import { clientIpKey } from "../utils/client-ip"

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
})

const storeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // Limit each IP to 150 requests per windowMs
  message: "Too many requests to the store API, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientIpKey,
})

export default defineMiddlewares({
  routes: [
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
