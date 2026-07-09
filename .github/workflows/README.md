# CI/CD & Deployments

This repository uses GitHub Actions for continuous integration (CI) and Railway for continuous deployment (CD).

## Continuous Integration (`ci.yml`)

Runs on every push to `main` and all Pull Requests. It ensures no broken code is merged.
- **Web Job**: Runs `next lint` and `tsc --noEmit` on the storefront.
- **Backend Job**: Spins up a Postgres 16 service, runs the Medusa build to verify compilation, and executes all unit and integration tests.

## Continuous Deployment (Railway + Vercel)

We use platform-native Git integrations for deployment, meaning no deployment secrets need to be stored in GitHub. Deployments will only happen if the `ci.yml` workflow passes (if branch protection is configured).

### 1. Backend (Railway)
1. Go to your [Railway Dashboard](https://railway.app/).
2. Create a new project and select **Deploy from GitHub repo**.
3. Select this repository.
4. Railway will automatically detect the Docker setup using `railway.json`.
5. **CRITICAL**: Go to your Railway service settings and enable **"Wait for CI"**. This prevents Railway from deploying code that fails tests.
6. Under Variables, add your production database credentials (`DATABASE_URL`), `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`, `CLOUDINARY_*`, `SENDGRID_*`, and CORS variables.
7. Under Deployments -> Custom Start Command, ensure the custom deploy command runs migrations first: `npx medusa db:migrate && npm run start`.

### 2. Storefront (Vercel)
1. Import the repository in Vercel.
2. Select the `apps/web` directory as the Root Directory.
3. Configure your environment variables, specifically `NEXT_PUBLIC_MEDUSA_BACKEND_URL` pointing to your deployed Railway backend domain.
4. Vercel automatically respects GitHub branch protection and CI statuses before promoting deployments.

## Pull Requests

When creating a PR, the CI workflow will block merging if tests or types fail. Always ensure you run `npm run test` (for backend) and `npm run build` locally before pushing.
