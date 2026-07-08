import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

if (process.env.NODE_ENV === 'production') {
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
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: { connection: { ssl: { rejectUnauthorized: true } } },
    workerMode: (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") || "shared",
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "./src/modules/homepage",
    },
  ]
})
