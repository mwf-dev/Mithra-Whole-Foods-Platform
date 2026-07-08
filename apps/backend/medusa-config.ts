import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Treat anything that is not explicitly development/test as production:
// Cloud Run does not set NODE_ENV automatically, and a missing NODE_ENV
// must never silently downgrade to insecure defaults.
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

if (!IS_DEV) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecret') {
    throw new Error('JWT_SECRET must be securely set in production');
  }
  if (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === 'supersecret') {
    throw new Error('COOKIE_SECRET must be securely set in production');
  }
  if (!process.env.STORE_CORS || !process.env.ADMIN_CORS || !process.env.AUTH_CORS) {
    throw new Error('CORS variables must be set in production');
  }
}

module.exports = defineConfig({
  admin: {
    // Expose the storefront URL to the admin bundle (live-preview iframe
    // + postMessage target in src/admin/routes/homepage/page.tsx).
    vite: () => ({
      define: {
        "import.meta.env.VITE_STOREFRONT_URL": JSON.stringify(
          process.env.STOREFRONT_URL || "http://localhost:8000"
        ),
      },
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: { connection: { ssl: { rejectUnauthorized: true } } },
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      // Dev-only fallback; the guard above makes unset secrets fatal outside development/test
      jwtSecret: process.env.JWT_SECRET || (IS_DEV ? "supersecret" : ""),
      cookieSecret: process.env.COOKIE_SECRET || (IS_DEV ? "supersecret" : ""),
    }
  },
  modules: [
    {
      resolve: "./src/modules/homepage",
    },
  ]
})
