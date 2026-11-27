import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadHistory, saveHistory } from "@/lib/client/chatStorage";

// localStorage giả cho môi trường node.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const g = globalThis as unknown as { window?: { localStorage: MemoryStorage } };

describe("lưu lịch sử kèm minh họa", () => {
  beforeEach(() => {
    g.window = { localStorage: new MemoryStorage() };
  });
  afterEach(() => {
    delete g.window;
  });

  it("lịch sử lưu từ trước Phase 3 (không có media) vẫn mở lại được", () => {
    const old = {
      messages: [
        { id: "1", role: "user", text: "Kể trận Bạch Đằng" },
        { id: "2", role: "model", text: "Năm Mậu Tý..." },
      ],
      savedAt: 1,
    };
    g.window!.localStorage.setItem("dvhk:chat:v1:tran-hung-dao", JSON.stringify(old));
    expect(loadHistory("tran-hung-dao")).toEqual(old.messages);
  });

  it("lưu và đọc lại minh họa của từng lượt, tách riêng theo nhân vật", () => {
    saveHistory("tran-hung-dao", [
      { id: "1", role: "user", text: "Kể trận Bạch Đằng" },
      { id: "2", role: "model", text: "...", media: [{ kind: "image", id: "bd1288-coc-btls" }] },
    ]);
    saveHistory("ngo-quyen", [{ id: "a", role: "user", text: "Chào ngài" }]);
    expect(loadHistory("tran-hung-dao")[1].media).toEqual([{ kind: "image", id: "bd1288-coc-btls" }]);
    expect(loadHistory("ngo-quyen").some((m) => m.media)).toBe(false);
  });

  it("dữ liệu minh họa lạ thì bỏ phần minh họa, giữ lời thoại", () => {
    g.window!.localStorage.setItem(
      "dvhk:chat:v1:quang-trung",
      JSON.stringify({
        messages: [
          { id: "1", role: "user", text: "Hỏi", media: [{ kind: "image", id: "x" }] },
          { id: "2", role: "model", text: "Đáp", media: [{ kind: "video", id: 3 }, "rác"] },
          { id: "3", role: "model", text: "Đáp 2", media: "rác" },
        ],
      }),
    );
    expect(loadHistory("quang-trung")).toEqual([
      { id: "1", role: "user", text: "Hỏi" },
      { id: "2", role: "model", text: "Đáp" },
      { id: "3", role: "model", text: "Đáp 2" },
    ]);
  });
});
