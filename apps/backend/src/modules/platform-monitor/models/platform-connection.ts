import { model } from "@medusajs/framework/utils"

/**
 * One configured link to an external platform we pay for (Vercel, Railway,
 * Neon, Cloudinary, Stripe, SendGrid…).
 *
 * Credentials live here rather than in env vars on purpose: the whole point of
 * this portal is that the *client* owns the service accounts, so read-only
 * tokens get rotated by whoever holds the account and must be replaceable from
 * the admin UI without a redeploy. They are encrypted at rest
 * (`src/lib/platform-monitor/crypto.ts`) and never leave the backend — every
 * API response returns a masked preview only.
 *
 * `settings` holds the non-secret scoping a provider needs (Vercel project id,
 * Railway project id, Neon project id…). It is returned to the UI in the clear;
 * do not put secrets in it.
 *
 * `last_status` is the cached result of the most recent connectivity check so
 * the dashboard can render instantly without fanning out to five vendors on
 * every page load.
 */
export const PlatformConnection = model
  .define("platform_connection", {
    id: model.id().primaryKey(),
    /** Provider id from the registry in `src/lib/platform-monitor/providers`. */
    provider: model.text(),
    /** Human label, so two Railway projects can be told apart. */
    label: model.text(),
    /** AES-256-GCM ciphertext of a JSON credential bag. Never returned raw. */
    credentials_encrypted: model.text().nullable(),
    /** Non-secret provider scoping (project ids, team ids, base URLs). */
    settings: model.json().default({}),
    enabled: model.boolean().default(true),
    /** Result of the last `test()` — "ok" | "error" | "unconfigured". */
    last_status: model.text().default("unconfigured"),
    last_status_detail: model.text().nullable(),
    last_checked_at: model.dateTime().nullable(),
    /** Last successful usage collection, so a stale dashboard is obvious. */
    last_collected_at: model.dateTime().nullable(),
  })
  .indexes([
    // One connection per provider keeps the dashboard unambiguous and makes
    // upsert-by-provider (how the UI saves) a single query.
    { on: ["provider"], unique: true },
  ])
