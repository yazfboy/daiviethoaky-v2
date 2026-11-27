import "server-only";

import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { getCharacter } from "@/lib/characters";
import type { ChatTurn } from "@/lib/chatProtocol";
import type { Shot } from "@/lib/directorProtocol";
import { imagesOf, PRESENT_YEAR, topicsFor } from "@/lib/media/catalog";
import { isSmallTalk } from "@/lib/media/smallTalk";
import type { Topic } from "@/lib/media/types";
import { classifyError } from "@/lib/server/chatStream";
import { KeyPool, parseKeys, type PoolKey } from "@/lib/server/keyPool";

// AI ĐẠO DIỄN (Phase 3).
// Chạy song song với lời thoại (endpoint riêng /api/director), không chạm vào đường đi của /api/chat.
// Quy trình một lượt:
//   1. Câu chỉ có chào hỏi / cảm ơn → "không ảnh", không gọi AI.
//   2. Gọi Gemini (gửi song song có trễ: 1,5 giây chưa có kết quả hoặc lần gọi lỗi thì gọi thêm lần kế; tối đa 3 lần,
//      mỗi lần ≤ 5 giây, cả lượt ≤ 9 giây; lần 1 dùng model chính, từ lần 2 dùng model dự phòng): AI chỉ được chọn MỘT mã trong danh sách chủ đề
//      của đúng nhân vật này (enum trong lược đồ JSON) hoặc "none", kèm lý do ngắn. AI không viết chú thích,
//      không chọn URL: ảnh và chú thích lấy từ kho đã duyệt (src/lib/media/catalog.ts).
//   3. Tra chủ đề → ảnh đầu tiên chưa hiện trong cuộc trò chuyện. Hết ảnh thì không thêm ảnh mới.
// Mọi lỗi (hết hạn mức, quá giờ, mạng, JSON sai) đều thành "không ảnh"; lời thoại không bị ảnh hưởng.
// Phase 4/5: thêm loại shot "video" / "painting" ở bước 3 (chọn chất liệu), bước 2 giữ nguyên.

/** Model chính của đạo diễn: khác model chat để hạn mức (tính theo project + model) không ăn vào hạn mức của chat. */
export const DEFAULT_DIRECTOR_MODEL = "gemini-3.1-flash-lite";
/**
 * Model dự phòng (Manager chọn sau khi đo: model chính hay bị 503 / treo vài giây). Chỉ dùng cho lần gọi thứ 2 trở đi,
 * tức khi model chính lỗi hoặc quá 1,5 giây chưa trả lời, nên chỉ những lượt chậm mới tốn hạn mức của model này.
 */
export const DEFAULT_DIRECTOR_FALLBACK_MODEL = "gemini-3.5-flash-lite";

export function getDirectorModel(): string {
  return process.env.DIRECTOR_MODEL?.trim() || DEFAULT_DIRECTOR_MODEL;
}

/** DIRECTOR_FALLBACK_MODEL=none để bỏ dự phòng (mọi lần gọi đều dùng model chính). */
export function getDirectorFallbackModel(): string | null {
  const raw = process.env.DIRECTOR_FALLBACK_MODEL?.trim();
  if (raw && /^(none|off|false|0)$/i.test(raw)) return null;
  return raw || DEFAULT_DIRECTOR_FALLBACK_MODEL;
}

/** Tắt hẳn đạo diễn bằng DIRECTOR_ENABLED=false (đo A/B, công tắc khẩn). */
export function isDirectorEnabled(): boolean {
  return !/^(false|0|off|no)$/i.test(process.env.DIRECTOR_ENABLED?.trim() ?? "");
}

function getThinkingLevel(): ThinkingLevel | undefined {
  const raw = (process.env.DIRECTOR_THINKING_LEVEL ?? "minimal").trim().toUpperCase();
  if (raw === "NONE" || raw === "") return undefined;
  return (Object.values(ThinkingLevel) as string[]).includes(raw) ? (raw as ThinkingLevel) : ThinkingLevel.MINIMAL;
}

