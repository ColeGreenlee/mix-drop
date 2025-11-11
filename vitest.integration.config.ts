import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "lib/**",  // Exclude lib tests from integration
      "components/**",  // Exclude component tests from integration
      "app/**",  // Exclude app tests from integration
      "middleware.test.ts",  // Exclude middleware from integration
    ],
    setupFiles: ["./tests/integration/setup.ts"],
    testTimeout: 60000, // Integration tests may take longer
    hookTimeout: 60000, // Docker container startup
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
