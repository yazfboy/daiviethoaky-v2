import { writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCharacter } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import { getImage, getTopic, IMAGES } from "@/lib/media/catalog";
import { imageUrl, STANDARD_WIDTHS } from "@/lib/media/urls";
import { decideShot, getDirectorFallbackModel, getDirectorModel, type DirectorOutcome } from "@/lib/server/director";
import { DIRECTOR_CASES, type DirectorCase } from "./cases";

// Bộ kiểm thử AI Đạo diễn: npm run eval:director → eval/dao-dien/ket-qua.md
// Chạy đúng đường đi của POST /api/director (decideShot), gọi Gemini thật.
// Lọc để thử nhanh (ghi ket-qua-loc.md, không ghi đè kết quả chính):
//   DIRECTOR_EVAL_CASES=d-nq-01,d-thd-01   DIRECTOR_EVAL_ONLY=ngo-quyen
//   DIRECTOR_EVAL_SKIP_LINKS=1             bỏ bước kiểm link ảnh

try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "..", "..", ".env"));
} catch {
  // không có .env: dùng biến môi trường sẵn có
}

type Verdict = "ĐÚNG" | "BỎ LỠ" | "SAI" | "LỖI HẠ TẦNG";

interface CaseResult {
  c: DirectorCase;
  outcome: DirectorOutcome;
  got: string; // mã chủ đề hoặc "none"
  verdict: Verdict;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function judge(c: DirectorCase, o: DirectorOutcome): Verdict {
  if (o.source === "error") return "LỖI HẠ TẦNG";
  const got = o.shot.kind === "image" ? o.shot.topicId : "none";
  if (got === c.expect || c.accept?.includes(got)) return "ĐÚNG";
  if (got === "none") return "BỎ LỠ";
  return "SAI";
}

async function runCase(c: DirectorCase): Promise<CaseResult> {
  const messages: ChatTurn[] = [...(c.history ?? []), { role: "user", text: c.question }];
  const outcome = await decideShot({ characterId: c.character, messages, shown: [], enabled: true });
  const got = outcome.shot.kind === "image" ? outcome.shot.topicId : "none";
  return { c, outcome, got, verdict: judge(c, outcome) };
}

async function runAll(cases: DirectorCase[], concurrency: number, log: (s: string) => void): Promise<CaseResult[]> {
  const results: CaseResult[] = new Array(cases.length);
  const pass = async (indexes: number[], parallel: number) => {
    let next = 0;
    const worker = async () => {
      while (next < indexes.length) {
        const i = indexes[next++];
        results[i] = await runCase(cases[i]);
        const r = results[i];
        log(`${r.c.id.padEnd(9)} ${r.verdict.padEnd(11)} ${r.got.padEnd(24)} ${(r.outcome.ms / 1000).toFixed(2)}s  ${r.outcome.reason}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(parallel, indexes.length) }, worker));
  };
  await pass(cases.map((_, i) => i), concurrency);
  // Lỗi hạ tầng (hết hạn mức theo phút, mạng) không nói gì về chất lượng quyết định: chờ rồi chạy lại 2 lượt.
  for (let round = 1; round <= 2; round++) {
    const failed = results.flatMap((r, i) => (r.verdict === "LỖI HẠ TẦNG" ? [i] : []));
    if (failed.length === 0) break;
    log(`\n${failed.length} câu lỗi hạ tầng, chờ 65 giây rồi chạy lại (lượt ${round}/2)...`);
    await sleep(65_000);
    await pass(failed, 1);
  }
  return results;
}

// ───────────── Kiểm link ảnh trong kho ─────────────

interface LinkResult {
  id: string;
  checks: { width: number; url: string; status: number | string }[];
}

/** HEAD từng URL ảnh mà app thật sự dùng (các cỡ chuẩn), tuần tự, chậm rãi theo chính sách bot của Wikimedia. */
async function checkLinks(log: (s: string) => void): Promise<LinkResult[]> {
  const UA = "DaiVietHoaKy-linkcheck/0.3 (educational prototype; HEAD only)";
  const out: LinkResult[] = [];
  for (const img of IMAGES) {
    const seen = new Set<string>();
    const checks: LinkResult["checks"] = [];
    for (const w of STANDARD_WIDTHS) {
      const url = imageUrl(img, w);
      if (seen.has(url)) continue;
      seen.add(url);
      let status: number | string = "?";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
          status = res.status;
          if (res.status !== 429) break;
        } catch (err) {
          status = (err as Error).message.slice(0, 40);
        }
        await sleep(2_000);
      }
      checks.push({ width: Math.min(w, img.width), url, status });
      await sleep(250);
    }
    out.push({ id: img.id, checks });
    if (checks.some((c) => c.status !== 200)) log(`  link lỗi: ${img.id} ${checks.map((c) => c.status).join(" ")}`);
  }
  return out;
}

// ───────────── Báo cáo ─────────────

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
const pct = (a: number, b: number) => (b === 0 ? "–" : `${Math.round((a / b) * 100)}%`);

function overall(results: CaseResult[]): { correct: number; wrong: number; infra: number; verdict: string } {
  const correct = results.filter((r) => r.verdict === "ĐÚNG").length;
  const wrong = results.filter((r) => r.verdict === "SAI").length;
  const infra = results.filter((r) => r.verdict === "LỖI HẠ TẦNG").length;
  const okIgnoringInfra = (correct + infra) / results.length >= 0.8 && wrong === 0;
  const ok = correct / results.length >= 0.8 && wrong === 0;
  return { correct, wrong, infra, verdict: ok ? "ĐẠT" : okIgnoringInfra && infra > 0 ? "KHÔNG KẾT LUẬN ĐƯỢC" : "CHƯA ĐẠT" };
}

function renderReport(results: CaseResult[], links: LinkResult[] | null, meta: { startedAt: Date; ms: number; partial: boolean }): string {
  const o = overall(results);
  const lines: string[] = [];
  lines.push("# Kết quả bộ kiểm thử AI Đạo diễn");
  lines.push("");
  lines.push(`- Chạy lúc: ${meta.startedAt.toISOString()} · thời gian chạy: ${Math.round(meta.ms / 1000)} s${meta.partial ? " · **CHẠY MỘT PHẦN (có lọc)**" : ""}`);
  lines.push(`- Model đạo diễn: chính \`${getDirectorModel()}\`, dự phòng \`${getDirectorFallbackModel() ?? "không"}\` (số lần dùng dự phòng: ${results.filter((r) => r.outcome.model && r.outcome.model !== getDirectorModel()).length}) · mức suy nghĩ: \`${process.env.DIRECTOR_THINKING_LEVEL ?? "minimal"}\` · nhiệt độ 0`);
  lines.push("- Chấm: ĐÚNG (khớp kỳ vọng hoặc kết quả chấp nhận được) · BỎ LỠ (lẽ ra có ảnh mà không có) · SAI (ảnh khác chủ đề, hoặc có ảnh ở câu kỳ vọng không ảnh) · LỖI HẠ TẦNG (gọi AI thất bại sau 2 lượt chạy lại).");
  lines.push("- Ngưỡng: ĐÚNG ≥ 80% và SAI = 0. Ảnh của mỗi chủ đề lấy từ kho đã duyệt nên đúng chủ đề thì đúng thời kỳ (test `npm test` soát kho).");
  lines.push(`- **Kết luận: ${o.verdict}** · ĐÚNG ${o.correct}/${results.length} (${pct(o.correct, results.length)}) · SAI ${o.wrong} · BỎ LỠ ${results.filter((r) => r.verdict === "BỎ LỠ").length} · LỖI HẠ TẦNG ${o.infra}`);
  lines.push("");
  lines.push("## Theo nhân vật");
  lines.push("");
  lines.push("| Nhân vật | Số câu | ĐÚNG | BỎ LỠ | SAI | Lỗi hạ tầng | Thời gian trung vị | Chậm nhất |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const id of [...new Set(results.map((r) => r.c.character))]) {
    const rs = results.filter((r) => r.c.character === id);
    const ai = rs.filter((r) => r.outcome.source === "ai").map((r) => r.outcome.ms).sort((a, b) => a - b);
    const med = ai.length ? `${(ai[Math.floor((ai.length - 1) / 2)] / 1000).toFixed(2)} s` : "–";
    const max = ai.length ? `${(ai[ai.length - 1] / 1000).toFixed(2)} s` : "–";
    const n = (v: Verdict) => rs.filter((r) => r.verdict === v).length;
    lines.push(`| ${getCharacter(id)?.name ?? id} | ${rs.length} | ${n("ĐÚNG")} | ${n("BỎ LỠ")} | ${n("SAI")} | ${n("LỖI HẠ TẦNG")} | ${med} | ${max} |`);
  }
  lines.push("");
  lines.push("_Thời gian: từ lúc gọi tới khi có quyết định (chỉ tính các câu có gọi AI; câu chào/cảm ơn được lọc sẵn, gần 0 s)._");
  lines.push("");
  lines.push("## Chi tiết từng câu");
  lines.push("");
  lines.push("| Mã | Nhân vật | Câu hỏi | Kỳ vọng | Kết quả | Ảnh sẽ hiện | Chấm | Lý do của đạo diễn | Thời gian |");
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    const expectText = r.c.expect === "none" ? "không ảnh" : `có ảnh, ${r.c.expect}`;
    const accept = r.c.accept?.length ? ` (chấp nhận: ${r.c.accept.map((a) => (a === "none" ? "không ảnh" : a)).join(", ")})` : "";
    const img = r.outcome.shot.kind === "image" ? getImage(r.outcome.shot.mediaId) : undefined;
    const q = (r.c.history?.length ? "(nối tiếp) " : "") + r.c.question;
    lines.push(
      `| ${r.c.id} | ${getCharacter(r.c.character)?.name} | ${cell(q)} | ${expectText}${accept} | ${r.got === "none" ? "không ảnh" : r.got} | ${img ? cell(`${img.id}: ${img.caption}`) : "–"} | ${r.verdict === "ĐÚNG" ? "ĐÚNG" : `**${r.verdict}**`} | ${cell(r.outcome.reason + (r.outcome.error ? ` (${r.outcome.error})` : ""))} | ${(r.outcome.ms / 1000).toFixed(2)} s${r.outcome.model && r.outcome.model !== getDirectorModel() ? " (dự phòng)" : ""} |`,
    );
  }
  if (links) {
    const bad = links.filter((l) => l.checks.some((c) => c.status !== 200));
    lines.push("");
    lines.push("## Kiểm link ảnh trong kho");
    lines.push("");
    lines.push(`- ${links.length} ảnh, ${links.reduce((n, l) => n + l.checks.length, 0)} URL (các cỡ app thật sự dùng: 500, 960, 1280 px hoặc file gốc nếu ảnh nhỏ hơn). **${bad.length === 0 ? "Tất cả trả 200" : `${bad.length} ảnh có URL lỗi`}**.`);
    lines.push("");
    lines.push("| Ảnh | Chủ đề | Kết quả theo cỡ |");
    lines.push("|---|---|---|");
    for (const l of links) {
      const img = getImage(l.id);
      lines.push(`| ${l.id} | ${img?.topic} (${getTopic(img?.topic ?? "")?.year}) | ${l.checks.map((c) => `${c.width}px: ${c.status}`).join(" · ")} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

// ───────────── Chạy ─────────────

const only = process.env.DIRECTOR_EVAL_ONLY?.split(",").map((s) => s.trim()).filter(Boolean);
const ids = process.env.DIRECTOR_EVAL_CASES?.split(",").map((s) => s.trim()).filter(Boolean);
const selected = DIRECTOR_CASES.filter(
  (c) => (!only?.length || only.includes(c.character)) && (!ids?.length || ids.includes(c.id)),
);
const partial = selected.length !== DIRECTOR_CASES.length;

describe("Bộ kiểm thử AI Đạo diễn", () => {
  it(
    `chạy ${selected.length} câu và đạt ngưỡng`,
    async () => {
      expect(process.env.GEMINI_API_KEYS, "Thiếu GEMINI_API_KEYS trong .env").toBeTruthy();
      expect(selected.length, "Bộ lọc không chọn được câu nào").toBeGreaterThan(0);
      const startedAt = new Date();
      const log = (s: string) => console.log(s);

      const links = process.env.DIRECTOR_EVAL_SKIP_LINKS ? null : (log("Kiểm link ảnh trong kho..."), await checkLinks(log));
      log(`\nChạy ${selected.length} câu với model ${getDirectorModel()}...`);
      const results = await runAll(selected, Number(process.env.DIRECTOR_EVAL_CONCURRENCY) || 3, log);

      const report = renderReport(results, links, { startedAt, ms: Date.now() - startedAt.getTime(), partial });
      const out = path.resolve(import.meta.dirname, partial ? "ket-qua-loc.md" : "ket-qua.md");
      writeFileSync(out, report, "utf8");

      const o = overall(results);
      log(`\nĐÚNG ${o.correct}/${results.length} (${pct(o.correct, results.length)}) · SAI ${o.wrong} · lỗi hạ tầng ${o.infra} → ${o.verdict}`);
      log(`Bảng kết quả: ${path.relative(process.cwd(), out)}`);
      if (links) {
        const bad = links.filter((l) => l.checks.some((c) => c.status !== 200));
        log(bad.length ? `Cảnh báo: ${bad.length} ảnh có link lỗi (xem bảng).` : "Link ảnh: tất cả trả 200.");
      }
      expect(o.verdict, `Đạo diễn chưa đạt: ĐÚNG ${o.correct}/${results.length}, SAI ${o.wrong}, lỗi hạ tầng ${o.infra}`).toBe("ĐẠT");
    },
    30 * 60_000,
  );
});
