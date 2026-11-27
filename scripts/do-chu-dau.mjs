// Đo thời gian ra chữ đầu khi TẮT và khi BẬT AI Đạo diễn (AC3, Phase 3), trên cùng một server đang chạy.
//
// Chạy: npm run build && npm start   (cửa sổ khác)   →   npm run do:chu-dau
// Biến: BASE_URL (mặc định http://localhost:3000) · DO_CHU_DAU_LAN (số lần mỗi câu, mặc định 10)
//
// Cách đo (cùng câu hỏi, cùng điều kiện):
// - Mỗi vòng, mỗi câu hỏi được gửi 2 lần liền nhau: một lần chỉ gọi /api/chat (TẮT, giống Phase 2),
//   một lần gọi /api/chat và /api/director cùng lúc như trình duyệt làm (BẬT). Thứ tự tắt/bật đảo nhau mỗi vòng
//   để tải của Gemini lúc đo không nghiêng về một phía.
// - Chữ đầu = từ lúc gửi /api/chat tới khi nhận dòng "delta" đầu tiên (đo qua HTTP, gồm cả server).
// - Kết quả ghi eval/do-chu-dau.md.

import { writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ROUNDS = Number(process.env.DO_CHU_DAU_LAN) || 10;
const PAUSE_MS = 1500;

const QUESTIONS = [
  { characterId: "tran-hung-dao", text: "Ngài kể cho tôi nghe trận Bạch Đằng năm 1288." },
  { characterId: "quang-trung", text: "Bệ hạ kể cho thần nghe trận Ngọc Hồi – Đống Đa." },
  { characterId: "nguyen-trai", text: "Bình Ngô đại cáo được viết khi nào và để làm gì?" },
  { characterId: "ngo-quyen", text: "Ngài kể trận Bạch Đằng năm 938 đi." },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timeChat(q) {
  const body = JSON.stringify({ characterId: q.characterId, messages: [{ role: "user", text: q.text }] });
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  if (!res.ok || !res.body) return { ttft: null, total: null, error: `HTTP ${res.status}` };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let ttft = null;
  let done = false;
  while (true) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const ev = JSON.parse(line);
      if (ev.type === "delta" && ttft === null) ttft = performance.now() - t0;
      if (ev.type === "done") done = true;
      if (ev.type === "error") return { ttft, total: null, error: ev.code };
    }
  }
  return { ttft, total: performance.now() - t0, error: done ? null : "INTERRUPTED" };
}

