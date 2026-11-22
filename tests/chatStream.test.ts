import { describe, expect, it } from "vitest";
import { ChatStreamError, classifyError, startChatStream, type StreamFactory } from "@/lib/server/chatStream";
import { KeyPool } from "@/lib/server/keyPool";

const contents = [{ role: "user" as const, parts: [{ text: "Chào" }] }];

function apiError(status: number, message = "err") {
  return Object.assign(new Error(message), { status });
}

async function* chunks(parts: string[], failAfter?: number) {
  for (let i = 0; i < parts.length; i++) {
    if (failAfter !== undefined && i === failAfter) throw new TypeError("fetch failed");
    yield parts[i];
  }
}

async function collect(gen: AsyncGenerator<string>) {
  const out: string[] = [];
  for await (const s of gen) out.push(s);
  return out;
}

function start(pool: KeyPool, factory: StreamFactory, extra: Partial<Parameters<typeof startChatStream>[0]> = {}) {
  return startChatStream({
    pool,
    factory,
    model: "m",
    systemInstruction: "s",
    contents,
    signal: new AbortController().signal,
    ...extra,
  });
}

describe("classifyError", () => {
  it("phân loại lỗi HTTP và mạng", () => {
    expect(classifyError(apiError(429))).toBe("quota");
    expect(classifyError(apiError(403))).toBe("auth");
    expect(classifyError(apiError(400, "API key not valid. Please pass a valid API key."))).toBe("auth");
    expect(classifyError(apiError(503))).toBe("overloaded");
    expect(classifyError(apiError(404))).toBe("fatal");
    expect(classifyError(new TypeError("fetch failed"))).toBe("network");
  });
});

describe("startChatStream (key pool)", () => {
  it("khóa 1 hết quota thì tự chuyển sang khóa 2", async () => {
    const used: number[] = [];
    const pool = new KeyPool(["k1", "k2", "k3"]);
    const factory: StreamFactory = async (key) => {
      used.push(key.index);
      if (key.index === 1) throw apiError(429);
      return chunks(["Ta là ", "Hưng Đạo Vương."]);
    };
    const s = await start(pool, factory);
    expect(used).toEqual([1, 2]);
    expect(s.keyIndex).toBe(2);
    expect(s.firstText + (await collect(s.rest)).join("")).toBe("Ta là Hưng Đạo Vương.");
    // Khóa 1 đang nghỉ nên lượt sau bắt đầu ở khóa 2, khóa 1 bị xếp cuối.
    expect(pool.candidates().map((k) => k.index)).toEqual([2, 3, 1]);
  });

  it("mọi khóa đều sai => AUTH", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    await expect(start(pool, async () => { throw apiError(403); })).rejects.toMatchObject({ code: "AUTH" });
  });

  it("mọi khóa hết quota => QUOTA", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    await expect(start(pool, async () => { throw apiError(429); })).rejects.toMatchObject({ code: "QUOTA" });
  });

  it("server mất mạng => UPSTREAM_UNREACHABLE", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    await expect(start(pool, async () => { throw new TypeError("fetch failed"); })).rejects.toMatchObject({
      code: "UPSTREAM_UNREACHABLE",
    });
  });

  it("không có khóa => NOT_CONFIGURED", async () => {
    await expect(start(new KeyPool([]), async () => chunks(["x"]))).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("khóa treo quá lâu thì bỏ qua và dùng khóa kế tiếp", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    const factory: StreamFactory = async (key) => {
      if (key.index === 1) return (async function* () { await new Promise(() => {}); yield ""; })();
      return chunks(["Xong"]);
    };
    const s = await start(pool, factory, { firstTokenTimeoutMs: 50 });
    expect(s.keyIndex).toBe(2);
    expect(s.firstText).toBe("Xong");
  });

  it("khóa đầu chậm thì gọi song song khóa kế tiếp, khóa nào ra chữ trước thắng, khóa kia bị hủy", async () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);
    let k1Aborted = false;
    const factory: StreamFactory = async (key, req) => {
      if (key.index === 1) {
        req.signal.addEventListener("abort", () => (k1Aborted = true));
        return (async function* () {
          await new Promise((r) => setTimeout(r, 300));
          yield "chậm";
        })();
      }
      return chunks(["nhanh"]);
    };
    const t0 = Date.now();
    const s = await start(pool, factory, { hedgeDelayMs: 30 });
    expect(s.keyIndex).toBe(2);
    expect(s.firstText).toBe("nhanh");
    expect(Date.now() - t0).toBeLessThan(250);
    expect(k1Aborted).toBe(true);
  });

  it("quá tổng thời gian chờ => TIMEOUT", async () => {
    const pool = new KeyPool(["k1", "k2"]);
    const hang: StreamFactory = async () => (async function* () { await new Promise(() => {}); yield ""; })();
    await expect(start(pool, hang, { hedgeDelayMs: 10, overallTimeoutMs: 80 })).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  it("đứt giữa chừng => INTERRUPTED, không đổi khóa (tránh lặp chữ)", async () => {
    let calls = 0;
    const pool = new KeyPool(["k1", "k2"]);
    const s = await start(pool, async () => {
      calls++;
      return chunks(["a", "b", "c"], 2);
    });
    await expect(collect(s.rest)).rejects.toBeInstanceOf(ChatStreamError);
    expect(calls).toBe(1);
  });

  it("luồng rỗng => EMPTY", async () => {
    const pool = new KeyPool(["k1"]);
    await expect(start(pool, async () => chunks([]))).rejects.toMatchObject({ code: "EMPTY" });
  });
});
