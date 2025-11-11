import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  css: false, // Disable CSS processing in tests
  test: {
    // Default to running all tests (workspace will split into projects)
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],

    // Coverage configuration (applies to all projects)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".next/**",
        "**/*.d.ts",
        "**/*.config.{ts,js}",
        "**/tests/**",
        "prisma/**",
        "components/ui/**", // shadcn/ui components
        ".vscode/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