// ───────────── Prompt ─────────────

export const DIRECTOR_SYSTEM = `
Bạn là "AI Đạo diễn" của một ứng dụng trò chuyện nhập vai với danh nhân lịch sử Việt Nam.
Mỗi lượt, người dùng hỏi nhân vật một câu và nhân vật sẽ trả lời ngay sau đó. Việc của bạn: quyết định lượt trả lời ấy có nên kèm MỘT ảnh tư liệu hay không, và nếu có thì thuộc CHỦ ĐỀ nào trong danh sách cho trước.

Quy tắc:
1. Chỉ chọn một chủ đề khi câu hỏi mới nhất hỏi thẳng về đúng sự kiện, nơi chốn, tác phẩm, đồ vật hay dung mạo mà chủ đề ấy mô tả; hoặc là câu hỏi nối tiếp rõ ràng ("trận đó", "bài ấy", "nơi ấy", "sau đó thì sao"...) về chủ đề đang bàn ở lượt ngay trước.
2. Trả "none" khi: chào hỏi, cảm ơn, tạm biệt, khen ngợi; câu hỏi chung chung; hỏi cảm nghĩ, nỗi lo, lời khuyên, bài học, đạo lý, tính cách, gia đình, bạn bè mà không nhắm đúng một chủ đề trong danh sách; hỏi về người hay việc ở thời sau nhân vật; chuyện hiện đại, máy móc, công nghệ, chính trị ngày nay; đòi bỏ vai, hỏi có phải AI không, đòi xem hướng dẫn; câu vô nghĩa.
3. Thời kỳ phải khớp: trận Bạch Đằng năm 938 (Ngô Quyền đánh quân Nam Hán) và trận Bạch Đằng năm 1288 (Hưng Đạo Vương đánh quân Nguyên) là HAI chủ đề khác nhau. Chọn theo năm, đối thủ, người chỉ huy được nhắc tới. Câu hỏi không đủ để phân biệt thì chọn trận do chính nhân vật chỉ huy; nhân vật không chỉ huy trận nào trong hai thì trả "none".
4. Câu hỏi chỉ nhắc lướt qua một chủ đề nhưng thực ra hỏi việc khác (vd hỏi cảm nghĩ về một người) thì trả "none".
5. Không chắc thì trả "none". Thà không có ảnh còn hơn ảnh sai chủ đề hoặc sai thời kỳ.
6. "reason": một câu tiếng Việt ngắn, tối đa 15 chữ, nói vì sao chọn hoặc không chọn.
`.trim();

const MAX_CONTEXT_TURNS = 4;
const MAX_MODEL_CHARS = 300;
const MAX_USER_CHARS = 400;

export function buildDirectorPrompt(characterId: string, messages: ChatTurn[], topics: Topic[]): string {
  const name = getCharacter(characterId)?.name ?? characterId;
  const present = PRESENT_YEAR[characterId as keyof typeof PRESENT_YEAR];
  const last = messages[messages.length - 1];
  const context = messages
    .slice(0, -1)
    .slice(-MAX_CONTEXT_TURNS)
    .map((m) =>
      m.role === "user"
        ? `Người dùng: ${m.text.slice(0, MAX_USER_CHARS)}`
        : `${name}: ${m.text.length > MAX_MODEL_CHARS ? `${m.text.slice(0, MAX_MODEL_CHARS)}…` : m.text}`,
    )
    .join("\n");
  return [
    `NHÂN VẬT: ${name} (hiện tại là năm ${present}; nhân vật không biết gì sau năm này).`,
    `DANH SÁCH CHỦ ĐỀ CÓ ẢNH:\n${topics.map((t) => `- ${t.id}: ${t.title}. Chọn khi: ${t.when}`).join("\n")}`,
    `HỘI THOẠI GẦN ĐÂY:\n${context || "(chưa có)"}`,
    `CÂU HỎI MỚI NHẤT CỦA NGƯỜI DÙNG: ${last?.text.slice(0, MAX_USER_CHARS) ?? ""}`,
  ].join("\n\n");
}

