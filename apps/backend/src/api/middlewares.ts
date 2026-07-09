import { defineMiddlewares } from "@medusajs/medusa"
import rateLimit from "express-rate-limit"

const keyGenerator = (req: any) => {
  const forwarded = req.headers["x-forwarded-for"]
  return typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: "Too many login attempts from this IP, please try again after 15 minutes",
  standardHeaders: true, 
  legacyHeaders: false, 
  keyGenerator,
})

const storeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, // Limit each IP to 150 requests per windowMs
  message: "Too many requests to the store API, please try again later",
  standardHeaders: true, 
  legacyHeaders: false, 
  keyGenerator,
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
