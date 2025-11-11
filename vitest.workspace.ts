import { defineWorkspace } from "vitest/config";
import path from "path";

// Set NODE_ENV for PostCSS config
process.env.NODE_ENV = "test";

export default defineWorkspace([
  {
    // Unit tests - fast, mocked dependencies
    esbuild: {
      jsxInject: `import React from 'react'`, // Auto-inject React for JSX
    },
    test: {
      name: "unit",
      environment: "happy-dom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      include: [
        "lib/**/*.test.{ts,tsx}",
        "components/**/*.test.{ts,tsx}",
        "app/**/*.test.{ts,tsx}",
        "middleware.test.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/tests/integration/**",
      ],
      css: false,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  },
  {
    // Integration tests - real Docker services
    test: {
      name: "integration",
      environment: "node",
      globals: true,
      include: ["tests/integration/**/*.test.{ts,tsx}"],
      setupFiles: ["./tests/integration/setup.ts"],
      testTimeout: 60000,
      hookTimeout: 60000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  },
]);
