import { describe, expect, it } from "vitest";
import { createPacer } from "@/lib/client/pacer";

describe("createPacer", () => {
  it("nhả dần qua nhiều nhịp, đủ và đúng thứ tự, giữ nguyên dấu tiếng Việt", async () => {
    const pieces: string[] = [];
    const p = createPacer((s) => pieces.push(s));
    const text = "Ta là Trần Quốc Tuấn, người đời gọi là Hưng Đạo Vương. ".repeat(10);
    p.push(text);
    await p.drain();
    expect(pieces.join("")).toBe(text.normalize("NFC"));
    expect(pieces.length).toBeGreaterThan(10);
  });

  it("flush nhả hết ngay, cancel bỏ phần còn lại", async () => {
    const a: string[] = [];
    const p1 = createPacer((s) => a.push(s));
    p1.push("abcdefghijklmnopqrstuvwxyz");
    p1.flush();
    expect(a.join("")).toBe("abcdefghijklmnopqrstuvwxyz");

    const b: string[] = [];
    const p2 = createPacer((s) => b.push(s));
    p2.push("abcdefghijklmnopqrstuvwxyz");
    p2.cancel();
    await p2.drain();
    expect(b.join("")).toBe("");
  });
});
