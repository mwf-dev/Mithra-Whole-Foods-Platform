# Internal Developer Portal (IDP) / Admin Dashboard Plan

## 🎯 Goal
Create a centralized internal dashboard for the development team/agency to monitor the entire Mithra Whole Foods infrastructure (Vercel, Railway, Neon, Cloudinary, etc.) after handing off the individual service accounts to the client.

This ensures we can proactively monitor health, API limits, and credit consumption without needing to log in to 4-5 different platforms, while keeping the legal/billing liability under the client's accounts.

## 🏗️ Architecture & Stack
- **Framework:** Next.js (App Router) - can be a separate route in the existing Admin panel or a standalone internal tool.
- **Data Fetching:** Cron jobs (e.g., node-cron or Trigger.dev/Inngest) running every 12-24 hours.
- **Storage:** A small dedicated table in our Neon DB to store daily snapshots of usage metrics.
- **Alerting:** Resend (Email) or Slack Webhooks for budget/limit alerts.

## 🔌 API Integrations Required

### 1. Vercel (Frontend & Edge)
- **Endpoint:** `GET /v8/projects/{id}/usage` or Vercel GraphQL API.
- **Metrics to Track:**
  - Bandwidth usage (GB)
  - Edge/Serverless function execution hours
  - Image optimization limits
- **Authentication:** Read-only Bearer Token from the client's Vercel account.

### 2. Railway (Backend & Redis/Workers)
- **Endpoint:** Railway Public GraphQL API.
- **Metrics to Track:**
  - RAM & CPU usage per service (Medusa Core, Redis, Worker)
  - Estimated cost for the current billing cycle
  - Project deployment health status

### 3. Neon (PostgreSQL Database)
- **Endpoint:** Neon API (e.g., `GET /projects/{project_id}/consumption`).
- **Metrics to Track:**
  - Active Compute Time (hrs)
  - Storage Size (GB)
  - Written Data limits

### 4. Cloudinary (Media Assets)
- **Endpoint:** Cloudinary Admin API (`/usage` endpoint).
- **Metrics to Track:**
  - Bandwidth
  - Storage usage
  - Transformation limits

## 🧮 Prediction & Alerting Logic (The "Run Rate")
To provide intelligent alerts before limits are reached:
1. Fetch usage data daily.
2. Calculate the **Run Rate**: `(Current Usage / Days Passed in Billing Cycle) = Average Daily Usage`.
3. Predict end-of-month usage: `Average Daily Usage * Total Days in Month`.
4. **Trigger Alert** if predicted usage exceeds 90% of the free tier or custom set limit.

## 🚀 Phases of Implementation
- [ ] **Phase 1:** Generate Read-Only API keys from the client's new Vercel, Railway, Neon, and Cloudinary accounts.
      *(Cloudinary + Stripe already work from existing env vars. Railway, Neon,
      Vercel and SendGrid still need tokens — this is a client-account task.)*
- [x] **Phase 2:** Backend cron job fetching and storing daily usage snapshots.
- [x] **Phase 3:** UI dashboard displaying the metrics visually.
- [x] **Phase 4:** Linear prediction math + Email/Slack alerts.

**Built 2026-08-08 — see [`docs/INTERNAL_DEVELOPER_PORTAL.md`](docs/INTERNAL_DEVELOPER_PORTAL.md)**
for architecture, operating instructions and known limitations. Admin →
**Infrastructure**.

Two corrections to this plan, found during implementation:

1. **`GET /v8/projects/{id}/usage` does not exist.** Vercel has no stable,
   documented, plan-independent usage endpoint. The adapter reports deployment
   health from the stable public API and marks bandwidth/function hours
   unavailable *with the reason* rather than showing a misleading zero.
2. **Every-12-hours was more than needed.** Once daily is right: every metric
   moves on the scale of days, and each run costs ~8 calls against rate-limited
   vendor tokens. Operational "is it down right now" alerting is a separate
   concern — that's the Verification tab / an uptime probe, not this job.

Scope was also widened beyond the four platforms, because the same screen is the
natural home for it: Stripe and SendGrid (the two paid services whose *silent*
misconfiguration costs the most), plus live checks of runtime config flags and
store readiness — regions, shipping options, payment providers, publishable
keys. A healthy backend with no shipping option is a store that cannot take an
order, and nothing else was surfacing that.

---
*Note: This is an internal tool for developer observability and proactive client management. It is NOT customer-facing.*