function responseSchema(topicIds: string[]) {
  return {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING },
      topic: { type: Type.STRING, enum: [...topicIds, "none"] },
    },
    required: ["reason", "topic"],
    propertyOrdering: ["reason", "topic"],
  };
}

// ───────────── Gọi model ─────────────

export interface DirectorModelRequest {
  model: string;
  systemInstruction: string;
  prompt: string;
  topicIds: string[];
  signal: AbortSignal;
}

/** Gọi model, trả về chuỗi JSON thô. Tách riêng để test không cần mạng. */
export type DirectorModelCall = (key: PoolKey, req: DirectorModelRequest) => Promise<string>;

const clients = new Map<number, GoogleGenAI>();

export const geminiDirectorCall: DirectorModelCall = async (key, req) => {
  let client = clients.get(key.index);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key.value });
    clients.set(key.index, client);
  }
  const thinkingLevel = getThinkingLevel();
  const res = await client.models.generateContent({
    model: req.model,
    contents: [{ role: "user", parts: [{ text: req.prompt }] }],
    config: {
      systemInstruction: req.systemInstruction,
      temperature: 0,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
      responseSchema: responseSchema(req.topicIds),
      ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      abortSignal: req.signal,
    },
  });
  return res.text ?? "";
};

const globalForPool = globalThis as unknown as { __dvhkDirectorPools?: Map<string, KeyPool> };

/**
 * Key pool riêng của đạo diễn, mỗi model một pool (cùng danh sách khóa, trạng thái nghỉ riêng): khóa bị 429 / 503
 * ở model này không bị cho nghỉ ở model kia, cũng không ảnh hưởng pool của chat.
 * Dùng lại class KeyPool có sẵn, không sửa cơ chế xoay vòng.
 */
export function getDirectorKeyPool(model: string = getDirectorModel()): KeyPool {
  globalForPool.__dvhkDirectorPools ??= new Map();
  let pool = globalForPool.__dvhkDirectorPools.get(model);
  if (!pool) {
    pool = new KeyPool(parseKeys(process.env.GEMINI_API_KEYS));
    globalForPool.__dvhkDirectorPools.set(model, pool);
  }
  return pool;
}

// ───────────── Quyết định ─────────────

export interface DirectorOutcome {
  shot: Shot;
  /** Chủ đề AI chọn (có thể khác null mà shot vẫn "none" khi chủ đề đã hết ảnh mới). */
  topicId: string | null;
  reason: string;
  /** prefilter: lọc sẵn câu xã giao; ai: AI quyết định; disabled: đạo diễn bị tắt; error: đạo diễn lỗi. */
  source: "prefilter" | "ai" | "disabled" | "error";
  ms: number;
  attempts: number;
  keyIndex?: number;
  /** Model đã cho ra quyết định (chính hoặc dự phòng). */
  model?: string;
  error?: string;
}

export interface DecideOptions {
  characterId: string;
  messages: ChatTurn[];
  /** Mã ảnh đã hiện trong cuộc trò chuyện. */
  shown?: Iterable<string>;
  signal?: AbortSignal;
  pool?: KeyPool;
  call?: DirectorModelCall;
  model?: string;
  /** Model dự phòng cho lần gọi thứ 2 trở đi; null = không dự phòng. Mặc định lấy từ môi trường. */
  fallbackModel?: string | null;
  enabled?: boolean;
  /** Thời gian chờ tối đa cho mỗi lần gọi model. */
  attemptTimeoutMs?: number;
  /** Tổng thời gian tối đa cả lượt. */
  overallTimeoutMs?: number;
  /** Số lần gọi tối đa (mỗi lần một khóa khác). */
  maxAttempts?: number;
  /** Chờ bao lâu chưa có kết quả thì gọi thêm khóa kế song song. */
  hedgeDelayMs?: number;
}

