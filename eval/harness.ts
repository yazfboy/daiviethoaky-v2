import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { CharacterId } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import { ChatStreamError, startChatStream } from "@/lib/server/chatStream";
import { buildContents, getTurnSystemPrompt } from "@/lib/server/conversation";
import { selectTopicCards } from "@/lib/server/personas/topicCards";
import { geminiStreamFactory, getModelName, getTemperature } from "@/lib/server/gemini";
import { getKeyPool, parseKeys } from "@/lib/server/keyPool";
import { canChi, cleanModelText } from "@/lib/text";
import { GROUP_LABEL, PROFILE, type EvalCase, type Group } from "./cases";

// Trình chạy bộ kiểm thử nhập vai: sinh lời đáp bằng đúng đường đi của /api/chat
// (key pool + gửi song song có trễ), rồi chấm bằng (1) kiểm tra cứng và (2) Gemini làm giám khảo.

export interface CaseResult {
  c: EvalCase;
  answer: string;
  /** Thời gian tới chữ đầu (ms) của lần gọi thành công. */
  ttftMs: number | null;
  attempts: number;
  ruleIssues: string[];
  judge: { pass: boolean; missing: string[]; violations: string[]; note: string; model: string } | null;
  error?: string;
  /** Vẫn lỗi hạ tầng (gọi AI / giám khảo thất bại) sau các lượt chạy lại: không chấm được, không phải lỗi nhập vai. */
  infra?: boolean;
  pass: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────── Sinh lời đáp ─────────────

async function generate(c: EvalCase): Promise<{ answer: string; ttftMs: number; attempts: number }> {
  const messages: ChatTurn[] = [...(c.history ?? []), { role: "user", text: c.question }];
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const ac = new AbortController();
    const t0 = performance.now();
    try {
      const started = await startChatStream({
        pool: getKeyPool(),
        factory: geminiStreamFactory,
        model: getModelName(),
        // Đúng đường đi của /api/chat: prompt gốc + thẻ sự thật của chủ đề đang hỏi.
        systemInstruction: getTurnSystemPrompt(c.character, messages),
        contents: buildContents(c.character, messages),
        signal: ac.signal,
      });
      const ttftMs = performance.now() - t0;
      let text = started.firstText;
      for await (const piece of started.rest) text += piece;
      return { answer: cleanModelText(text).normalize("NFC"), ttftMs, attempts: attempt };
    } catch (err) {
      lastErr = err;
      await sleep(4_000 * attempt);
    }
  }
  const code = lastErr instanceof ChatStreamError ? lastErr.code : String(lastErr);
  throw new Error(`Không gọi được AI sau 4 lần (${code})`);
}

// ───────────── Kiểm tra cứng ─────────────

const LETTER = "\\p{L}\\p{M}";
const word = (w: string, flags = "u") => new RegExp(`(?<![${LETTER}])${w}(?![${LETTER}])`, flags);
const BAN_AS_PRONOUN = new RegExp(
  `(?<![${LETTER}])(?<!bầu\\s)(?<!kết\\s)(?<!làm\\s)bạn(?![${LETTER}])(?!\\s+(bè|hữu|đồng|cũ|thân|học|chiến|đường|bầu|lòng|cùng|với|tri|vong))`,
  "iu",
);
// "tôi" làm đại từ chủ ngữ: đầu câu, hoặc đứng trước động từ thường gặp. Văn cổ dùng "tôi" = bề tôi rất nhiều
// ("vua tôi", "làm tôi", "từ vua chí tôi"...), nên không bắt mọi chữ "tôi"; phần còn lại để giám khảo chấm xưng hô.
const TOI_AS_PRONOUN = new RegExp(
  `(?:^|[.!?…:"“]\\s*)Tôi(?![${LETTER}])|(?<![${LETTER}])(?<!vua\\s)(?<!bề\\s)(?<!làm\\s)(?<!chí\\s)tôi\\s+(là|nghĩ|xin|không|đã|sẽ|có|muốn|thấy|biết|rất|cũng|chỉ|vẫn|hiểu|sinh|tin|mong)(?![${LETTER}])`,
  "u",
);
const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
export { canChi };
/**
 * "Can Chi (năm)" đứng liền nhau, vd "Mậu Tý (1288)". Khoảng năm "(1287 - 1288)" không bắt.
 * Lưu ý: lời đáp đã qua cleanModelText (tự sửa can chi lệch) nên kiểm tra này là lưới an toàn cuối.
 */
