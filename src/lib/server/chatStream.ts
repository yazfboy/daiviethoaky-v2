import "server-only";

import type { ChatErrorCode } from "@/lib/chatProtocol";
import type { GeminiContent } from "@/lib/server/conversation";
import type { KeyPool, PoolKey } from "@/lib/server/keyPool";

// Mở luồng trả lời của AI với key pool + "gửi song song có trễ" (hedged request):
// - Gọi khóa đầu tiên. Nếu sau hedgeDelayMs vẫn chưa có chữ, gọi thêm khóa kế tiếp song song
//   (tối đa maxParallel yêu cầu cùng lúc). Khóa nào ra chữ ĐẦU TIÊN trước thì dùng, hủy các yêu cầu còn lại.
// - Khóa lỗi (hết quota / bị từ chối / quá tải / quá chậm) bị cho nghỉ và thay ngay bằng khóa kế tiếp.
// - Đã có chữ đầu rồi thì không đổi khóa nữa (tránh lặp chữ); lỗi giữa chừng => INTERRUPTED.

export interface StreamRequest {
  model: string;
  systemInstruction: string;
  contents: GeminiContent[];
  signal: AbortSignal;
}

/** Tạo luồng chữ từ một khóa cụ thể. Tách riêng để test được mà không gọi mạng. */
export type StreamFactory = (key: PoolKey, req: StreamRequest) => Promise<AsyncIterable<string>>;

export class ChatStreamError extends Error {
  constructor(public readonly code: ChatErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ChatStreamError";
  }
}

class TimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "TimeoutError";
  }
}

export type FailureKind = "quota" | "auth" | "overloaded" | "timeout" | "network" | "fatal";

/** Phân loại lỗi từ SDK Gemini / mạng. */
export function classifyError(err: unknown): FailureKind {
  if (err instanceof TimeoutError) return "timeout";
  const e = err as { status?: unknown; message?: unknown; name?: unknown };
  const status = typeof e?.status === "number" ? e.status : undefined;
  const message = typeof e?.message === "string" ? e.message : "";
  if (status !== undefined) {
    if (status === 429) return "quota";
    if (status === 401 || status === 403) return "auth";
    if (status === 400 && /api[ _-]?key|API_KEY_INVALID|permission/i.test(message)) return "auth";
    if (status >= 500) return "overloaded";
    return "fatal";
  }
  if (/RESOURCE_EXHAUSTED|quota/i.test(message)) return "quota";
  if (/API_KEY_INVALID|api key not valid/i.test(message)) return "auth";
  // Lỗi tầng mạng của fetch (Node: TypeError "fetch failed" kèm cause ENOTFOUND / ECONNRESET ...)
  if (e?.name === "TypeError" || /fetch failed|ENOTFOUND|ECONN|EAI_AGAIN|ETIMEDOUT|socket|network/i.test(message)) {
    return "network";
  }
  return "fatal";
}

function finalCode(failures: FailureKind[]): ChatErrorCode {
  if (failures.length === 0) return "UPSTREAM_ERROR";
  const all = (k: FailureKind) => failures.every((f) => f === k);
  const any = (k: FailureKind) => failures.includes(k);
  if (all("network")) return "UPSTREAM_UNREACHABLE";
  if (all("auth")) return "AUTH";
  if (any("quota")) return "QUOTA";
  if (any("timeout")) return "TIMEOUT";
  if (any("network")) return "UPSTREAM_UNREACHABLE";
  if (any("auth")) return "AUTH";
  return "UPSTREAM_ERROR";
}

function raceTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new TimeoutError());
    }, Math.max(0, ms));
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Hẹn giờ có thể hủy, dùng trong Promise.race. */
function timer<T>(ms: number, value: T): { promise: Promise<T>; cancel: () => void } {
  let id: ReturnType<typeof setTimeout>;
  const promise = new Promise<T>((resolve) => {
    id = setTimeout(() => resolve(value), Math.max(0, ms));
  });
  return { promise, cancel: () => clearTimeout(id) };
}

export interface StartOptions {
  pool: KeyPool;
  factory: StreamFactory;
  model: string;
  systemInstruction: string;
  contents: GeminiContent[];
  /** Hủy khi trình duyệt ngắt kết nối. */
  signal: AbortSignal;
  /** Chờ bao lâu chưa có chữ thì gọi thêm khóa kế tiếp song song. */
  hedgeDelayMs?: number;
  /** Số yêu cầu tối đa chạy song song. */
  maxParallel?: number;
  /** Thời gian tối đa chờ chữ đầu với MỖI khóa. */
  firstTokenTimeoutMs?: number;
  /** Tổng thời gian tối đa chờ chữ đầu cho cả lượt. */
  overallTimeoutMs?: number;
  /** Thời gian tối đa giữa hai đoạn chữ khi đang stream. */
  idleTimeoutMs?: number;
  log?: (msg: string) => void;
}

export interface StartedStream {
  firstText: string;
  keyIndex: number;
  /** Phần chữ còn lại. Ném ChatStreamError("INTERRUPTED") nếu đứt giữa chừng. */
  rest: AsyncGenerator<string, void, undefined>;
}

interface Attempt {
  key: PoolKey;
  ac: AbortController;
  detach: () => void;
}

type AttemptOutcome =
  | { attempt: Attempt; ok: true; firstText: string; it: AsyncIterator<string> }
  | { attempt: Attempt; ok: "empty" }
  | { attempt: Attempt; ok: false; err: unknown };