const NONE: Shot = { kind: "none" };

/** Ảnh đầu tiên của chủ đề chưa hiện trong cuộc trò chuyện. */
export function pickImage(topicId: string, shown: Set<string>): string | null {
  return imagesOf(topicId).find((img) => !shown.has(img.id))?.id ?? null;
}

/** Đọc JSON model trả về; sai định dạng hoặc chủ đề ngoài danh sách thì coi như "none". */
export function parseDecision(raw: string, allowed: Set<string>): { topicId: string | null; reason: string } | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { topic, reason } = data as { topic?: unknown; reason?: unknown };
  const why = typeof reason === "string" ? reason.trim().slice(0, 160) : "";
  if (typeof topic !== "string") return null;
  if (topic === "none") return { topicId: null, reason: why };
  if (!allowed.has(topic)) return null;
  return { topicId: topic, reason: why };
}

class AttemptTimeout extends Error {}

export async function decideShot(opts: DecideOptions): Promise<DirectorOutcome> {
  const t0 = Date.now();
  const done = (o: Omit<DirectorOutcome, "ms">): DirectorOutcome => ({ ...o, ms: Date.now() - t0 });
  const last = opts.messages[opts.messages.length - 1];

  if (!(opts.enabled ?? isDirectorEnabled())) {
    return done({ shot: NONE, topicId: null, reason: "đạo diễn đang tắt (DIRECTOR_ENABLED=false)", source: "disabled", attempts: 0 });
  }
  if (!last || last.role !== "user") {
    return done({ shot: NONE, topicId: null, reason: "không có câu hỏi mới", source: "prefilter", attempts: 0 });
  }
  if (isSmallTalk(last.text)) {
    return done({ shot: NONE, topicId: null, reason: "chào hỏi / cảm ơn, không minh họa (lọc sẵn, không gọi AI)", source: "prefilter", attempts: 0 });
  }
  const topics = topicsFor(opts.characterId);
  if (topics.length === 0) {
    return done({ shot: NONE, topicId: null, reason: "nhân vật chưa có chủ đề nào trong kho", source: "prefilter", attempts: 0 });
  }

  const call = opts.call ?? geminiDirectorCall;
  const attemptTimeoutMs = opts.attemptTimeoutMs ?? 5_000;
  const overallTimeoutMs = opts.overallTimeoutMs ?? 9_000;
  // 3 lần: khóa bị từ chối (403) trả lỗi rất nhanh, hai khóa hỏng nằm liền nhau không được làm mất ảnh.
  const maxAttempts = opts.maxAttempts ?? 3;
  const topicIds = topics.map((t) => t.id);
  const allowed = new Set(topicIds);
  const prompt = buildDirectorPrompt(opts.characterId, opts.messages, topics);

  // Kế hoạch các lần gọi: lần 1 dùng model chính, từ lần 2 dùng model dự phòng (nếu có).
  // Mỗi model lấy khóa theo thứ tự xoay vòng của pool riêng model đó.
  const primary = opts.model ?? getDirectorModel();
  const fallback = opts.fallbackModel !== undefined ? opts.fallbackModel : getDirectorFallbackModel();
  const poolFor = (m: string) => opts.pool ?? getDirectorKeyPool(m);
  interface Slot {
    key: PoolKey;
    model: string;
    pool: KeyPool;
  }
  const candidatesByModel = new Map<string, PoolKey[]>();
  /** Khóa đã bị từ chối (401/403) trong lượt này: không dùng lại với model nào. */
  const deadKeys = new Set<number>();
  const nextKey = (model: string): PoolKey | undefined => {
    if (!candidatesByModel.has(model)) candidatesByModel.set(model, poolFor(model).candidates());
    const list = candidatesByModel.get(model)!;
    while (list.length > 0) {
      const k = list.shift()!;
      if (!deadKeys.has(k.index)) return k;
    }
    return undefined;
  };
  const queue: Slot[] = [];
  for (let i = 0; i < maxAttempts; i++) {
    const model = i === 0 || !fallback ? primary : fallback;
    const key = nextKey(model);
    if (key) queue.push({ key, model, pool: poolFor(model) });
  }
  if (queue.length === 0) {
    return done({ shot: NONE, topicId: null, reason: "server chưa có khóa AI", source: "error", attempts: 0, error: "NOT_CONFIGURED" });
  }

  // Gửi song song có trễ (giống đường chat): gọi lần đầu; sau hedgeDelayMs chưa có kết quả thì gọi thêm lần kế
  // (Gemini thỉnh thoảng treo một yêu cầu vài giây). Lần gọi lỗi thì thay ngay bằng lần kế. Kết quả nào về trước
  // thì dùng, hủy các yêu cầu còn lại. Tối đa maxAttempts lần gọi cho cả lượt.
  const hedgeDelayMs = opts.hedgeDelayMs ?? 1_500;
  const errors: string[] = [];
  let attempts = 0;
  type Result = { slot: Slot; ok: true; raw: string } | { slot: Slot; ok: false; err: unknown };
  const running = new Map<Slot, { ac: AbortController; p: Promise<Result>; timer?: ReturnType<typeof setTimeout> }>();
  const stopAll = () => {
    for (const r of running.values()) {
      r.ac.abort();
      clearTimeout(r.timer);
    }
    running.clear();
  };
  opts.signal?.addEventListener("abort", stopAll, { once: true });

  const launch = (): boolean => {
    const remaining = overallTimeoutMs - (Date.now() - t0);
    if (remaining < 500 || opts.signal?.aborted) return false;
    const slot = queue.shift();
    if (!slot) return false;
    attempts++;
    const ac = new AbortController();
    const entry: { ac: AbortController; p: Promise<Result>; timer?: ReturnType<typeof setTimeout> } = {
      ac,
      p: Promise.resolve({ slot, ok: false, err: null }),
    };
    entry.p = new Promise<Result>((resolve) => {
      entry.timer = setTimeout(() => {
        ac.abort();
        resolve({ slot, ok: false, err: new AttemptTimeout("timeout") });
      }, Math.min(attemptTimeoutMs, remaining));
      call(slot.key, { model: slot.model, systemInstruction: DIRECTOR_SYSTEM, prompt, topicIds, signal: ac.signal }).then(
        (raw) => resolve({ slot, ok: true, raw }),
        (err) => resolve({ slot, ok: false, err }),
      );
    });
    running.set(slot, entry);
    return true;
  };

  try {
    launch();
    while (running.size > 0) {
      let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
      const hedge =
        queue.length > 0 ? new Promise<"hedge">((r) => (hedgeTimer = setTimeout(() => r("hedge"), hedgeDelayMs))) : null;
      const winner = await Promise.race([...[...running.values()].map((r) => r.p), ...(hedge ? [hedge] : [])]);
      clearTimeout(hedgeTimer);
      if (opts.signal?.aborted) {
        errors.push("ABORTED");
        break;
      }
      if (winner === "hedge") {
        launch();
        continue;
      }
      clearTimeout(running.get(winner.slot)?.timer);
      running.delete(winner.slot);
      const { key, model, pool } = winner.slot;
      const by = { attempts, keyIndex: key.index, model };

      if (winner.ok) {
        pool.markSuccess(key);
        stopAll();
        const decision = parseDecision(winner.raw, allowed);
        if (!decision) {
          // JSON sai hoặc chủ đề ngoài danh sách: không thử lại (đổi khóa không giúp gì), coi như không ảnh.
          return done({ shot: NONE, topicId: null, reason: "AI trả kết quả không hợp lệ, bỏ qua minh họa", source: "error", ...by, error: "INVALID_OUTPUT" });
        }
        if (!decision.topicId) {
          return done({ shot: NONE, topicId: null, reason: decision.reason || "không cần minh họa", source: "ai", ...by });
        }
        const mediaId = pickImage(decision.topicId, new Set(opts.shown ?? []));
        if (!mediaId) {
          return done({ shot: NONE, topicId: decision.topicId, reason: `${decision.reason} (chủ đề đã hết ảnh mới)`, source: "ai", ...by });
        }
        return done({ shot: { kind: "image", topicId: decision.topicId, mediaId }, topicId: decision.topicId, reason: decision.reason, source: "ai", ...by });
      }

      const kind = winner.err instanceof AttemptTimeout ? "timeout" : classifyError(winner.err);
      const status = (winner.err as { status?: number })?.status;
      errors.push(`khóa #${key.index} ${model} ${kind}${status ? ` ${status}` : ""}`);
      if (kind === "quota" || kind === "overloaded") pool.markFailure(key, kind);
      if (kind === "auth") {
        // Khóa bị từ chối (401/403) thì hỏng với mọi model: cho nghỉ ở mọi pool của đạo diễn, và bỏ các lần gọi
        // còn chờ dùng cùng khóa này.
        for (const p of new Set([pool, ...(globalForPool.__dvhkDirectorPools?.values() ?? [])])) p.markFailure(key, "auth");
        deadKeys.add(key.index);
        for (let i = queue.length - 1; i >= 0; i--) {
          if (queue[i].key.index !== key.index) continue;
          const replacement = nextKey(queue[i].model);
          if (replacement) queue[i] = { ...queue[i], key: replacement };
          else queue.splice(i, 1);
        }
      }
      if (kind === "timeout") pool.markFailure(key, "overloaded");
      // Lỗi yêu cầu (vd 400, model không tồn tại): đổi khóa cùng model không giúp gì; còn model khác thì thử model đó.
      if (kind === "fatal") {
        const other = queue.findIndex((s) => s.model !== model);
        if (other < 0) break;
        queue.splice(0, other);
      }
      launch(); // thay ngay khóa lỗi bằng khóa kế
    }
  } finally {
    stopAll();
    opts.signal?.removeEventListener("abort", stopAll);
  }
  return done({ shot: NONE, topicId: null, reason: "đạo diễn lỗi, bỏ qua minh họa", source: "error", attempts, error: errors.join("; ") || "TIMEOUT" });
}

