import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Treat anything that is not explicitly development/test as production:
// Cloud Run does not set NODE_ENV automatically, and a missing NODE_ENV
// must never silently downgrade to insecure defaults.
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

// Managed Postgres (Neon/prod) requires SSL; a plain local or CI Postgres does
// not. Default SSL on; set DATABASE_SSL=false for a non-SSL Postgres (CI, local).
const DB_SSL = process.env.DATABASE_SSL !== 'false'

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

const modules: Record<string, any>[] = [
  {
    resolve: "./src/modules/homepage",
  },
  {
    resolve: "./src/modules/product-review",
  },
  {
    resolve: "./src/modules/platform-monitor",
  },
]

// S3-compatible file storage (GCS via HMAC interop, or AWS S3). Required on
// Cloud Run — the default local-disk provider is ephemeral there. Local dev
// without these vars keeps writing to ./static.
if (process.env.S3_BUCKET) {
  modules.push({
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/file-s3",
          id: "s3",
          options: {
            file_url: process.env.S3_FILE_URL,
            bucket: process.env.S3_BUCKET,
            region: process.env.S3_REGION,
            endpoint: process.env.S3_ENDPOINT,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
          },
        },
      ],
    },
  })
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  modules.push({
    resolve: "@medusajs/medusa/file",
    options: {
      providers: [
        {
          resolve: "./src/providers/file-cloudinary",
          id: "cloudinary",
          options: {
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            apiSecret: process.env.CLOUDINARY_API_SECRET,
            folderName: "mithra-wholefoods",
            secure: true,
          },
        },
      ],
    },
  })
}

// Redis-backed cache/event-bus/workflow engine. Required as soon as more
// than one backend instance runs (in-memory versions are per-instance).
// Local dev without REDIS_URL keeps the in-memory fakes.
if (process.env.REDIS_URL && !IS_DEV) {
  modules.push(
    {
      resolve: "@medusajs/medusa/cache-redis",
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl: process.env.REDIS_URL },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { url: process.env.REDIS_URL } },
    }
  )
}

// Stripe payments. Registering the payment module with an explicit provider
// list keeps Medusa's built-in system provider (pp_system_default, surfaced
// as COD in the storefront) alongside Stripe. `capture: true` auto-captures
// on authorization so the admin never has to capture manually. Test vs live
// is decided purely by which keys are set (sk_test_* vs sk_live_*).
if (process.env.STRIPE_API_KEY) {
  modules.push({
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@medusajs/payment-stripe",
          id: "stripe",
          options: {
            apiKey: process.env.STRIPE_API_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            capture: true,
          },
        },
      ],
    },
  })
}

// SendGrid email notification provider
if (process.env.SENDGRID_API_KEY) {
  modules.push({
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: "@medusajs/notification-sendgrid",
          id: "sendgrid",
          options: {
            channels: ["email"],
            api_key: process.env.SENDGRID_API_KEY,
            from: process.env.SENDGRID_FROM_EMAIL,
          },
        },
      ],
    },
  })
}

module.exports = defineConfig({
  admin: {
    // Worker instances don't serve the admin UI.
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    // Expose the storefront URL to the admin bundle (live-preview iframe
    // + postMessage target in src/admin/routes/homepage/page.tsx).
    vite: () => ({
      define: {
        "import.meta.env.VITE_STOREFRONT_URL": JSON.stringify(
          process.env.STOREFRONT_URL || "http://localhost:8000"
        ),
        __MAX_UPLOAD_FILE_SIZE__: 5 * 1024 * 1024,
      },
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: DB_SSL
      ? { connection: { ssl: { rejectUnauthorized: true } } }
      : {},
    redisUrl: !IS_DEV ? process.env.REDIS_URL : undefined,
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
  modules,
})