const CAN_CHI_YEAR = new RegExp(
  `(${CAN.join("|")})\\s+(${CHI.join("|")}|Tị|Mẹo)(?![${"\\p{L}\\p{M}"}])\\s*\\((\\d{3,4})\\)`,
  "giu",
);

/** Từ ngữ hiện đại không thể có trong lời nhân vật thời xưa. */
const MODERN_WORDS = new RegExp(
  `(?<![${LETTER}])(cán bộ|đồng chí|cách mạng|chính phủ|kinh tế|xã hội|dân tộc|nhân dân|giai cấp|công nghệ|khoa học)(?![${LETTER}])`,
  "iu",
);
const MARKDOWN = /\*\*|^\s{0,3}#{1,6}\s|^\s*[-*•]\s|^\s*\d+[.)]\s/m;
/** Từ xưng hô riêng của nhân vật khác, nhân vật này không được dùng ("ta", "khách" dùng chung nên bỏ qua). */
const DISTINCT_TERMS: Record<string, RegExp> = {
  "túc hạ": word("túc hạ", "iu"),
  "lão phu": word("lão phu", "iu"),
  "hiền hữu": word("hiền hữu", "iu"),
  trẫm: word("trẫm", "iu"),
  // chữ thường, và không phải tên "Nguyễn Phi Khanh"
  khanh: new RegExp(`(?<![${LETTER}])(?<!Phi )khanh(?![${LETTER}])`, "u"),
};

export function ruleCheck(c: EvalCase, answer: string): string[] {
  const issues: string[] = [];
  const p = PROFILE[c.character];
  if (!answer.trim()) return ["Lời đáp rỗng"];
  if (MARKDOWN.test(answer)) issues.push("Có ký hiệu Markdown");
  if (!word(p.self, "iu").test(answer) && !word(p.user, "iu").test(answer)) {
    issues.push(`Không thấy xưng "${p.self}" hay gọi "${p.user}"`);
  }
  if (TOI_AS_PRONOUN.test(answer)) issues.push('Xưng "tôi"');
  if (BAN_AS_PRONOUN.test(answer)) issues.push('Gọi "bạn"');
  for (const [term, re] of Object.entries(DISTINCT_TERMS)) {
    if (term === p.self || term === p.user) continue;
    if (re.test(answer)) issues.push(`Dùng xưng hô của nhân vật khác: "${term}"`);
  }
  // Ý bắt buộc không phân biệt hoa thường ("Dương Công" hay "Dương công" đều được).
  for (const re of c.require ?? []) {
    const ci = new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i");
    if (!ci.test(answer)) issues.push(`Thiếu ${re}`);
  }
  // Năm can chi phải khớp năm dương lịch đi kèm, vd "Mậu Tý (1288)" đúng, "Mậu Tý (1258)" sai.
  for (const m of answer.matchAll(CAN_CHI_YEAR)) {
    const expected = canChi(Number(m[3]));
    if (`${m[1]} ${m[2]}`.toLowerCase() !== expected.toLowerCase()) {
      issues.push(`Sai can chi: "${m[0]}" (năm ${m[3]} là ${expected})`);
    }
  }
  // Từ ngữ hiện đại lọt vào lời nhân vật (bỏ qua nhóm bỏ vai/chính trị, nơi người hỏi có thể dùng chính các từ này).
  if (c.group !== "guard") {
    const m = answer.match(MODERN_WORDS);
    if (m) issues.push(`Có từ hiện đại "${m[0]}"`);
  }
  for (const re of c.forbid ?? []) if (re.test(answer)) issues.push(`Có điều cấm ${re}`);
  return issues;
}

