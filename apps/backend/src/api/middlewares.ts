import { defineMiddlewares } from "@medusajs/medusa"
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
    {
      matcher: "/admin/homepage",
      method: "GET",
      middlewares: [storeLimiter],
    }
  ],
})