async function timeDirector(q) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/api/director`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: q.characterId, messages: [{ role: "user", text: q.text }], shown: [] }),
    });
    const data = await res.json();
    return { ms: performance.now() - t0, shot: data?.shot?.kind === "image" ? data.shot.mediaId : "none" };
  } catch (e) {
    return { ms: performance.now() - t0, shot: `lỗi: ${e.message}` };
  }
}

async function runOnce(q, mode) {
  if (mode === "tắt") return { mode, ...(await timeChat(q)) };
  const [chat, director] = await Promise.all([timeChat(q), timeDirector(q)]);
  return { mode, ...chat, director };
}

const quantile = (xs, p) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)];
};
const sec = (ms) => (ms === null || ms === undefined ? "–" : `${(ms / 1000).toFixed(2)} s`);

const rows = [];
console.log(`Đo chữ đầu tại ${BASE}: ${QUESTIONS.length} câu × ${ROUNDS} vòng × (tắt + bật)`);
const startedAt = new Date();
for (let round = 1; round <= ROUNDS; round++) {
  for (const q of QUESTIONS) {
    const order = round % 2 === 1 ? ["tắt", "bật"] : ["bật", "tắt"];
    for (const mode of order) {
      const r = await runOnce(q, mode);
      rows.push({ q, round, ...r });
      console.log(
        `[${round}] ${q.characterId.padEnd(14)} ${mode}  chữ đầu ${sec(r.ttft).padStart(7)}${r.error ? `  LỖI ${r.error}` : ""}${r.director ? `  đạo diễn ${sec(r.director.ms)} → ${r.director.shot}` : ""}`,
      );
      await sleep(PAUSE_MS);
    }
  }
}

const ok = (m, q) => rows.filter((r) => r.mode === m && (!q || r.q === q) && !r.error && r.ttft !== null).map((r) => r.ttft);
const lines = [];
lines.push("# Đo thời gian ra chữ đầu: tắt và bật AI Đạo diễn (AC3, Phase 3)");
lines.push("");
lines.push(`- Chạy lúc: ${startedAt.toISOString()} · server: \`${BASE}\` (bản build \`npm run build && npm start\`) · ${ROUNDS} vòng mỗi câu`);
lines.push("- Cách đo: mỗi vòng gửi mỗi câu hai lần liền nhau, một lần TẮT (chỉ gọi /api/chat, như Phase 2) và một lần BẬT (gọi /api/chat cùng lúc với /api/director, như trình duyệt). Thứ tự tắt/bật đảo nhau mỗi vòng. Chữ đầu tính từ lúc gửi /api/chat tới khi nhận dòng delta đầu tiên, đo qua HTTP.");
lines.push("- Số đo TẮT là số đo Phase 2 (cùng câu hỏi, cùng điều kiện). Tham khảo thêm: bảng eval Phase 2 (`eval/ket-qua.md`) đo trong tiến trình, trung vị 1,00–1,16 s.");
lines.push("");
lines.push("| Câu hỏi | Trung vị TẮT | Trung vị BẬT | p90 TẮT | p90 BẬT | Chậm nhất TẮT | Chậm nhất BẬT | Lần lỗi (tắt/bật) |");
lines.push("|---|---|---|---|---|---|---|---|");
for (const q of QUESTIONS) {
  const off = ok("tắt", q);
  const on = ok("bật", q);
  const errs = (m) => rows.filter((r) => r.q === q && r.mode === m && r.error).length;
  lines.push(
    `| ${q.characterId}: ${q.text} | ${sec(quantile(off, 0.5))} | ${sec(quantile(on, 0.5))} | ${sec(quantile(off, 0.9))} | ${sec(quantile(on, 0.9))} | ${sec(quantile(off, 1))} | ${sec(quantile(on, 1))} | ${errs("tắt")}/${errs("bật")} |`,
  );
}
const offAll = ok("tắt");
const onAll = ok("bật");
lines.push(
  `| **Tất cả** | **${sec(quantile(offAll, 0.5))}** | **${sec(quantile(onAll, 0.5))}** | ${sec(quantile(offAll, 0.9))} | ${sec(quantile(onAll, 0.9))} | ${sec(quantile(offAll, 1))} | ${sec(quantile(onAll, 1))} | ${rows.filter((r) => r.mode === "tắt" && r.error).length}/${rows.filter((r) => r.mode === "bật" && r.error).length} |`,
);
const dirs = rows.filter((r) => r.director).map((r) => r.director);
const dirMs = dirs.map((d) => d.ms);
lines.push("");
lines.push(`- Đạo diễn (lượt BẬT): trung vị ${sec(quantile(dirMs, 0.5))}, chậm nhất ${sec(quantile(dirMs, 1))}; có ảnh ${dirs.filter((d) => d.shot !== "none" && !String(d.shot).startsWith("lỗi")).length}/${dirs.length} lượt.`);
const diff = quantile(onAll, 0.5) - quantile(offAll, 0.5);
lines.push(`- Chênh trung vị BẬT − TẮT: ${(diff / 1000).toFixed(2)} s (âm hoặc trong khoảng dao động ±0,15 s nghĩa là không chậm hơn).`);
lines.push("");
lines.push("## Từng lần đo");
lines.push("");
lines.push("| Vòng | Nhân vật | Chế độ | Chữ đầu | Cả lời đáp | Đạo diễn | Lỗi |");
lines.push("|---|---|---|---|---|---|---|");
for (const r of rows) {
  lines.push(`| ${r.round} | ${r.q.characterId} | ${r.mode} | ${sec(r.ttft)} | ${sec(r.total)} | ${r.director ? `${sec(r.director.ms)} → ${r.director.shot}` : "–"} | ${r.error ?? ""} |`);
}
lines.push("");
const out = path.resolve(import.meta.dirname, "..", "eval", "do-chu-dau.md");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`\nTrung vị chữ đầu: TẮT ${sec(quantile(offAll, 0.5))} · BẬT ${sec(quantile(onAll, 0.5))} · chênh ${(diff / 1000).toFixed(2)} s`);
console.log(`Bảng kết quả: ${path.relative(process.cwd(), out)}`);
