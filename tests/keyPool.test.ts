import { describe, expect, it } from "vitest";
import { COOLDOWN_MS, KeyPool, parseKeys } from "@/lib/server/keyPool";

describe("parseKeys", () => {
  it("tách theo dấu phẩy / xuống dòng, bỏ trống và trùng", () => {
    expect(parseKeys(" a, b ,,c\nd;a ")).toEqual(["a", "b", "c", "d"]);
    expect(parseKeys(undefined)).toEqual([]);
    expect(parseKeys("")).toEqual([]);
  });
});

describe("KeyPool", () => {
  it("xoay vòng điểm bắt đầu mỗi lượt", () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);
    expect(pool.candidates().map((k) => k.index)).toEqual([1, 2, 3]);
    expect(pool.candidates().map((k) => k.index)).toEqual([2, 3, 1]);
    expect(pool.candidates().map((k) => k.index)).toEqual([3, 1, 2]);
    expect(pool.candidates().map((k) => k.index)).toEqual([1, 2, 3]);
  });

  it("đẩy khóa đang nghỉ xuống cuối và cho dùng lại sau khi hết thời gian nghỉ", () => {
    let t = 1_000;
    const pool = new KeyPool(["k1", "k2", "k3"], () => t);
    const [k1] = pool.candidates(); // con trỏ -> 2
    pool.markFailure(k1, "quota");
    pool.candidates(); // con trỏ -> 3
    pool.candidates(); // con trỏ -> 1
    expect(pool.candidates().map((k) => k.index)).toEqual([2, 3, 1]);
    t += COOLDOWN_MS.quota + 1;
    expect(pool.isResting(k1)).toBe(false);
    expect(pool.candidates().map((k) => k.index)).toEqual([2, 3, 1]);
  });

  it("vẫn trả đủ khóa khi tất cả đang nghỉ (nghỉ sớm hết xếp trước)", () => {
    const t = 0;
    const pool = new KeyPool(["k1", "k2"], () => t);
    const [k1, k2] = pool.candidates();
    pool.markFailure(k1, "auth");
    pool.markFailure(k2, "quota");
    expect(pool.candidates().map((k) => k.index)).toEqual([2, 1]);
  });

  it("pool rỗng trả về danh sách rỗng", () => {
    expect(new KeyPool([]).candidates()).toEqual([]);
  });
});
