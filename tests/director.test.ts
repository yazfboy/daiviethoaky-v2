import { describe, expect, it } from "vitest";
import type { ChatTurn } from "@/lib/chatProtocol";
import { isSmallTalk } from "@/lib/media/smallTalk";
import { buildDirectorPrompt, decideShot, formatDirectorLog, parseDecision, pickImage, type DirectorModelCall } from "@/lib/server/director";
import { topicsFor } from "@/lib/media/catalog";
import { KeyPool } from "@/lib/server/keyPool";

const ask = (text: string, history: ChatTurn[] = []): ChatTurn[] => [...history, { role: "user", text }];
const pool = (n = 3) => new KeyPool(Array.from({ length: n }, (_, i) => `k${i + 1}`));
const reply = (topic: string, reason = "lý do") => JSON.stringify({ reason, topic });
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe("lọc câu chào hỏi / cảm ơn", () => {
  it.each(["Chào ngài", "Đa tạ ngài", "Cảm ơn tiên sinh nhiều!", "Xin chào bệ hạ ạ", "Vâng", "ok", "Cảm ơn ngài đã kể", "Tạm biệt ngài nhé"])(
    "'%s' là câu xã giao",
    (t) => expect(isSmallTalk(t)).toBe(true),
  );
  it.each(["Chào ngài, kể cho tôi nghe trận Bạch Đằng", "Ngài kể trận Bạch Đằng đi", "Cảm ơn, còn bài Bình Ngô đại cáo thì sao?", "Ngài trông thế nào?", ""])(
    "'%s' không phải câu xã giao",
    (t) => expect(isSmallTalk(t)).toBe(false),
  );
});

describe("đọc quyết định của AI", () => {
  const allowed = new Set(["bach-dang-1288"]);
  it("nhận chủ đề trong danh sách và 'none'", () => {
    expect(parseDecision(reply("bach-dang-1288"), allowed)).toEqual({ topicId: "bach-dang-1288", reason: "lý do" });
    expect(parseDecision(reply("none"), allowed)).toEqual({ topicId: null, reason: "lý do" });
  });
  it("chủ đề ngoài danh sách hoặc JSON hỏng thì không nhận", () => {
    expect(parseDecision(reply("bach-dang-938"), allowed)).toBeNull();
    expect(parseDecision("{không phải json", allowed)).toBeNull();
    expect(parseDecision(JSON.stringify({ reason: "x" }), allowed)).toBeNull();
  });
});

describe("chọn ảnh", () => {
  it("bỏ ảnh đã hiện, hết ảnh thì trả null", () => {
    expect(pickImage("bach-dang-1288", new Set())).toBe("bd1288-coc-btls");
    expect(pickImage("bach-dang-1288", new Set(["bd1288-coc-btls"]))).toBe("bd1288-coc-btlsqs");
    expect(pickImage("co-loa", new Set(["co-loa-luy-thanh"]))).toBeNull();
  });
});

describe("prompt đạo diễn", () => {
  it("chỉ đưa chủ đề của đúng nhân vật, kèm câu hỏi mới nhất và năm hiện tại", () => {
    const p = buildDirectorPrompt("ngo-quyen", ask("Kể trận Bạch Đằng đi"), topicsFor("ngo-quyen"));
    expect(p).toContain("bach-dang-938");
    expect(p).not.toContain("bach-dang-1288");
    expect(p).toContain("năm 939");
    expect(p).toContain("CÂU HỎI MỚI NHẤT CỦA NGƯỜI DÙNG: Kể trận Bạch Đằng đi");
  });
});