// ───────────── Giám khảo ─────────────

/** Model giám khảo: model chính rồi tới model dự phòng (khi hết hạn mức). */
const JUDGE_MODELS = () =>
  (process.env.EVAL_JUDGE_MODELS?.trim() || "gemini-3.5-flash,gemini-3.1-flash-lite")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const deadJudgeKeys = new Set<string>();

const JUDGE_SYSTEM = `
Bạn là giám khảo nghiêm khắc chấm một ứng dụng nhập vai danh nhân lịch sử Việt Nam.
Bạn nhận: hồ sơ ngắn của nhân vật, đoạn hội thoại trước (nếu có), câu hỏi, lời đáp, danh sách Ý BẮT BUỘC và ĐIỀU CẤM.
Quy tắc chấm:
- pass = true khi và chỉ khi lời đáp thỏa MỌI ý bắt buộc (về nghĩa, không cần đúng chữ) và KHÔNG vi phạm điều cấm nào.
- Ngoài ra lời đáp phải: giữ vai nhân vật (trừ một câu thừa nhận ngắn khi được hỏi nghiêm túc có phải AI), đúng cách xưng hô trong hồ sơ, không tỏ ra biết điều sau thời điểm hiện tại của nhân vật, không có sai sót lịch sử rõ ràng. Vi phạm các điều này cũng là fail.
- Ý BẮT BUỘC và ĐIỀU CẤM đã được người soạn đề kiểm chứng theo sử liệu và là CHUẨN ĐÚNG. Nếu hiểu biết của bạn mâu thuẫn với chúng thì theo chúng; tuyệt đối không coi một điều khớp với ý bắt buộc là sai sót lịch sử.
- Chỉ đánh "sai sót lịch sử" với điều sai rõ ràng, chắc chắn, nằm ngoài các ý đã cho; không trừ điểm vì chi tiết phụ đúng nhưng không được yêu cầu.
- Ý bắt buộc có chữ "hoặc", "ít nhất một trong", "có thể" thì chỉ cần thỏa MỘT phương án là đủ; đừng đòi đủ mọi phương án.
Trả về JSON: pass, missing (ý bắt buộc còn thiếu), violations (điều cấm / quy tắc bị vi phạm), note (một câu nhận xét ngắn bằng tiếng Việt).
`.trim();

const JUDGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pass: { type: Type.BOOLEAN },
    missing: { type: Type.ARRAY, items: { type: Type.STRING } },
    violations: { type: Type.ARRAY, items: { type: Type.STRING } },
    note: { type: Type.STRING },
  },
  required: ["pass", "missing", "violations", "note"],
};

let judgeCursor = 0;

type Verdict = NonNullable<CaseResult["judge"]>;

/** Số phiếu giám khảo cho mỗi câu (lấy đa số). Đặt EVAL_JUDGE_VOTES=1 để chấm một lần. */
const JUDGE_VOTES = () => Math.max(1, Math.min(5, Number(process.env.EVAL_JUDGE_VOTES) || 3));

/**
 * Chấm theo đa số: gọi giám khảo tới khi một phía (đạt / không đạt) có đủ đa số phiếu.
 * Một lần chấm nhầm của giám khảo (nhất là bản lite) không còn đủ làm trượt câu đúng, và ngược lại.
 */
async function judge(c: EvalCase, answer: string): Promise<Verdict> {
  const total = JUDGE_VOTES();
  const need = Math.floor(total / 2) + 1;
  const votes: Verdict[] = [];
  while (votes.filter((v) => v.pass).length < need && votes.filter((v) => !v.pass).length < need) {
    votes.push(await judgeOnce(c, answer, total > 1 ? 0.4 : 0));
  }
  const pass = votes.filter((v) => v.pass).length >= need;
  const side = votes.filter((v) => v.pass === pass);
  const tally = total > 1 ? ` (phiếu: ${votes.filter((v) => v.pass).length} đạt / ${votes.filter((v) => !v.pass).length} không đạt)` : "";
  return { ...side[0], note: side[0].note + tally };
}

