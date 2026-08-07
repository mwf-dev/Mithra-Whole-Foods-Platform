import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

/**
 * Unit test config — deliberately narrow.
 *
 * This project has no component/integration test setup (no jsdom, no
 * Testing Library, no MSW). Scope is pure-function logic only: the retry /
 * resilience layer, which is safety-critical (a wrong retry decision can
 * duplicate a cart mutation or an order) and was previously verified only by
 * an ad-hoc throwaway script. See docs/OBSERVABILITY_SETUP.md "Known gap".
 *
 * `tsconfigPaths()` resolves the `@lib/*` alias from tsconfig.json so tests
 * can import the real source files unmodified.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/util/resilient-fetch.ts"],
    },
  },
})
