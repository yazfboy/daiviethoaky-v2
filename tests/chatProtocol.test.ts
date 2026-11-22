import { describe, expect, it } from "vitest";
import { errorMessage } from "@/lib/chatProtocol";

describe("errorMessage", () => {
  it("dùng đúng danh xưng nhân vật đang mở (không gọi cứng 'tướng quân')", () => {
    expect(errorMessage("INTERRUPTED", "Hoàng đế Quang Trung")).toBe(
      "Kết nối bị ngắt khi Hoàng đế Quang Trung đang trả lời. Hãy gửi lại.",
    );
    expect(errorMessage("EMPTY", "Ức Trai")).toBe("Ức Trai chưa đáp được câu này. Hãy gửi lại hoặc hỏi theo cách khác.");
    for (const code of ["INTERRUPTED", "EMPTY"]) {
      expect(errorMessage(code, "Ngô Vương")).not.toMatch(/tướng quân|\{speaker\}/i);
    }
  });

  it("không có danh xưng thì dùng cách gọi trung tính", () => {
    expect(errorMessage("INTERRUPTED")).toBe("Kết nối bị ngắt khi nhân vật đang trả lời. Hãy gửi lại.");
    expect(errorMessage("EMPTY")).toMatch(/^Nhân vật chưa đáp/);
  });

  it("mã lạ thì trả thông báo lỗi chung", () => {
    expect(errorMessage("KHONG_CO")).toBe(errorMessage("UPSTREAM_ERROR"));
  });
});
