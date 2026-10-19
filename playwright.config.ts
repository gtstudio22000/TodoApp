import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "src",
  testMatch: "**/*.e2e.spec.ts",
  use: { baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
