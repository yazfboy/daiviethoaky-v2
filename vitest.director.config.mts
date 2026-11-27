import { defineConfig } from "vitest/config";
import path from "node:path";

// Cấu hình riêng cho bộ kiểm thử AI Đạo diễn (gọi Gemini thật): npm run eval:director
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["eval/dao-dien/**/*.director.ts"],
    environment: "node",
    testTimeout: 30 * 60_000,
    reporters: ["default"],
    silent: false,
  },
});