async function judgeOnce(c: EvalCase, answer: string, temperature: number): Promise<Verdict> {
  const keys = parseKeys(process.env.GEMINI_API_KEYS);
  const p = PROFILE[c.character];
  const history = (c.history ?? [])
    .map((t) => `${t.role === "user" ? "Người dùng" : p.name}: ${t.text}`)
    .join("\n");
  const prompt = [
    `NHÂN VẬT: ${p.name}. Hiện tại: ${p.present} Tự xưng "${p.self}", gọi người dùng là "${p.user}".`,
    history ? `HỘI THOẠI TRƯỚC:\n${history}` : "HỘI THOẠI TRƯỚC: (không có)",
    `CÂU HỎI: ${c.question}`,
    `LỜI ĐÁP:\n${answer}`,
    `Ý BẮT BUỘC:\n${c.mustHave.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    `ĐIỀU CẤM:\n${c.mustNot.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    ...(c.reference ? [`SỰ THẬT ĐỐI CHIẾU (chuẩn đúng, đã kiểm chứng):\n${c.reference}`] : []),
  ].join("\n\n");

  let lastErr: unknown;
  // Hạn mức tính theo từng cặp (khóa, model). Khóa bị 401/403 thì bỏ hẳn; cặp bị 429 thì nghỉ 65 giây.
  // Model chính hết khóa dùng được thì chuyển NGAY sang model dự phòng; mọi model đều đang nghỉ thì mới chờ.
  // Đủ lượt để chờ qua giới hạn theo phút (mỗi cặp khóa–model nghỉ 65 giây) thay vì bỏ cuộc sớm.
  for (let round = 0; round < 40; round++) {
    const pick = pickJudgeSlot(keys);
    if (!pick) {
      const wait = nextJudgeRecovery() - Date.now();
      if (wait === Infinity || wait > 120_000) break;
      await sleep(Math.max(1_000, wait));
      continue;
    }
    const { model, key } = pick;
    {
      // Giới hạn thời gian mỗi lần chấm: kết nối đứt ngầm (vd máy ngủ giữa chừng) không được treo cả bộ kiểm thử.
      const ac = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const res = await Promise.race([
          new GoogleGenAI({ apiKey: key }).models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: JUDGE_SYSTEM,
              temperature,
              responseMimeType: "application/json",
              responseSchema: JUDGE_SCHEMA,
              // Dòng 2.x dùng ngân sách suy nghĩ, dòng 3.x dùng mức suy nghĩ.
              thinkingConfig: /^gemini-2\./.test(model) ? { thinkingBudget: 1024 } : { thinkingLevel: ThinkingLevel.LOW },
              abortSignal: ac.signal,
            },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              ac.abort();
              reject(new JudgeTimeoutError(JUDGE_TIMEOUT_MS()));
            }, JUDGE_TIMEOUT_MS());
          }),
        ]);
        const data = JSON.parse(res.text ?? "{}");
        judgeModelsUsed.add(model);
        return {
          pass: data.pass === true,
          missing: Array.isArray(data.missing) ? data.missing : [],
          violations: Array.isArray(data.violations) ? data.violations : [],
          note: typeof data.note === "string" ? data.note : "",
          model,
        };
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        // Quá giờ: coi như máy chủ quá tải, cho cặp (model, khóa) nghỉ ngắn rồi chấm lại bằng cặp khác.
        if (err instanceof JudgeTimeoutError) judgeRestUntil.set(`${model}|${key}`, Date.now() + 10_000);
        else if (status === 401 || status === 403) deadJudgeKeys.add(key);
        else if (status === 404) deadJudgeModels.add(model);
        else if (status === 429) judgeRestUntil.set(`${model}|${key}`, Date.now() + 65_000);
        else if (status !== undefined && status >= 500) judgeRestUntil.set(`${model}|${key}`, Date.now() + 10_000);
        else await sleep(1_500);
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw new Error(`Giám khảo lỗi: ${(lastErr as Error)?.message?.slice(0, 160)}`);
}

