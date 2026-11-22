import { defineConfig } from "vitest/config";
import path from "node:path";

// Cấu hình riêng cho bộ kiểm thử nhập vai (gọi Gemini thật): npm run eval
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["eval/**/*.eval.ts"],
    environment: "node",
    testTimeout: 60 * 60_000,
    // In log tiến độ ngay khi có, không gom lại.
    reporters: ["default"],
    silent: false,
  },
});
