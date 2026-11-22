import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CASES, PROFILE } from "./cases";
import { renderReport, runAll, summarize } from "./harness";

// Chạy: npm run eval
// Lọc (để thử nhanh, ra file ket-qua-loc.md, không ghi đè kết quả chính):
//   EVAL_ONLY=ngo-quyen,quang-trung   chỉ chạy các nhân vật này
//   EVAL_CASES=nq-01,thd-03           chỉ chạy các câu này
//   EVAL_CONCURRENCY=3                số câu chạy song song (mặc định 3)
//   EVAL_JUDGE_MODELS=gemini-3.5-flash,gemini-3.1-flash-lite  model giám khảo (chính, rồi dự phòng)

try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "..", ".env"));
} catch {
  // không có .env: dùng biến môi trường sẵn có
}

const only = process.env.EVAL_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const caseIds = process.env.EVAL_CASES?.split(",").map((s) => s.trim()).filter(Boolean);
const selected = CASES.filter(
  (c) => (!only?.length || only.includes(c.character)) && (!caseIds?.length || caseIds.includes(c.id)),
);
const partial = selected.length !== CASES.length;

describe("Bộ kiểm thử nhập vai", () => {
  it(
    `chạy ${selected.length} câu và đạt ngưỡng`,
    async () => {
      expect(process.env.GEMINI_API_KEYS, "Thiếu GEMINI_API_KEYS trong .env").toBeTruthy();
      expect(selected.length, "Bộ lọc không chọn được câu nào").toBeGreaterThan(0);

      const startedAt = new Date();
      let done = 0;
      const results = await runAll(selected, Number(process.env.EVAL_CONCURRENCY) || 3, (r) => {
        done++;
        const ttft = r.ttftMs === null ? "  –  " : `${(r.ttftMs / 1000).toFixed(2)}s`;
        console.log(`[${String(done).padStart(2)}/${selected.length}] ${r.c.id.padEnd(7)} ${r.pass ? "ĐẠT      " : "KHÔNG ĐẠT"} ${ttft}`);
      });

      const report = renderReport(results, { startedAt, durationMs: Date.now() - startedAt.getTime(), partial });
      const out = path.resolve(import.meta.dirname, partial ? "ket-qua-loc.md" : "ket-qua.md");
      writeFileSync(out, report, "utf8");

      const sums = summarize(results);
      console.log("\nNhân vật         Đạt     Tỉ lệ  Cốt lõi  Chữ đầu (trung vị / chậm nhất)  Kết luận");
      for (const s of sums) {
        console.log(
          `${PROFILE[s.character].name.padEnd(16)} ${`${s.passed}/${s.total}`.padEnd(7)} ${`${Math.round(s.rate * 100)}%`.padEnd(6)} ${`${s.corePassed}/${s.coreTotal}`.padEnd(8)} ${`${((s.ttftMedian ?? 0) / 1000).toFixed(2)}s / ${((s.ttftMax ?? 0) / 1000).toFixed(2)}s`.padEnd(32)} ${s.ok ? "ĐẠT" : "CHƯA ĐẠT"}`,
        );
      }
      console.log(`\nBảng kết quả: ${path.relative(process.cwd(), out)}`);

      const failing = sums.filter((s) => !s.ok).map((s) => PROFILE[s.character].name);
      expect(failing, `Nhân vật chưa đạt ngưỡng (≥90%, cốt lõi 100%): ${failing.join(", ")}`).toEqual([]);
    },
    60 * 60_000,
  );
});