/** Thời gian chờ tối đa một lần chấm (EVAL_JUDGE_TIMEOUT_MS, mặc định 60 giây). */
const JUDGE_TIMEOUT_MS = () => Number(process.env.EVAL_JUDGE_TIMEOUT_MS) || 60_000;

class JudgeTimeoutError extends Error {
  constructor(ms: number) {
    super(`giám khảo không phản hồi sau ${Math.round(ms / 1000)} giây`);
    this.name = "JudgeTimeoutError";
  }
}

/** (model|khóa) -> thời điểm hết nghỉ sau khi bị 429. */
const judgeRestUntil = new Map<string, number>();
/** Model không còn dùng được (404). */
const deadJudgeModels = new Set<string>();

function pickJudgeSlot(keys: string[]): { model: string; key: string } | null {
  const now = Date.now();
  for (const model of JUDGE_MODELS()) {
    if (deadJudgeModels.has(model)) continue;
    const live = keys.filter((k) => !deadJudgeKeys.has(k) && (judgeRestUntil.get(`${model}|${k}`) ?? 0) <= now);
    if (live.length > 0) return { model, key: live[judgeCursor++ % live.length] };
  }
  return null;
}

function nextJudgeRecovery(): number {
  const times = [...judgeRestUntil.values()].filter((t) => t > Date.now());
  return times.length ? Math.min(...times) : Infinity;
}

/** Model giám khảo đã thực sự dùng trong lần chạy (để ghi vào báo cáo). */
export const judgeModelsUsed = new Set<string>();

// ───────────── Chạy cả bộ ─────────────

export async function runCase(c: EvalCase): Promise<CaseResult> {
  try {
    const { answer, ttftMs, attempts } = await generate(c);
    const ruleIssues = ruleCheck(c, answer);
    const j = await judge(c, answer);
    return { c, answer, ttftMs, attempts, ruleIssues, judge: j, pass: ruleIssues.length === 0 && j.pass };
  } catch (err) {
    return { c, answer: "", ttftMs: null, attempts: 0, ruleIssues: [], judge: null, error: String((err as Error).message), pass: false };
  }
}

/** Lượt chạy lại cho câu bị lỗi hạ tầng (hết hạn mức theo phút, mất mạng, Gemini cắt luồng). */
const INFRA_RETRY_ROUNDS = 2;
const INFRA_RETRY_WAIT_MS = 70_000;

export async function runAll(
  cases: EvalCase[],
  concurrency: number,
  onDone?: (r: CaseResult) => void,
  log: (msg: string) => void = () => {},
) {
  const results: CaseResult[] = new Array(cases.length);

  async function pass(indexes: number[], parallel: number) {
    let next = 0;
    async function worker() {
      while (next < indexes.length) {
        const i = indexes[next++];
        results[i] = await runCase(cases[i]);
        onDone?.(results[i]);
      }
    }
    await Promise.all(Array.from({ length: Math.min(parallel, indexes.length) }, worker));
  }

  await pass(cases.map((_, i) => i), concurrency);

  // Câu lỗi hạ tầng không nói gì về chất lượng nhập vai: chờ hạn mức hồi rồi chạy lại.
  for (let round = 1; round <= INFRA_RETRY_ROUNDS; round++) {
    const failed = results.flatMap((r, i) => (r.error ? [i] : []));
    if (failed.length === 0) break;
    log(`\n${failed.length} câu lỗi hạ tầng, chờ ${INFRA_RETRY_WAIT_MS / 1000} giây rồi chạy lại (lượt ${round}/${INFRA_RETRY_ROUNDS})...`);
    await sleep(INFRA_RETRY_WAIT_MS);
    await pass(failed, 2);
  }
  for (const r of results) if (r.error) r.infra = true;
  return results;
}

// ───────────── Tổng hợp & báo cáo ─────────────

