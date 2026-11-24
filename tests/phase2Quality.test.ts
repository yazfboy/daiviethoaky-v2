import { afterEach, describe, expect, it } from "vitest";
import { canChi, overallVerdict, summarize, type CaseResult } from "../eval/harness";
import type { EvalCase } from "../eval/cases";
import { DEFAULT_TEMPERATURE, getTemperature } from "@/lib/server/gemini";
import { cleanModelText } from "@/lib/text";

describe("cleanModelText lọc chữ Hán lọt vào (Bug #9)", () => {
  it("bỏ ký tự Hán, giữ nguyên dấu tiếng Việt", () => {
    expect(cleanModelText("trước lúc lâm终, há chẳng đáng bàn")).toBe("trước lúc lâm, há chẳng đáng bàn");
    expect(cleanModelText("Hưng Đạo Vương 興道王 Trần Quốc Tuấn")).toBe("Hưng Đạo Vương  Trần Quốc Tuấn");
    expect(cleanModelText("Mậu Tý (1288), Đông Bộ Đầu, Ức Trai")).toBe("Mậu Tý (1288), Đông Bộ Đầu, Ức Trai");
  });
});

describe("cleanModelText tự sửa can chi lệch năm và chữ số tiếng Anh lọt vào", () => {
  it("sửa can chi theo năm dương lịch đi kèm, giữ nguyên chỗ đúng", () => {
    expect(cleanModelText("chiến địa năm Mậu Tý (1258) trong lần thứ nhất")).toBe("chiến địa năm Mậu Ngọ (1258) trong lần thứ nhất");
    expect(cleanModelText("năm Đinh Tỵ (1258)")).toBe("năm Mậu Ngọ (1258)");
    expect(cleanModelText("trận Bạch Đằng năm Mậu Tý (1288)")).toBe("trận Bạch Đằng năm Mậu Tý (1288)");
    expect(cleanModelText("năm Đinh Hợi - Mậu Tý (1287 - 1288)")).toBe("năm Đinh Hợi - Mậu Tý (1287 - 1288)");
    expect(cleanModelText("cuối năm Đinh Tỵ, tức đầu năm 1258")).toBe("cuối năm Đinh Tỵ, tức đầu năm 1258");
  });

  it("đổi chữ số tiếng Anh về tiếng Việt, không đụng chữ Việt", () => {
    expect(cleanModelText("trưa mồng five Tết vào thành")).toBe("trưa mồng năm Tết vào thành");
    expect(cleanModelText("Mồng Seven Tết")).toBe("Mồng bảy Tết");
    expect(cleanModelText("tên người, tôn ti, nên")).toBe("tên người, tôn ti, nên");
    // Bug #12: "ten" là từ tiếng Việt (gỉ đồng), không phải số mười.
    expect(cleanModelText("gươm giáo đóng ten rỉ")).toBe("gươm giáo đóng ten rỉ");
    expect(cleanModelText("ngày ten tháng chạp")).toBe("ngày mười tháng chạp");
    expect(cleanModelText("five người lính")).toBe("five người lính");
  });
});

describe("canChi", () => {
  it("tính đúng can chi các mốc trong hồ sơ", () => {
    expect(canChi(938)).toBe("Mậu Tuất");
    expect(canChi(939)).toBe("Kỷ Hợi");
    expect(canChi(1258)).toBe("Mậu Ngọ");
    expect(canChi(1282)).toBe("Nhâm Ngọ");
    expect(canChi(1284)).toBe("Giáp Thân");
    expect(canChi(1288)).toBe("Mậu Tý");
    expect(canChi(1300)).toBe("Canh Tý");
    expect(canChi(1427)).toBe("Đinh Mùi");
    expect(canChi(1428)).toBe("Mậu Thân");
    expect(canChi(1439)).toBe("Kỷ Mùi");
    expect(canChi(1789)).toBe("Kỷ Dậu");
    expect(canChi(1791)).toBe("Tân Hợi");
  });
});

describe("overallVerdict tách lỗi hạ tầng khỏi lỗi nhập vai", () => {
  const mk = (id: string, group: EvalCase["group"], state: "pass" | "fail" | "infra"): CaseResult => ({
    c: { id, character: "ngo-quyen", group, question: "?", mustHave: [], mustNot: [] },
    answer: "",
    ttftMs: 1000,
    attempts: 1,
    ruleIssues: [],
    judge: null,
    pass: state === "pass",
    ...(state === "infra" ? { error: "Giám khảo lỗi: 429", infra: true } : {}),
  });
  const base = Array.from({ length: 9 }, (_, i) => mk(`nq-${i}`, "later", "pass"));

  it("ĐẠT khi mọi câu cốt lõi đạt và tỉ lệ ≥ 90%", () => {
    expect(overallVerdict(summarize([...base, mk("core", "core", "pass")]))).toBe("ĐẠT");
  });
  it("CHƯA ĐẠT khi một câu cốt lõi trượt vì lời đáp", () => {
    expect(overallVerdict(summarize([...base, mk("core", "core", "fail")]))).toBe("CHƯA ĐẠT");
  });
  it("KHÔNG KẾT LUẬN ĐƯỢC khi chỉ trượt vì lỗi hạ tầng", () => {
    expect(overallVerdict(summarize([...base, mk("core", "core", "infra")]))).toBe("KHÔNG KẾT LUẬN ĐƯỢC");
  });
});

describe("getTemperature", () => {
  const saved = process.env.GEMINI_TEMPERATURE;
  afterEach(() => {
    if (saved === undefined) delete process.env.GEMINI_TEMPERATURE;
    else process.env.GEMINI_TEMPERATURE = saved;
  });

  it("mặc định 0.5, đọc được biến môi trường hợp lệ, bỏ qua giá trị sai", () => {
    delete process.env.GEMINI_TEMPERATURE;
    expect(getTemperature()).toBe(DEFAULT_TEMPERATURE);
    expect(DEFAULT_TEMPERATURE).toBe(0.5);
    process.env.GEMINI_TEMPERATURE = "0.3";
    expect(getTemperature()).toBe(0.3);
    process.env.GEMINI_TEMPERATURE = "abc";
    expect(getTemperature()).toBe(DEFAULT_TEMPERATURE);
    process.env.GEMINI_TEMPERATURE = "5";
    expect(getTemperature()).toBe(DEFAULT_TEMPERATURE);
  });
});