/** Một dòng log cho QA soát quyết định của từng lượt. Không ghi giá trị khóa, chỉ trích ngắn câu hỏi. */
export function formatDirectorLog(characterId: string, messages: ChatTurn[], o: DirectorOutcome): string {
  const turn = messages.filter((m) => m.role === "user").length;
  const q = messages[messages.length - 1]?.text.replace(/\s+/g, " ").trim() ?? "";
  const excerpt = q.length > 40 ? `${q.slice(0, 40)}…` : q;
  const decision =
    o.shot.kind === "image" ? `ẢNH ${o.shot.topicId} / ${o.shot.mediaId}` : o.topicId ? `KHÔNG ẢNH (chủ đề ${o.topicId})` : "KHÔNG ẢNH";
  const extra = [
    `${(o.ms / 1000).toFixed(2).replace(".", ",")} s`,
    o.source === "prefilter" ? "lọc sẵn" : o.source === "disabled" ? "đang tắt" : `${o.attempts} lần gọi`,
    o.keyIndex ? `khóa #${o.keyIndex}` : "",
    o.model ? `model ${o.model}` : "",
    o.error ? `lỗi: ${o.error}` : "",
  ].filter(Boolean);
  return `[dao-dien] ${characterId} · lượt ${turn} · "${excerpt}" → ${decision} · lý do: ${o.reason || "-"} · ${extra.join(" · ")}`;
}