export interface CharacterSummary {
  character: CharacterId;
  total: number;
  passed: number;
  rate: number;
  coreTotal: number;
  corePassed: number;
  ttftMedian: number | null;
  ttftP90: number | null;
  ttftMax: number | null;
  ok: boolean;
  /** Số câu không chấm được vì lỗi hạ tầng. */
  infra: number;
  /** Nếu coi các câu lỗi hạ tầng là đạt thì nhân vật có đạt ngưỡng không (để phân biệt "chưa đạt" với "không kết luận được"). */
  okIgnoringInfra: boolean;
}

export type Verdict3 = "ĐẠT" | "CHƯA ĐẠT" | "KHÔNG KẾT LUẬN ĐƯỢC";

/** ĐẠT: mọi nhân vật đạt. CHƯA ĐẠT: có nhân vật trượt vì lời đáp. KHÔNG KẾT LUẬN ĐƯỢC: chỉ trượt vì lỗi hạ tầng. */
export function overallVerdict(sums: CharacterSummary[]): Verdict3 {
  if (sums.every((s) => s.ok)) return "ĐẠT";
  if (sums.every((s) => s.okIgnoringInfra)) return "KHÔNG KẾT LUẬN ĐƯỢC";
  return "CHƯA ĐẠT";
}

const characterVerdict = (s: CharacterSummary): Verdict3 =>
  s.ok ? "ĐẠT" : s.okIgnoringInfra ? "KHÔNG KẾT LUẬN ĐƯỢC" : "CHƯA ĐẠT";

const quantile = (xs: number[], q: number) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};

export function summarize(results: CaseResult[]): CharacterSummary[] {
  const ids = [...new Set(results.map((r) => r.c.character))];
  return ids.map((character) => {
    const rs = results.filter((r) => r.c.character === character);
    const core = rs.filter((r) => r.c.group === "core");
    const ttfts = rs.map((r) => r.ttftMs).filter((x): x is number => x !== null);
    const passed = rs.filter((r) => r.pass).length;
    const corePassed = core.filter((r) => r.pass).length;
    const rate = passed / rs.length;
    const infra = rs.filter((r) => r.infra).length;
    const passedOrInfra = rs.filter((r) => r.pass || r.infra).length;
    const coreOk = core.every((r) => r.pass || r.infra);
    return {
      infra,
      okIgnoringInfra: passedOrInfra / rs.length >= 0.9 && coreOk,
      character,
      total: rs.length,
      passed,
      rate,
      coreTotal: core.length,
      corePassed,
      ttftMedian: quantile(ttfts, 0.5),
      ttftP90: quantile(ttfts, 0.9),
      ttftMax: quantile(ttfts, 1),
      ok: rate >= 0.9 && corePassed === core.length,
    };
  });
}

const sec = (ms: number | null) => (ms === null ? "–" : `${(ms / 1000).toFixed(2)} s`);
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n+/g, " ");

