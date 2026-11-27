import type { CharacterId } from "@/lib/characters";

// Kiểu dữ liệu của kho minh họa (dùng chung trình duyệt và server, không có bí mật).
// Phase 3 chỉ có ảnh tư liệu; Phase 4 sẽ thêm "video", Phase 5 thêm "painting" (tranh AI) vào MediaRef.

/**
 * Loại ảnh. Mỗi loại có một nhãn bắt buộc hiện trước chú thích, để người xem không nhầm
 * ảnh chụp ngày nay, tượng hay tranh đời sau với tư liệu đương thời.
 */
export type MediaNature =
  | "anh-ngay-nay" // ảnh chụp di tích, phong cảnh ngày nay
  | "hien-vat" // ảnh chụp ngày nay một hiện vật của thời ấy
  | "anh-xua" // ảnh chụp cũ, có năm chụp (takenYear)
  | "tranh-doi-sau" // tranh vẽ cảnh, do người đời sau vẽ
  | "chan-dung-doi-sau" // tranh chân dung do người đời sau vẽ
  | "tuong-doi-sau" // ảnh chụp ngày nay một pho tượng dựng đời sau
  | "mo-hinh" // mô hình, cảnh dựng lại ngày nay
  | "so-do" // sơ đồ, bản đồ vẽ ngày nay
  | "ban-in-doi-sau" // trang sách in / chép đời sau
  | "ban-phuc-che"; // bản phục chế của một hiện vật

/** Giấy phép được nhận (xem danh sách nguồn được phép trong STATUS.md). */
export type LicenseId = "PD" | "CC0" | "CC BY 3.0" | "CC BY 4.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";

export interface ImageMedia {
  /** Mã ổn định, lưu trong lịch sử trò chuyện. Không đổi mã khi đã phát hành. */
  id: string;
  kind: "image";
  /** Chủ đề duy nhất mà ảnh thuộc về (một ảnh không dùng cho hai sự kiện). */
  topic: string;
  nature: MediaNature;
  /** Năm chụp, bắt buộc với nature "anh-xua". */
  takenYear?: number;
  /** Chú thích tiếng Việt viết tay: ảnh là gì, ở đâu, gắn với sự kiện nào. */
  caption: string;
  /** Người tạo ảnh (không phải người tải lên). */
  author: string;
  license: LicenseId;
  /** Trang mô tả file trên Wikimedia Commons. */
  sourcePage: string;
  /** URL file gốc trên upload.wikimedia.org (không kèm tham số). */
  original: string;
  width: number;
  height: number;
}

export interface Topic {
  id: string;
  /** Năm diễn ra (hoặc mốc chính) của chủ đề: chỉ nhân vật sống từ năm này trở đi mới được dùng. */
  year: number;
  /** Nhân vật được phép minh họa chủ đề này. */
  characters: CharacterId[];
  /** Mô tả ngắn cho AI Đạo diễn (không hiện ra giao diện). */
  title: string;
  /** Khi nào chọn chủ đề này (gợi ý cho AI Đạo diễn). */
  when: string;
}

/** Tham chiếu một minh họa trong lịch sử trò chuyện. */
export type MediaRef = { kind: "image"; id: string };