describe("decideShot", () => {
  it("câu chào hỏi: không ảnh, không gọi AI", async () => {
    let calls = 0;
    const call: DirectorModelCall = async () => (calls++, reply("bach-dang-1288"));
    const o = await decideShot({ characterId: "tran-hung-dao", messages: ask("Chào ngài"), pool: pool(), call, enabled: true });
    expect(o.shot).toEqual({ kind: "none" });
    expect(o.source).toBe("prefilter");
    expect(calls).toBe(0);
  });

  it("đạo diễn tắt: không ảnh, không gọi AI", async () => {
    let calls = 0;
    const call: DirectorModelCall = async () => (calls++, reply("bach-dang-1288"));
    const o = await decideShot({ characterId: "tran-hung-dao", messages: ask("Kể trận Bạch Đằng"), pool: pool(), call, enabled: false });
    expect(o.shot.kind).toBe("none");
    expect(calls).toBe(0);
  });

  it("AI chọn chủ đề: trả ảnh đầu tiên chưa hiện của chủ đề đó", async () => {
    const call: DirectorModelCall = async (_k, req) => {
      expect(req.topicIds).toContain("bach-dang-1288");
      expect(req.topicIds).not.toContain("binh-ngo-dai-cao");
      return reply("bach-dang-1288");
    };
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng năm 1288"),
      shown: ["bd1288-coc-btls"],
      pool: pool(),
      call,
      enabled: true,
    });
    expect(o.shot).toEqual({ kind: "image", topicId: "bach-dang-1288", mediaId: "bd1288-coc-btlsqs" });
    expect(o.source).toBe("ai");
  });

  it("chủ đề đã hết ảnh mới: không thêm ảnh", async () => {
    const o = await decideShot({
      characterId: "ngo-quyen",
      messages: ask("Kinh đô của ngài ở đâu?"),
      shown: ["co-loa-luy-thanh"],
      pool: pool(),
      call: async () => reply("co-loa"),
      enabled: true,
    });
    expect(o.shot.kind).toBe("none");
    expect(o.topicId).toBe("co-loa");
  });

  it("AI trả chủ đề của nhân vật khác (ngoài danh sách): không ảnh", async () => {
    const o = await decideShot({
      characterId: "ngo-quyen",
      messages: ask("Kể trận Bạch Đằng"),
      pool: pool(),
      call: async () => reply("bach-dang-1288"),
      enabled: true,
    });
    expect(o.shot.kind).toBe("none");
    expect(o.source).toBe("error");
  });

  it("khóa hết hạn mức (429): đổi khóa, khóa lỗi bị cho nghỉ trong pool riêng", async () => {
    const p = pool();
    const used: number[] = [];
    const call: DirectorModelCall = async (k) => {
      used.push(k.index);
      if (used.length === 1) throw httpError(429);
      return reply("bach-dang-1288");
    };
    const o = await decideShot({ characterId: "tran-hung-dao", messages: ask("Kể trận Bạch Đằng 1288"), pool: p, call, enabled: true });
    expect(o.shot.kind).toBe("image");
    expect(used.length).toBe(2);
    expect(p.isResting({ index: used[0], value: `k${used[0]}` })).toBe(true);
  });

  it("mọi khóa lỗi: không ảnh, không ném lỗi", async () => {
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(),
      call: async () => {
        throw httpError(503);
      },
      enabled: true,
    });
    expect(o.shot.kind).toBe("none");
    expect(o.source).toBe("error");
    expect(o.attempts).toBe(3);
  });

  it("khóa đầu bị treo: sau thời gian trễ gọi thêm khóa kế, dùng kết quả về trước và hủy yêu cầu treo", async () => {
    let firstAborted = false;
    const call: DirectorModelCall = (k, req) =>
      new Promise((resolve) => {
        if (k.index === 1) {
          req.signal.addEventListener("abort", () => (firstAborted = true));
          return; // treo mãi
        }
        setTimeout(() => resolve(reply("bach-dang-1288")), 20);
      });
    const t0 = Date.now();
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(),
      call,
      enabled: true,
      hedgeDelayMs: 100,
    });
    expect(o.shot.kind).toBe("image");
    expect(o.keyIndex).toBe(2);
    expect(o.attempts).toBe(2);
    expect(Date.now() - t0).toBeLessThan(1_000);
    expect(firstAborted).toBe(true);
  });

  it("lần gọi thứ 2 dùng model dự phòng; model chính không tồn tại thì chuyển sang dự phòng", async () => {
    const models: string[] = [];
    const call: DirectorModelCall = async (_k, req) => {
      models.push(req.model);
      if (req.model === "chinh") throw httpError(404);
      return reply("bach-dang-1288");
    };
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(),
      call,
      enabled: true,
      model: "chinh",
      fallbackModel: "du-phong",
    });
    expect(models).toEqual(["chinh", "du-phong"]);
    expect(o.shot.kind).toBe("image");
    expect(o.model).toBe("du-phong");
  });

  it("không có dự phòng: mọi lần gọi dùng model chính, model lỗi yêu cầu thì dừng ngay", async () => {
    const models: string[] = [];
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(),
      call: async (_k, req) => {
        models.push(req.model);
        throw httpError(404);
      },
      enabled: true,
      model: "chinh",
      fallbackModel: null,
    });
    expect(models).toEqual(["chinh"]);
    expect(o.shot.kind).toBe("none");
  });

  it("khóa bị từ chối (403) không bị thử lại với model dự phòng", async () => {
    const used: string[] = [];
    const call: DirectorModelCall = async (k, req) => {
      used.push(`${k.index}:${req.model}`);
      if (k.index === 1) throw httpError(403);
      return reply("bach-dang-1288");
    };
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(2),
      call,
      enabled: true,
      model: "chinh",
      fallbackModel: "du-phong",
    });
    expect(o.shot.kind).toBe("image");
    expect(used.filter((u) => u.startsWith("1:"))).toEqual(["1:chinh"]);
    expect(used).toContain("2:du-phong");
  });

  it("AI quá chậm: hết giờ thì bỏ, không chờ mãi", async () => {
    const t0 = Date.now();
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Kể trận Bạch Đằng 1288"),
      pool: pool(),
      call: (_k, req) => new Promise((_, reject) => req.signal.addEventListener("abort", () => reject(new Error("aborted")))),
      enabled: true,
      attemptTimeoutMs: 50,
      overallTimeoutMs: 700,
    });
    expect(o.shot.kind).toBe("none");
    expect(Date.now() - t0).toBeLessThan(1_500);
  });

  it("log ghi nhân vật, lượt, quyết định, lý do; không ghi khóa", async () => {
    const o = await decideShot({
      characterId: "tran-hung-dao",
      messages: ask("Ngài kể cho tôi nghe trận Bạch Đằng năm 1288 với đầy đủ chi tiết nhé"),
      pool: new KeyPool(["BI_MAT_123"]),
      call: async () => reply("bach-dang-1288", "hỏi thẳng trận 1288"),
      enabled: true,
    });
    const line = formatDirectorLog("tran-hung-dao", ask("Ngài kể cho tôi nghe trận Bạch Đằng năm 1288 với đầy đủ chi tiết nhé"), o);
    expect(line).toMatch(/^\[dao-dien\] tran-hung-dao · lượt 1 · ".{40}…" → ẢNH bach-dang-1288 \/ bd1288-coc-btls · lý do: hỏi thẳng trận 1288/);
    expect(line).not.toContain("BI_MAT_123");
  });
});