export async function startChatStream(opts: StartOptions): Promise<StartedStream> {
  const {
    pool,
    factory,
    signal,
    hedgeDelayMs = 2_000,
    maxParallel = 3,
    firstTokenTimeoutMs = 12_000,
    overallTimeoutMs = 25_000,
    idleTimeoutMs = 20_000,
    log = () => {},
  } = opts;

  const queue = pool.candidates();
  if (queue.length === 0) throw new ChatStreamError("NOT_CONFIGURED");

  const active = new Map<Attempt, Promise<AttemptOutcome>>();
  const failures: FailureKind[] = [];

  /** Chạy một khóa cho tới khi có chữ đầu tiên. */
  async function firstChunk(attempt: Attempt): Promise<AttemptOutcome> {
    const { key, ac } = attempt;
    const deadline = Date.now() + firstTokenTimeoutMs;
    const remaining = () => deadline - Date.now();
    try {
      const iterable = await raceTimeout(
        factory(key, {
          model: opts.model,
          systemInstruction: opts.systemInstruction,
          contents: opts.contents,
          signal: ac.signal,
        }),
        remaining(),
        () => ac.abort(),
      );
      const it = iterable[Symbol.asyncIterator]();
      while (true) {
        const r = await raceTimeout(it.next(), remaining(), () => ac.abort());
        if (r.done) return { attempt, ok: "empty" };
        if (r.value) return { attempt, ok: true, firstText: r.value, it };
      }
    } catch (err) {
      return { attempt, ok: false, err };
    }
  }

  const launch = (): boolean => {
    const key = queue.shift();
    if (!key) return false;
    const ac = new AbortController();
    const onOuterAbort = () => ac.abort();
    signal.addEventListener("abort", onOuterAbort, { once: true });
    const attempt: Attempt = { key, ac, detach: () => signal.removeEventListener("abort", onOuterAbort) };
    active.set(attempt, firstChunk(attempt));
    if (active.size > 1) log(`khóa #${key.index}: gọi song song (chưa có chữ)`);
    return true;
  };

  const stopAll = (except?: Attempt) => {
    for (const a of active.keys()) {
      if (a === except) continue;
      a.ac.abort();
      a.detach();
    }
    active.clear();
  };

  const overall = timer(overallTimeoutMs, "deadline" as const);
  launch();

  try {
    while (active.size > 0) {
      if (signal.aborted) throw new ChatStreamError("INTERRUPTED", "client aborted");

      const canHedge = queue.length > 0 && active.size < maxParallel;
      const hedge = canHedge ? timer(hedgeDelayMs, "hedge" as const) : null;
      const winner = await Promise.race([
        ...active.values(),
        overall.promise,
        ...(hedge ? [hedge.promise] : []),
      ]);
      hedge?.cancel();

      if (winner === "hedge") {
        launch();
        continue;
      }
      if (winner === "deadline") {
        failures.push("timeout");
        log("quá tổng thời gian chờ chữ đầu");
        break;
      }

      const { attempt } = winner;
      active.delete(attempt);

      if (winner.ok === true) {
        pool.markSuccess(attempt.key);
        stopAll(attempt);
        log(`khóa #${attempt.key.index}: bắt đầu stream`);
        return { firstText: winner.firstText, keyIndex: attempt.key.index, rest: restOf(attempt, winner.it) };
      }

      attempt.detach();
      if (winner.ok === "empty") {
        // Luồng kết thúc mà không có chữ (vd bị bộ lọc an toàn chặn). Đổi khóa cũng không giúp gì.
        pool.markSuccess(attempt.key);
        throw new ChatStreamError("EMPTY");
      }

      if (signal.aborted) throw new ChatStreamError("INTERRUPTED", "client aborted");
      const kind = classifyError(winner.err);
      failures.push(kind);
      const status = (winner.err as { status?: number })?.status;
      log(`khóa #${attempt.key.index}: lỗi ${kind}${status ? ` (HTTP ${status})` : ""}`);

      if (kind === "fatal") {
        throw new ChatStreamError("UPSTREAM_ERROR", String((winner.err as Error)?.message ?? winner.err));
      }
      if (kind === "quota" || kind === "auth" || kind === "overloaded") pool.markFailure(attempt.key, kind);
      if (kind === "timeout") pool.markFailure(attempt.key, "overloaded");
      // Thay ngay khóa lỗi bằng khóa kế tiếp.
      if (active.size < maxParallel) launch();
    }
  } catch (err) {
    stopAll();
    throw err;
  } finally {
    overall.cancel();
  }

  stopAll();
  throw new ChatStreamError(finalCode(failures));

  async function* restOf(attempt: Attempt, it: AsyncIterator<string>): AsyncGenerator<string, void, undefined> {
    let finished = false;
    try {
      while (true) {
        let r: IteratorResult<string>;
        try {
          r = await raceTimeout(it.next(), idleTimeoutMs, () => attempt.ac.abort());
        } catch (err) {
          log(`khóa #${attempt.key.index}: đứt giữa chừng (${classifyError(err)})`);
          throw new ChatStreamError("INTERRUPTED");
        }
        if (r.done) {
          finished = true;
          return;
        }
        if (r.value) yield r.value;
      }
    } finally {
      attempt.detach();
      if (!finished) attempt.ac.abort();
    }
  }
}
