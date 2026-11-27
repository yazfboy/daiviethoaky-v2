import type { ChatTurn } from "@/lib/chatProtocol";

// Giao thức giữa trình duyệt và POST /api/director (AI Đạo diễn), dùng chung hai phía.
//
// Request:  { characterId, messages, shown? }
//   - characterId, messages: giống hệt body gửi /api/chat (lượt cuối là câu hỏi mới của người dùng).
//   - shown: mã các ảnh đã hiện trong cuộc trò chuyện này, để đạo diễn không lặp lại ảnh.
// Response: HTTP 200, JSON { shot, reason }. Đạo diễn lỗi / hết hạn mức / tắt thì vẫn 200 với shot "none":
//   minh họa không bao giờ được làm phiền cuộc trò chuyện.
//   HTTP 400 chỉ khi body sai.
//
// "Shot" là quyết định cảnh của một lượt. Phase 3 có "none" và "image"; Phase 4 thêm "video",
// Phase 5 thêm "painting" (tranh AI) mà không đổi cấu trúc.

export interface DirectorRequestBody {
  characterId: string;
  messages: ChatTurn[];
  shown?: string[];
}

export type Shot = { kind: "none" } | { kind: "image"; topicId: string; mediaId: string };

export interface DirectorResponse {
  shot: Shot;
  reason: string;
}

/** Giới hạn số mã ảnh "đã hiện" nhận từ trình duyệt. */
export const MAX_SHOWN_IDS = 200;