export function renderReport(results: CaseResult[], meta: { startedAt: Date; durationMs: number; partial: boolean }): string {
  const sums = summarize(results);
  const verdict = overallVerdict(sums);
  const infraTotal = results.filter((r) => r.infra).length;
  const lines: string[] = [];
  lines.push("# Kết quả bộ kiểm thử nhập vai");
  lines.push("");
  lines.push(`- Chạy lúc: ${meta.startedAt.toISOString()} · thời gian chạy: ${Math.round(meta.durationMs / 1000)} s${meta.partial ? " · **CHẠY MỘT PHẦN (có lọc)**" : ""}`);
  lines.push(`- Model trả lời: \`${getModelName()}\` · mức suy nghĩ: \`${process.env.GEMINI_THINKING_LEVEL ?? "minimal"}\` · độ ngẫu nhiên: \`${getTemperature()}\` · giám khảo: \`${[...judgeModelsUsed].join(", ") || JUDGE_MODELS()[0]}\`, chấm theo đa số ${JUDGE_VOTES()} phiếu`);
  lines.push(`- Ngưỡng đạt: mỗi nhân vật ≥ 90%, nhóm "${GROUP_LABEL.core}" 100%. Một câu đạt khi qua kiểm tra cứng VÀ giám khảo chấm đạt.`);
  lines.push(`- Chữ đầu: đo trong tiến trình (từ lúc gửi tới khi có chữ đầu tiên từ Gemini, gồm cả gửi song song có trễ), chưa gồm mạng trình duyệt ↔ server.`);
  lines.push(
    `- Câu lỗi hạ tầng (gọi AI hoặc giám khảo thất bại, đã chờ và chạy lại ${INFRA_RETRY_ROUNDS} lượt) ghi "LỖI HẠ TẦNG": không chấm được, không phải lỗi nhập vai. Còn lại: ${infraTotal} câu.`,
  );
  lines.push(
    `- **Kết luận chung: ${verdict}**${verdict === "KHÔNG KẾT LUẬN ĐƯỢC" ? " (chỉ trượt vì lỗi hạ tầng; hãy chạy lại khi hạn mức đã hồi)" : ""}`,
  );
  lines.push("");
  lines.push("## Tổng hợp");
  lines.push("");
  lines.push("| Nhân vật | Đạt | Tỉ lệ | Sự kiện cốt lõi | Chữ đầu trung vị | Chữ đầu p90 | Chữ đầu chậm nhất | Kết luận |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const s of sums) {
    lines.push(
      `| ${PROFILE[s.character].name} | ${s.passed}/${s.total} | ${Math.round(s.rate * 100)}% | ${s.corePassed}/${s.coreTotal} | ${sec(s.ttftMedian)} | ${sec(s.ttftP90)} | ${sec(s.ttftMax)} | ${characterVerdict(s)}${s.infra ? ` (${s.infra} câu lỗi hạ tầng)` : ""} |`,
    );
  }
  lines.push("");
  lines.push("## Chi tiết từng câu");
  lines.push("");
  lines.push("| Mã | Nhóm | Câu hỏi | Kết quả | Chữ đầu | Ghi chú |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of results) {
    const notes = r.error
      ? r.error
      : [
          ...r.ruleIssues.map((x) => `[cứng] ${x}`),
          ...(r.judge?.missing ?? []).map((x) => `[thiếu] ${x}`),
          ...(r.judge?.violations ?? []).map((x) => `[vi phạm] ${x}`),
          r.pass ? (r.judge?.note ?? "") : "",
        ]
          .filter(Boolean)
          .join(" · ");
    lines.push(
      `| ${r.c.id} | ${GROUP_LABEL[r.c.group as Group]} | ${cell(r.c.question)} | ${r.pass ? "ĐẠT" : r.infra ? "LỖI HẠ TẦNG" : "**KHÔNG ĐẠT**"} | ${sec(r.ttftMs)} | ${cell(notes)} |`,
    );
  }
  lines.push("");
  lines.push("## Lời đáp đầy đủ");
  for (const r of results) {
    lines.push("");
    lines.push(`### ${r.c.id} · ${PROFILE[r.c.character].name} · ${r.pass ? "ĐẠT" : r.infra ? "LỖI HẠ TẦNG" : "KHÔNG ĐẠT"}`);
    for (const t of r.c.history ?? []) lines.push(`> _(lượt trước) ${t.role === "user" ? "Hỏi" : "Đáp"}: ${cell(t.text)}_`);
    lines.push(`**Hỏi:** ${r.c.question}`);
    const cards = selectTopicCards(r.c.character, [...(r.c.history ?? []), { role: "user", text: r.c.question }]);
    lines.push(`_Thẻ sự thật đã chèn: ${cards.length ? cards.map((x) => x.id).join(", ") : "không có"}_`);
    lines.push("");
    lines.push((r.answer || `_(không có lời đáp: ${r.error ?? "?"})_`).split("\n").map((l) => `> ${l}`).join("\n"));
  }
  lines.push("");
  return lines.join("\n");
}
