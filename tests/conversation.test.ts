import { describe, expect, it } from "vitest";
import { CHARACTERS, getCharacter } from "@/lib/characters";
import {
  buildContents,
  getOpeningTurn,
  getSystemPrompt,
  MAX_HISTORY_TURNS,
  OPENING_USER_TURN,
  validateChatBody,
} from "@/lib/server/conversation";
import { cleanModelText } from "@/lib/text";

describe("validateChatBody", () => {
  it("chấp nhận body hợp lệ cho Trần Hưng Đạo", () => {
    const r = validateChatBody({ characterId: "tran-hung-dao", messages: [{ role: "user", text: " Chào ngài " }] });
    expect(r).toEqual({ ok: true, characterId: "tran-hung-dao", messages: [{ role: "user", text: "Chào ngài" }] });
  });

  it("từ chối nhân vật không có (Phase 1 dùng ngo-quyen; từ Phase 2 cả 4 người đều đã mở)", () => {
    const r = validateChatBody({ characterId: "ly-thuong-kiet", messages: [{ role: "user", text: "Chào" }] });
    expect(r).toEqual({ ok: false, code: "CHARACTER_UNAVAILABLE" });
  });

  it("cả 4 nhân vật đều mở, mỗi người có lời chào, lượt mở màn và prompt riêng", () => {
    const ids = CHARACTERS.map((c) => c.id);
    expect(ids).toHaveLength(4);
    for (const id of ids) {
      expect(validateChatBody({ characterId: id, messages: [{ role: "user", text: "Chào" }] }).ok).toBe(true);
      expect(getCharacter(id)!.greeting).toBeTruthy();
    }
    expect(new Set(ids.map(getSystemPrompt)).size).toBe(4);
    expect(new Set(ids.map(getOpeningTurn)).size).toBe(4);
    expect(getSystemPrompt("quang-trung")).toContain('Luôn tự xưng "trẫm"');
    expect(getSystemPrompt("nguyen-trai")).toContain('Luôn gọi người đang trò chuyện là "hiền hữu"');
  });

  it("từ chối dữ liệu sai hoặc lượt cuối không phải của người dùng", () => {
    expect(validateChatBody(null).ok).toBe(false);
    expect(validateChatBody({ characterId: "tran-hung-dao", messages: [] }).ok).toBe(false);
    expect(validateChatBody({ characterId: "tran-hung-dao", messages: [{ role: "system", text: "x" }] }).ok).toBe(false);
    expect(
      validateChatBody({
        characterId: "tran-hung-dao",
        messages: [
          { role: "user", text: "a" },
          { role: "model", text: "b" },
        ],
      }).ok,
    ).toBe(false);
    expect(validateChatBody({ characterId: "tran-hung-dao", messages: [{ role: "user", text: "x".repeat(1001) }] }).ok).toBe(
      false,
    );
  });
});

describe("buildContents", () => {
  it("chèn lượt mở màn + lời chào trước lịch sử để AI nhớ mình đã chào", () => {
    const c = buildContents("tran-hung-dao", [{ role: "user", text: "Ngài là ai?" }]);
    expect(c.map((x) => x.role)).toEqual(["user", "model", "user"]);
    expect(c[0].parts[0].text).toBe(OPENING_USER_TURN);
    expect(c[1].parts[0].text).toBe(getCharacter("tran-hung-dao")!.greeting);
    expect(c[2].parts[0].text).toBe("Ngài là ai?");
  });

  it("giữ nguyên toàn bộ các lượt trước (để hiểu 'trận đó')", () => {
    const msgs = [
      { role: "user" as const, text: "Kể về trận Bạch Đằng 1288" },
      { role: "model" as const, text: "Năm Mậu Tý (1288)..." },
      { role: "user" as const, text: "Trận đó quân ta dùng kế gì?" },
    ];
    const c = buildContents("tran-hung-dao", msgs);
    expect(c.slice(2).map((x) => x.parts[0].text)).toEqual(msgs.map((m) => m.text));
  });

  it("gộp các lượt liền nhau cùng vai và cắt lịch sử quá dài", () => {
    const merged = buildContents("tran-hung-dao", [
      { role: "user", text: "a" },
      { role: "user", text: "b" },
    ]);
    expect(merged).toHaveLength(3);
    expect(merged[2].parts[0].text).toBe("a\n\nb");

    const long = Array.from({ length: MAX_HISTORY_TURNS + 11 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "model") as "user" | "model",
      text: `t${i}`,
    }));
    const c = buildContents("tran-hung-dao", long);
    expect(c.length).toBeLessThanOrEqual(MAX_HISTORY_TURNS + 2);
    expect(c[2].role).toBe("user");
    expect(c[c.length - 1].parts[0].text).toBe(`t${MAX_HISTORY_TURNS + 10}`);
  });
});

describe("cleanModelText", () => {
  it("bỏ ký hiệu Markdown nhưng giữ dấu tiếng Việt", () => {
    expect(cleanModelText("**Hịch tướng sĩ** được viết năm Giáp Thân")).toBe("Hịch tướng sĩ được viết năm Giáp Thân");
    expect(cleanModelText("## Trận Bạch Đằng\n- Cọc gỗ đầu bịt sắt")).toBe("Trận Bạch Đằng\nCọc gỗ đầu bịt sắt");
    expect(cleanModelText("Ta là *Trần Quốc Tuấn*.")).toBe("Ta là Trần Quốc Tuấn.");
  });
});
